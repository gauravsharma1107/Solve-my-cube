import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { 
  RotateCcw, Eye, EyeOff, CheckCircle2, AlertTriangle, 
  ArrowRight, Video, RotateCw
} from 'lucide-react';
import type { CubeState, Face, SolutionStep } from '../solver/cubeTypes';
import { CUBE_COLORS, FACE_NAMES } from '../solver/cubeTypes';
import { soundManager } from '../utils/soundEffects';

export interface Cube3DViewerRef {
  animateMove: (move: string, optionsOrSpeed?: number | { duration?: number }) => Promise<void>;
  resetCamera: () => void;
  focusFace: (face: Face) => void;
  autoFrameFace?: (face: Face) => boolean;
}

interface Cube3DViewerProps {
  cubeState: CubeState;
  activeMove?: string | null;
  activeStep?: SolutionStep | null;
  nextStep?: SolutionStep | null;
  currentStepIndex?: number;
  totalSteps?: number;
  isSolved?: boolean;
  animationSpeed?: number;
  showArrows?: boolean;
  onAnimationEnd?: () => void;
  interactivePainting?: boolean;
  onStickerClick?: (face: Face, index: number) => void;
}

const PLASTIC_COLOR = 0x111111;

// Helper: 2D rounded rectangle shape for authentic speedcube vinyl stickers
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

// 6 Face Outward Unit Normals in 3D World Space
export const FACE_NORMALS: Record<Face, THREE.Vector3> = {
  U: new THREE.Vector3(0, 1, 0),
  D: new THREE.Vector3(0, -1, 0),
  F: new THREE.Vector3(0, 0, 1),
  B: new THREE.Vector3(0, 0, -1),
  L: new THREE.Vector3(-1, 0, 0),
  R: new THREE.Vector3(1, 0, 0),
};

// Optimal 3/4 Vantage Points for Auto-Framing (Pillar 1)
// Balanced vantage perspectives positioning the active face front-and-center (dot > 0.65)
// while maintaining 3D depth by viewing 2 adjacent faces
export const OPTIMAL_VANTAGE_POINTS: Record<Face, THREE.Vector3> = {
  U: new THREE.Vector3(3.5, 6.8, 3.5),
  D: new THREE.Vector3(3.5, -6.8, 3.5),
  F: new THREE.Vector3(3.5, 3.5, 6.8),
  B: new THREE.Vector3(3.5, 3.5, -6.8),
  R: new THREE.Vector3(6.8, 3.5, 3.5),
  L: new THREE.Vector3(-6.8, 3.5, 3.5),
};

// Tri-Pillar Dual-Pass Depth Configuration (Pillars 2 & 3)
export const DUAL_PASS_CONFIG = {
  pass1: {
    depthFunc: THREE.GreaterDepth,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    renderOrder: 998,
  },
  pass2: {
    depthFunc: THREE.LessEqualDepth,
    transparent: false,
    opacity: 1.0,
    depthWrite: false,
    renderOrder: 999,
  },
};

// Compute dot product between face normal and vector from origin to camera
export function computeFaceCameraDot(face: Face, cameraPosition: THREE.Vector3): number {
  const normal = FACE_NORMALS[face];
  if (!normal) return 0;
  const camDir = cameraPosition.clone().normalize();
  return normal.dot(camDir);
}

// Determines if active face normal has low or negative dot product with camera vector (dot < threshold)
export function shouldAutoFrameFace(
  face: Face,
  cameraPosition: THREE.Vector3,
  threshold: number = 0.25
): boolean {
  const dot = computeFaceCameraDot(face, cameraPosition);
  return dot < threshold;
}

// Rotation indicator arc parameters (Pillar 2)
export function getRotationArcParameters(move: string): {
  face: Face;
  arcRadius: number;
  startAngle: number;
  sweepAngle: number;
  isDouble: boolean;
  isPrime: boolean;
} {
  const trimmed = move.trim();
  const face = trimmed[0] as Face;
  const isPrime = trimmed.includes("'");
  const isDouble = trimmed.includes('2');
  const arcRadius = 1.90; // Orbiting outside 1.50 cube boundary

  let startAngle: number;
  let sweepAngle: number;

  if (isDouble) {
    // 180° turn: clean 195° unidirectional arc without ambiguous opposing arrowheads
    startAngle = Math.PI * 0.85;
    sweepAngle = -Math.PI * (195 / 180); // Exact 195° unidirectional sweep
  } else if (isPrime) {
    startAngle = Math.PI * 0.25;
    sweepAngle = Math.PI * 1.15;
  } else {
    startAngle = Math.PI * 0.75;
    sweepAngle = -Math.PI * 1.15;
  }

  return { face, arcRadius, startAngle, sweepAngle, isDouble, isPrime };
}

// Create exterior glowing layer collar/halo geometry around active slice boundary
export function createLayerCollarGeometry(face: Face): THREE.BufferGeometry {
  const halfSize = 1.55; // Sits 0.05 units outside 1.50 cube surface
  const r = 0.12; // Corner fillet radius
  const pts2D: THREE.Vector2[] = [];
  const segmentsPerCorner = 6;

  // 4 Filleted Corners
  const corners = [
    { cx: halfSize - r, cy: halfSize - r, aStart: 0, aEnd: Math.PI / 2 },
    { cx: -(halfSize - r), cy: halfSize - r, aStart: Math.PI / 2, aEnd: Math.PI },
    { cx: -(halfSize - r), cy: -(halfSize - r), aStart: Math.PI, aEnd: (3 * Math.PI) / 2 },
    { cx: halfSize - r, cy: -(halfSize - r), aStart: (3 * Math.PI) / 2, aEnd: 2 * Math.PI },
  ];

  for (const corner of corners) {
    for (let i = 0; i <= segmentsPerCorner; i++) {
      const a = corner.aStart + (corner.aEnd - corner.aStart) * (i / segmentsPerCorner);
      pts2D.push(new THREE.Vector2(
        corner.cx + r * Math.cos(a),
        corner.cy + r * Math.sin(a)
      ));
    }
  }

  // Map 2D perimeter loop to 3D slice orientation
  const pts3D: THREE.Vector3[] = [];
  for (const p of pts2D) {
    switch (face) {
      case 'U':
        pts3D.push(new THREE.Vector3(p.x, 1.0, p.y));
        break;
      case 'D':
        pts3D.push(new THREE.Vector3(p.x, -1.0, p.y));
        break;
      case 'F':
        pts3D.push(new THREE.Vector3(p.x, p.y, 1.0));
        break;
      case 'B':
        pts3D.push(new THREE.Vector3(-p.x, p.y, -1.0));
        break;
      case 'R':
        pts3D.push(new THREE.Vector3(1.0, p.y, -p.x));
        break;
      case 'L':
        pts3D.push(new THREE.Vector3(-1.0, p.y, p.x));
        break;
    }
  }

  const curve = new THREE.CatmullRomCurve3(pts3D, true);
  return new THREE.TubeGeometry(curve, 64, 0.045, 8, true);
}

// Easing function: smooth cubic ease-in-out (zero start & end jerk)
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const Cube3DViewer = forwardRef<Cube3DViewerRef, Cube3DViewerProps>(({
  cubeState,
  activeMove = null,
  activeStep = null,
  nextStep = null,
  currentStepIndex = 0,
  totalSteps = 0,
  isSolved = false,
  animationSpeed = 350,
  showArrows = true,
  onAnimationEnd,
  interactivePainting = false,
  onStickerClick
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubiesRef = useRef<THREE.Mesh[]>([]);
  const stickerMeshesRef = useRef<THREE.Mesh[]>([]);
  const stickersMapRef = useRef<Record<Face, (THREE.Mesh | null)[]>>({
    U: new Array(9).fill(null),
    D: new Array(9).fill(null),
    F: new Array(9).fill(null),
    B: new Array(9).fill(null),
    L: new Array(9).fill(null),
    R: new Array(9).fill(null)
  });

  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const arrowGroupRef = useRef<THREE.Group | null>(null);
  const layerHighlightRef = useRef<THREE.Group | null>(null);

  // Single RAF Loop and Active Animation tracking
  const animFrameIdRef = useRef<number | null>(null);
  const onAnimationEndRef = useRef(onAnimationEnd);
  useEffect(() => {
    onAnimationEndRef.current = onAnimationEnd;
  }, [onAnimationEnd]);

  const camAnimRef = useRef<{
    startPos: THREE.Vector3;
    targetPos: THREE.Vector3;
    startTime: number;
    duration: number;
    resolve?: () => void;
  } | null>(null);

  const moveAnimRef = useRef<{
    pivot: THREE.Group;
    axis: THREE.Vector3;
    targetAngle: number;
    startTime: number;
    duration: number;
    targetCubies: THREE.Mesh[];
    resolve: () => void;
  } | null>(null);

  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cubeStateRef = useRef<CubeState>(cubeState);
  useEffect(() => {
    cubeStateRef.current = cubeState;
  }, [cubeState]);

  const getColorHex = (c: keyof typeof CUBE_COLORS) => {
    return parseInt(CUBE_COLORS[c].hex.replace('#', '0x'), 16);
  };

  // Reset all 27 cubies to exact identity alignment in world grid
  const resetCubieTransforms = () => {
    cubiesRef.current.forEach((cubie) => {
      const u = cubie.userData;
      if (u && typeof u.gx === 'number') {
        cubie.position.set(u.gx, u.gy, u.gz);
      }
      cubie.rotation.set(0, 0, 0);
      cubie.quaternion.identity();
      cubie.updateMatrix();
      cubie.updateMatrixWorld(true);
    });
  };

  const uCoords = [
    [-1, 1, -1], [0, 1, -1], [1, 1, -1],
    [-1, 1,  0], [0, 1,  0], [1, 1,  0],
    [-1, 1,  1], [0, 1,  1], [1, 1,  1]
  ];

  const dCoords = [
    [-1, -1,  1], [0, -1,  1], [1, -1,  1],
    [-1, -1,  0], [0, -1,  0], [1, -1,  0],
    [-1, -1, -1], [0, -1, -1], [1, -1, -1]
  ];

  const fCoords = [
    [-1,  1, 1], [0,  1, 1], [1,  1, 1],
    [-1,  0, 1], [0,  0, 1], [1,  0, 1],
    [-1, -1, 1], [0, -1, 1], [1, -1, 1]
  ];

  const bCoords = [
    [ 1,  1, -1], [0,  1, -1], [-1,  1, -1],
    [ 1,  0, -1], [0,  0, -1], [-1,  0, -1],
    [ 1, -1, -1], [0, -1, -1], [-1, -1, -1]
  ];

  const lCoords = [
    [-1,  1, -1], [-1,  1, 0], [-1,  1, 1],
    [-1,  0, -1], [-1,  0, 0], [-1,  0, 1],
    [-1, -1, -1], [-1, -1, 0], [-1, -1, 1]
  ];

  const rCoords = [
    [1,  1, 1], [1,  1, 0], [1,  1, -1],
    [1,  0, 1], [1,  0, 0], [1,  0, -1],
    [1, -1, 1], [1, -1, 0], [1, -1, -1]
  ];

  // Synchronously reset cubies to identity grid and repaint vinyl sticker colors
  // in the exact same render frame — eliminates the 1-frame snapback visual rollback glitch!
  const updateStickerMaterials = (state: CubeState) => {
    if (!cubiesRef.current.length) return;

    resetCubieTransforms();

    const faces: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];
    faces.forEach((face) => {
      const faceColors = state[face];
      if (!faceColors) return;
      for (let idx = 0; idx < 9; idx++) {
        const sticker = stickersMapRef.current[face]?.[idx];
        if (sticker && sticker.material instanceof THREE.MeshStandardMaterial) {
          sticker.material.color.setHex(getColorHex(faceColors[idx]));
        }
      }
    });
  };

  const updateLayerHighlight = (move: string | null) => {
    if (!sceneRef.current) return;

    if (layerHighlightRef.current) {
      sceneRef.current.remove(layerHighlightRef.current);
      layerHighlightRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
      layerHighlightRef.current = null;
    }

    if (!move) return;

    const face = move[0] as Face;
    if (!FACE_NORMALS[face]) return;

    // Clean, crisp layer boundary outline that highlights active layer without obscuring cube faces
    const size = new THREE.Vector3(3.08, 3.08, 3.08);
    const center = new THREE.Vector3(0, 0, 0);

    switch (face) {
      case 'U':
        size.set(3.08, 1.05, 3.08);
        center.set(0, 1.0, 0);
        break;
      case 'D':
        size.set(3.08, 1.05, 3.08);
        center.set(0, -1.0, 0);
        break;
      case 'R':
        size.set(1.05, 3.08, 3.08);
        center.set(1.0, 0, 0);
        break;
      case 'L':
        size.set(1.05, 3.08, 3.08);
        center.set(-1.0, 0, 0);
        break;
      case 'F':
        size.set(3.08, 3.08, 1.05);
        center.set(0, 0, 1.0);
        break;
      case 'B':
        size.set(3.08, 3.08, 1.05);
        center.set(0, 0, -1.0);
        break;
    }

    const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edgesGeom = new THREE.EdgesGeometry(boxGeom);
    boxGeom.dispose();
    const lineMat = new THREE.LineBasicMaterial({
      color: face === 'U' ? 0x00e5ff : 0xffffff,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const highlightBox = new THREE.LineSegments(edgesGeom, lineMat);
    highlightBox.position.copy(center);
    highlightBox.renderOrder = DUAL_PASS_CONFIG.pass2.renderOrder;

    const group = new THREE.Group();
    group.add(highlightBox);
    sceneRef.current.add(group);
    layerHighlightRef.current = group;
  };

  const updateRotationArrow = (move: string | null) => {
    if (!arrowGroupRef.current) return;

    arrowGroupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
    arrowGroupRef.current.clear();

    if (!move || !showArrows) return;

    const trimmed = move.trim();
    const face = trimmed[0] as Face;
    if (!FACE_NORMALS[face]) return;

    const { startAngle, sweepAngle, isDouble } = getRotationArcParameters(move);
    const arrowGroup = new THREE.Group();
    // High-contrast electric cyan on white U face to prevent washing out, crisp white on colored faces
    const arrowColor = face === 'U' ? 0x00e5ff : 0xffffff;

    // Face basis vectors: center, u (right for viewer), v (up for viewer)
    const center = new THREE.Vector3(0, 0, 0);
    const u = new THREE.Vector3(1, 0, 0);
    const v = new THREE.Vector3(0, 1, 0);
    const offset = 1.58;

    switch (face) {
      case 'F':
        center.set(0, 0, offset);
        u.set(1, 0, 0);
        v.set(0, 1, 0);
        break;
      case 'B':
        center.set(0, 0, -offset);
        u.set(-1, 0, 0);
        v.set(0, 1, 0);
        break;
      case 'U':
        center.set(0, offset, 0);
        u.set(1, 0, 0);
        v.set(0, 0, -1);
        break;
      case 'D':
        center.set(0, -offset, 0);
        u.set(1, 0, 0);
        v.set(0, 0, 1);
        break;
      case 'R':
        center.set(offset, 0, 0);
        u.set(0, 0, -1);
        v.set(0, 1, 0);
        break;
      case 'L':
        center.set(-offset, 0, 0);
        u.set(0, 0, 1);
        v.set(0, 1, 0);
        break;
    }

    // Keep arc radius cleanly centered on the face (1.28) so it never cuts across adjacent faces
    const arcRadius = 1.28;
    const tubeRadius = 0.055;
    const numPoints = 36;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const angle = startAngle + sweepAngle * t;
      const pt = center.clone()
        .addScaledVector(u, arcRadius * Math.cos(angle))
        .addScaledVector(v, arcRadius * Math.sin(angle));
      points.push(pt);
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeom = new THREE.TubeGeometry(curve, 32, tubeRadius, 10, false);

    // Dark contrast backing contour (guarantees 100% visibility against pure white or bright stickers)
    const darkMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.80,
      depthWrite: false
    });
    const darkTubeGeom = new THREE.TubeGeometry(curve, 32, tubeRadius * 1.45, 10, false);
    const darkTube = new THREE.Mesh(darkTubeGeom, darkMat);
    darkTube.renderOrder = DUAL_PASS_CONFIG.pass1.renderOrder - 1;
    arrowGroup.add(darkTube);

    // Pass 1: Ghost pass (GreaterDepth, 0.35 opacity, renderOrder: 998)
    // Allows subtle x-ray silhouette when face is angled away
    const ghostTubeMat = new THREE.MeshBasicMaterial({
      color: arrowColor,
      depthFunc: DUAL_PASS_CONFIG.pass1.depthFunc,
      transparent: DUAL_PASS_CONFIG.pass1.transparent,
      opacity: DUAL_PASS_CONFIG.pass1.opacity,
      depthWrite: DUAL_PASS_CONFIG.pass1.depthWrite
    });
    const ghostTube = new THREE.Mesh(tubeGeom, ghostTubeMat);
    ghostTube.renderOrder = DUAL_PASS_CONFIG.pass1.renderOrder;
    arrowGroup.add(ghostTube);

    // Pass 2: Foreground pass (LessEqualDepth, 1.0 opacity, renderOrder: 999)
    const tubeMat = new THREE.MeshBasicMaterial({
      color: arrowColor,
      depthFunc: DUAL_PASS_CONFIG.pass2.depthFunc,
      transparent: DUAL_PASS_CONFIG.pass2.transparent,
      opacity: DUAL_PASS_CONFIG.pass2.opacity,
      depthWrite: DUAL_PASS_CONFIG.pass2.depthWrite
    });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    tube.renderOrder = DUAL_PASS_CONFIG.pass2.renderOrder;
    arrowGroup.add(tube);

    // Directional Arrowhead Cone at arc endpoint pointing along tangent
    const coneGeom = new THREE.ConeGeometry(0.18, 0.36, 16);
    const endPos = points[points.length - 1];
    const prevPos = points[points.length - 2];
    const tangent = new THREE.Vector3().subVectors(endPos, prevPos).normalize();
    const coneQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);

    // Dark backing cone contour
    const darkConeGeom = new THREE.ConeGeometry(0.24, 0.42, 16);
    const darkCone = new THREE.Mesh(darkConeGeom, darkMat);
    darkCone.position.copy(endPos);
    darkCone.quaternion.copy(coneQuat);
    darkCone.renderOrder = DUAL_PASS_CONFIG.pass1.renderOrder - 1;
    arrowGroup.add(darkCone);

    // Ghost cone Pass 1
    const ghostConeMat = new THREE.MeshBasicMaterial({
      color: arrowColor,
      depthFunc: DUAL_PASS_CONFIG.pass1.depthFunc,
      transparent: DUAL_PASS_CONFIG.pass1.transparent,
      opacity: DUAL_PASS_CONFIG.pass1.opacity,
      depthWrite: DUAL_PASS_CONFIG.pass1.depthWrite
    });
    const ghostCone = new THREE.Mesh(coneGeom, ghostConeMat);
    ghostCone.position.copy(endPos);
    ghostCone.quaternion.copy(coneQuat);
    ghostCone.renderOrder = DUAL_PASS_CONFIG.pass1.renderOrder;
    arrowGroup.add(ghostCone);

    // Foreground cone Pass 2
    const coneMat = new THREE.MeshBasicMaterial({
      color: arrowColor,
      depthFunc: DUAL_PASS_CONFIG.pass2.depthFunc,
      transparent: DUAL_PASS_CONFIG.pass2.transparent,
      opacity: DUAL_PASS_CONFIG.pass2.opacity,
      depthWrite: DUAL_PASS_CONFIG.pass2.depthWrite
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.copy(endPos);
    cone.quaternion.copy(coneQuat);
    cone.renderOrder = DUAL_PASS_CONFIG.pass2.renderOrder;
    arrowGroup.add(cone);

    if (isDouble) {
      const startPos = points[0];
      const nextPos = points[1];
      const startTangent = new THREE.Vector3().subVectors(startPos, nextPos).normalize();
      
      const darkCone2 = new THREE.Mesh(darkConeGeom, darkMat);
      darkCone2.position.copy(startPos);
      darkCone2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), startTangent);
      darkCone2.renderOrder = DUAL_PASS_CONFIG.pass1.renderOrder - 1;
      arrowGroup.add(darkCone2);

      const ghostCone2 = new THREE.Mesh(coneGeom, ghostConeMat);
      ghostCone2.position.copy(startPos);
      ghostCone2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), startTangent);
      ghostCone2.renderOrder = DUAL_PASS_CONFIG.pass1.renderOrder;
      arrowGroup.add(ghostCone2);

      const cone2 = new THREE.Mesh(coneGeom, coneMat);
      cone2.position.copy(startPos);
      cone2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), startTangent);
      cone2.renderOrder = DUAL_PASS_CONFIG.pass2.renderOrder;
      arrowGroup.add(cone2);
    }

    arrowGroupRef.current.add(arrowGroup);
  };

  // Smooth camera navigation driven by the unified RAF loop
  const smoothMoveCamera = (targetPos: THREE.Vector3, duration: number = 400): Promise<void> => {
    return new Promise((resolve) => {
      if (!cameraRef.current || !controlsRef.current) {
        resolve();
        return;
      }
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      camAnimRef.current = {
        startPos: cameraRef.current.position.clone(),
        targetPos: targetPos.clone(),
        startTime: performance.now(),
        duration,
        resolve
      };
    });
  };

  // Pillar 1: Smart Camera Auto-Framing
  // Glides camera smoothly to optimal 3/4 vantage point when face normal dot camera vector < 0.25
  const autoFrameFace = (face: Face, threshold: number = 0.25): boolean => {
    if (!cameraRef.current) return false;
    if (shouldAutoFrameFace(face, cameraRef.current.position, threshold)) {
      const target = OPTIMAL_VANTAGE_POINTS[face];
      if (target) {
        smoothMoveCamera(target, 450);
        return true;
      }
    }
    return false;
  };

  const focusFace = (face: Face) => {
    const target = OPTIMAL_VANTAGE_POINTS[face] || new THREE.Vector3(4.5, 4.2, 5.5);
    smoothMoveCamera(target, 450);
  };

  const performMoveAnimation = (move: string, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!sceneRef.current || !cubeGroupRef.current) {
        resolve();
        return;
      }

      // Fast-forward any previous animation if still executing
      if (moveAnimRef.current) {
        const active = moveAnimRef.current;
        active.pivot.setRotationFromAxisAngle(active.axis, active.targetAngle);
        active.pivot.updateMatrixWorld();
        active.targetCubies.forEach((c) => cubeGroupRef.current?.attach(c));
        cubeGroupRef.current?.remove(active.pivot);
        active.resolve();
        moveAnimRef.current = null;
      }

      // Ensure cubie grid transforms are consistent before new move starts
      resetCubieTransforms();

      setIsRotating(true);
      const face = move[0] as Face;
      const isPrime = move.includes("'");
      const isDouble = move.includes('2');

      const targetCubies: THREE.Mesh[] = [];
      cubiesRef.current.forEach((cubie) => {
        const u = cubie.userData;
        const x = u.gx;
        const y = u.gy;
        const z = u.gz;

        if (face === 'U' && y === 1) targetCubies.push(cubie);
        else if (face === 'D' && y === -1) targetCubies.push(cubie);
        else if (face === 'L' && x === -1) targetCubies.push(cubie);
        else if (face === 'R' && x === 1) targetCubies.push(cubie);
        else if (face === 'F' && z === 1) targetCubies.push(cubie);
        else if (face === 'B' && z === -1) targetCubies.push(cubie);
      });

      const pivot = new THREE.Group();
      cubeGroupRef.current.add(pivot);

      targetCubies.forEach((cubie) => {
        pivot.attach(cubie);
      });

      const axis = new THREE.Vector3(0, 1, 0);
      let targetAngle = 0;

      switch (face) {
        case 'U':
          axis.set(0, 1, 0);
          targetAngle = isPrime ? Math.PI / 2 : -Math.PI / 2;
          break;
        case 'D':
          axis.set(0, 1, 0);
          targetAngle = isPrime ? -Math.PI / 2 : Math.PI / 2;
          break;
        case 'R':
          axis.set(1, 0, 0);
          targetAngle = isPrime ? Math.PI / 2 : -Math.PI / 2;
          break;
        case 'L':
          axis.set(1, 0, 0);
          targetAngle = isPrime ? -Math.PI / 2 : Math.PI / 2;
          break;
        case 'F':
          axis.set(0, 0, 1);
          targetAngle = isPrime ? Math.PI / 2 : -Math.PI / 2;
          break;
        case 'B':
          axis.set(0, 0, 1);
          targetAngle = isPrime ? -Math.PI / 2 : Math.PI / 2;
          break;
      }

      // 180° double turn rotates a continuous full 180° around the face normal
      if (isDouble) {
        targetAngle *= 2;
      }

      // Scale 180° double-turn duration to 1.35x for authentic, natural pacing
      const actualDuration = isDouble ? Math.round(duration * 1.35) : duration;

      moveAnimRef.current = {
        pivot,
        axis,
        targetAngle,
        startTime: performance.now(),
        duration: actualDuration,
        targetCubies,
        resolve
      };
    });
  };

  useImperativeHandle(ref, () => ({
    animateMove: (move: string, optionsOrSpeed?: number | { duration?: number }) => {
      let dur = 350;
      if (typeof optionsOrSpeed === 'number') {
        dur = Math.max(120, animationSpeed / (optionsOrSpeed || 1.0));
      } else if (optionsOrSpeed && typeof optionsOrSpeed.duration === 'number') {
        dur = optionsOrSpeed.duration;
      } else {
        dur = animationSpeed;
      }
      return performMoveAnimation(move, dur);
    },
    resetCamera: () => {
      smoothMoveCamera(new THREE.Vector3(5.4, 4.6, 6.4));
    },
    focusFace: (face: Face) => {
      focusFace(face);
    },
    autoFrameFace: (face: Face) => {
      return autoFrameFace(face);
    }
  }));

  // Setup 3D Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.4, 4.6, 6.4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    // Studio Tone Mapping & Color Space (R1)
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 4.0;
    controls.maxDistance = 14;
    controls.rotateSpeed = 0.8;
    controls.enablePan = false;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controlsRef.current = controls;

    // Studio 4-Point Lighting (Key 2.0, Fill 0.85, Rim 1.1, Ambient 0.55) (R1)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(6, 10, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85);
    fillLight.position.set(-6, -3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(-5, 7, -7);
    scene.add(rimLight);

    // Subtle Grounding Contact Shadow Plane under the cube (R1)
    const shadowGeo = new THREE.PlaneGeometry(5.4, 5.4);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const gradient = sCtx.createRadialGradient(128, 128, 20, 128, 128, 120);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      gradient.addColorStop(0.45, 'rgba(0, 0, 0, 0.18)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = gradient;
      sCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.8
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.25;
    scene.add(shadowPlane);

    const cubeGroup = new THREE.Group();
    cubeGroupRef.current = cubeGroup;
    scene.add(cubeGroup);

    const arrowGroup = new THREE.Group();
    arrowGroupRef.current = arrowGroup;
    scene.add(arrowGroup);


    // Solid Central Core Mesh (R1) at (0, 0, 0)
    // Eliminates all hollow gaps or canvas background visible through seams
    const coreGeom = new RoundedBoxGeometry(1.95, 1.95, 1.95, 3, 0.2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: PLASTIC_COLOR,
      roughness: 0.8,
      metalness: 0.1
    });
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreMesh.position.set(0, 0, 0);
    cubeGroup.add(coreMesh);

    // 27 Cubies with Solid Beveled Geometry (0.965, 3, 0.045) leaving narrow 0.035 seams (R1)
    const cubieGeom = new RoundedBoxGeometry(0.965, 0.965, 0.965, 3, 0.045);
    const cubieMat = new THREE.MeshStandardMaterial({
      color: PLASTIC_COLOR,
      roughness: 0.55,
      metalness: 0.1
    });

    // 54 Authentic Vinyl Sticker Meshes (0.85 x 0.85, radius 0.06) with crisp 0.0575 black borders (R1)
    const stickerShape = createRoundedRectShape(0.85, 0.85, 0.06);
    const stickerGeom = new THREE.ShapeGeometry(stickerShape, 12);
    const halfDist = 0.4855; // Sits exactly on outer face with crisp 0.0575 black border

    const cubies: THREE.Mesh[] = [];
    const allStickers: THREE.Mesh[] = [];
    const stickersMap: Record<Face, (THREE.Mesh | null)[]> = {
      U: new Array(9).fill(null),
      D: new Array(9).fill(null),
      F: new Array(9).fill(null),
      B: new Array(9).fill(null),
      L: new Array(9).fill(null),
      R: new Array(9).fill(null)
    };

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = new THREE.Mesh(cubieGeom, cubieMat);
          cubie.position.set(x, y, z);
          cubie.userData = { gx: x, gy: y, gz: z };
          cubeGroup.add(cubie);
          cubies.push(cubie);

          // Vinyl Stickers on outer faces
          // Top (U, +Y)
          if (y === 1) {
            const idx = uCoords.findIndex(c => c[0] === x && c[1] === y && c[2] === z);
            const stickerMat = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              roughness: 0.18,
              metalness: 0.0
            });
            const sticker = new THREE.Mesh(stickerGeom, stickerMat);
            sticker.position.set(0, halfDist, 0);
            sticker.rotation.set(-Math.PI / 2, 0, 0);
            sticker.userData = { face: 'U', index: idx, gx: x, gy: y, gz: z };
            cubie.add(sticker);
            stickersMap.U[idx] = sticker;
            allStickers.push(sticker);
          }
          // Bottom (D, -Y)
          if (y === -1) {
            const idx = dCoords.findIndex(c => c[0] === x && c[1] === y && c[2] === z);
            const stickerMat = new THREE.MeshStandardMaterial({
              color: 0xffd500,
              roughness: 0.18,
              metalness: 0.0
            });
            const sticker = new THREE.Mesh(stickerGeom, stickerMat);
            sticker.position.set(0, -halfDist, 0);
            sticker.rotation.set(Math.PI / 2, 0, 0);
            sticker.userData = { face: 'D', index: idx, gx: x, gy: y, gz: z };
            cubie.add(sticker);
            stickersMap.D[idx] = sticker;
            allStickers.push(sticker);
          }
          // Front (F, +Z)
          if (z === 1) {
            const idx = fCoords.findIndex(c => c[0] === x && c[1] === y && c[2] === z);
            const stickerMat = new THREE.MeshStandardMaterial({
              color: 0x009b48,
              roughness: 0.18,
              metalness: 0.0
            });
            const sticker = new THREE.Mesh(stickerGeom, stickerMat);
            sticker.position.set(0, 0, halfDist);
            sticker.rotation.set(0, 0, 0);
            sticker.userData = { face: 'F', index: idx, gx: x, gy: y, gz: z };
            cubie.add(sticker);
            stickersMap.F[idx] = sticker;
            allStickers.push(sticker);
          }
          // Back (B, -Z)
          if (z === -1) {
            const idx = bCoords.findIndex(c => c[0] === x && c[1] === y && c[2] === z);
            const stickerMat = new THREE.MeshStandardMaterial({
              color: 0x0046ad,
              roughness: 0.18,
              metalness: 0.0
            });
            const sticker = new THREE.Mesh(stickerGeom, stickerMat);
            sticker.position.set(0, 0, -halfDist);
            sticker.rotation.set(0, Math.PI, 0);
            sticker.userData = { face: 'B', index: idx, gx: x, gy: y, gz: z };
            cubie.add(sticker);
            stickersMap.B[idx] = sticker;
            allStickers.push(sticker);
          }
          // Left (L, -X)
          if (x === -1) {
            const idx = lCoords.findIndex(c => c[0] === x && c[1] === y && c[2] === z);
            const stickerMat = new THREE.MeshStandardMaterial({
              color: 0xff5800,
              roughness: 0.18,
              metalness: 0.0
            });
            const sticker = new THREE.Mesh(stickerGeom, stickerMat);
            sticker.position.set(-halfDist, 0, 0);
            sticker.rotation.set(0, -Math.PI / 2, 0);
            sticker.userData = { face: 'L', index: idx, gx: x, gy: y, gz: z };
            cubie.add(sticker);
            stickersMap.L[idx] = sticker;
            allStickers.push(sticker);
          }
          // Right (R, +X)
          if (x === 1) {
            const idx = rCoords.findIndex(c => c[0] === x && c[1] === y && c[2] === z);
            const stickerMat = new THREE.MeshStandardMaterial({
              color: 0xb71234,
              roughness: 0.18,
              metalness: 0.0
            });
            const sticker = new THREE.Mesh(stickerGeom, stickerMat);
            sticker.position.set(halfDist, 0, 0);
            sticker.rotation.set(0, Math.PI / 2, 0);
            sticker.userData = { face: 'R', index: idx, gx: x, gy: y, gz: z };
            cubie.add(sticker);
            stickersMap.R[idx] = sticker;
            allStickers.push(sticker);
          }
        }
      }
    }

    cubiesRef.current = cubies;
    stickerMeshesRef.current = allStickers;
    stickersMapRef.current = stickersMap;

    // Paint initial state
    updateStickerMaterials(cubeStateRef.current);

    // Consolidated Single RAF Render Loop (R1 & R6)
    // Runs OrbitControls damping, camera gliding, and cubic layer rotation without conflicting loops
    const render = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(render);

      // 1. Camera animation
      if (camAnimRef.current && cameraRef.current && controlsRef.current) {
        const anim = camAnimRef.current;
        const elapsed = time - anim.startTime;
        const t = Math.min(elapsed / anim.duration, 1);
        const ease = easeInOutCubic(t);
        cameraRef.current.position.lerpVectors(anim.startPos, anim.targetPos, ease);
        cameraRef.current.lookAt(0, 0, 0);

        if (t >= 1) {
          cameraRef.current.position.copy(anim.targetPos);
          cameraRef.current.lookAt(0, 0, 0);
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.enabled = true;
          controlsRef.current.update();
          if (anim.resolve) anim.resolve();
          camAnimRef.current = null;
        }
      } else {
        // 2. Controls update only when NOT actively animating camera
        controlsRef.current?.update();
      }

      // 3. Move rotation animation
      if (moveAnimRef.current) {
        const anim = moveAnimRef.current;
        const elapsed = time - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);
        const ease = easeInOutCubic(progress);
        const currentAngle = anim.targetAngle * ease;
        anim.pivot.setRotationFromAxisAngle(anim.axis, currentAngle);

        if (progress >= 1) {
          anim.pivot.setRotationFromAxisAngle(anim.axis, anim.targetAngle);
          anim.pivot.updateMatrixWorld();

          // Detach cubies back to cubeGroup in their rotated orientations
          anim.targetCubies.forEach((cubie) => {
            cubeGroupRef.current?.attach(cubie);
          });
          cubeGroupRef.current?.remove(anim.pivot);

          // NOTE: DO NOT call resetCubieTransforms() here!
          // Cubies stay in their rotated positions until updateStickerMaterials synchronously resets
          // coordinates and applies new sticker colors in the same exact frame.
          soundManager.playClick();
          setIsRotating(false);
          if (onAnimationEndRef.current) onAnimationEndRef.current();

          const resolve = anim.resolve;
          moveAnimRef.current = null;
          resolve();
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      cubieGeom.dispose();
      cubieMat.dispose();
      coreGeom.dispose();
      coreMat.dispose();
      stickerGeom.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();
      allStickers.forEach((s) => {
        if (s.material instanceof THREE.Material) {
          s.material.dispose();
        }
      });
      if (layerHighlightRef.current && sceneRef.current) {
        sceneRef.current.remove(layerHighlightRef.current);
        layerHighlightRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
        layerHighlightRef.current = null;
      }
      if (arrowGroupRef.current) {
        arrowGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else if (child.material) {
              child.material.dispose();
            }
          }
        });
        arrowGroupRef.current.clear();
      }
    };
  }, []);

  // Raycasting for interactive 3D sticker clicks in CubeNetEditor painting mode
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interactivePainting || !onStickerClick || !containerRef.current || !cameraRef.current) return;

    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (dx > 6 || dy > 6) return; // User dragged to orbit camera, not a click

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // 1. Direct hit on 54 separate sticker child meshes
    const stickerIntersects = raycaster.intersectObjects(stickerMeshesRef.current, false);
    if (stickerIntersects.length > 0) {
      const hit = stickerIntersects[0].object;
      const { face, index } = hit.userData as { face: Face; index: number };
      if (face && typeof index === 'number') {
        if (index !== 4) { // Don't allow changing fixed center sticker
          soundManager.playClick();
          onStickerClick(face, index);
        }
        return;
      }
    }

    // 2. Fallback hit on cubie bevel plastic border
    const cubieIntersects = raycaster.intersectObjects(cubiesRef.current, false);
    if (cubieIntersects.length > 0) {
      const hit = cubieIntersects[0];
      const normal = hit.face?.normal;
      const cubie = hit.object as THREE.Mesh;
      const u = cubie.userData;
      if (!normal || !u) return;

      const worldNormal = normal.clone().applyQuaternion(cubie.quaternion).round();
      let face: Face | null = null;
      let coordList: number[][] | null = null;

      if (worldNormal.y > 0.5) { face = 'U'; coordList = uCoords; }
      else if (worldNormal.y < -0.5) { face = 'D'; coordList = dCoords; }
      else if (worldNormal.z > 0.5) { face = 'F'; coordList = fCoords; }
      else if (worldNormal.z < -0.5) { face = 'B'; coordList = bCoords; }
      else if (worldNormal.x > 0.5) { face = 'R'; coordList = rCoords; }
      else if (worldNormal.x < -0.5) { face = 'L'; coordList = lCoords; }

      if (face && coordList) {
        const stickerIdx = coordList.findIndex(
          c => c[0] === u.gx && c[1] === u.gy && c[2] === u.gz
        );
        if (stickerIdx !== -1 && stickerIdx !== 4) {
          soundManager.playClick();
          onStickerClick(face, stickerIdx);
        }
      }
    }
  };

  useEffect(() => {
    updateStickerMaterials(cubeState);
  }, [cubeState]);

  useEffect(() => {
    updateRotationArrow(activeMove);
    updateLayerHighlight(activeMove);
    if (activeMove) {
      const face = activeMove[0] as Face;
      if (FACE_NORMALS[face]) {
        autoFrameFace(face, 0.20);
      }
    }
  }, [activeMove, showArrows]);

  const activeFace = activeMove ? (activeMove[0] as Face) : null;
  const isPrime = activeMove?.includes("'");
  const isDouble = activeMove?.includes('2');

  return (
    <div 
      className="relative w-full h-full flex items-center justify-center select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div 
        ref={containerRef} 
        className={`w-full h-full ${interactivePainting ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`} 
      />
      
      {/* Top Left: Orientation & Reset Camera */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 pointer-events-auto z-20">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md border border-white/20 text-[11px] text-white font-mono shadow-md">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="hidden xs:inline">White Top &bull; Green Front</span>
          <span className="xs:hidden">W Top &bull; G Front</span>
        </div>
        <button
          onClick={() => smoothMoveCamera(new THREE.Vector3(5.4, 4.6, 6.4))}
          className="p-1.5 rounded-xl bg-black/85 hover:bg-neutral-800 backdrop-blur-md border border-white/20 text-white transition-colors"
          title="Reset Camera View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Right: Status / Face View Switcher */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex items-center gap-1.5 pointer-events-auto z-20">
        {activeFace && (
          <button
            onClick={() => focusFace(activeFace)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-black font-bold text-[11px] hover:bg-neutral-200 transition-colors shadow-lg"
            title={`Auto-rotate camera to view ${FACE_NAMES[activeFace]} face`}
          >
            <Video className="w-3.5 h-3.5 text-black stroke-[2.2]" />
            <span>Focus Face ({activeFace})</span>
          </button>
        )}

        {isRotating && (
          <div className="px-2.5 py-1 rounded-xl bg-black/90 border border-white/40 text-[11px] text-white font-mono pointer-events-none flex items-center gap-1.5 shadow-md">
            <span className="animate-spin inline-block w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full" />
            Turning...
          </div>
        )}
      </div>

      {/* HIGH-VISIBILITY MOVE COMPASS BANNER (Hidden on mobile to ensure zero 3D occlusion, visible on lg:) */}
      {totalSteps > 0 && (
        <div className="hidden lg:block absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-4 sm:right-4 z-20 pointer-events-auto">
          {isHudCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={() => setIsHudCollapsed(false)}
                className="px-3.5 py-1.5 rounded-full bg-black/90 hover:bg-neutral-800 backdrop-blur-md border border-white/30 text-xs text-white flex items-center gap-1.5 shadow-2xl transition-colors font-semibold"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Show Instructions</span>
              </button>
            </div>
          ) : currentStepIndex >= totalSteps ? (
            <div className="max-w-lg mx-auto p-3 sm:p-4 rounded-2xl bg-black/95 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                  isSolved 
                    ? 'bg-white text-black' 
                    : 'bg-neutral-800 border border-white/30 text-white'
                }`}>
                  {isSolved ? <CheckCircle2 className="w-5 h-5 stroke-[2.5]" /> : <AlertTriangle className="w-5 h-5 text-amber-400" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-mono uppercase font-black tracking-wider text-white truncate">
                    {isSolved ? 'Cube 100% Solved!' : 'All Steps Completed'}
                  </span>
                  <span className="text-xs text-neutral-400 line-clamp-1">
                    {isSolved 
                      ? 'Every face matches perfectly.' 
                      : 'Finished moves. Check initial cube state.'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsHudCollapsed(true)}
                className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                title="Minimize HUD"
              >
                <EyeOff className="w-4 h-4" />
              </button>
            </div>
          ) : activeStep ? (
            <div className="max-w-lg mx-auto p-3 sm:p-3.5 rounded-2xl bg-black/95 backdrop-blur-xl border border-white/25 shadow-2xl flex flex-col gap-2 text-white">
              {/* Top metadata row */}
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-white text-black font-black text-[11px] tracking-wider">
                    STEP {currentStepIndex + 1}/{totalSteps}
                  </span>
                  {activeStep.phase && (
                    <span className="text-neutral-300 font-semibold truncate max-w-[160px] sm:max-w-[220px] text-[11px]">
                      {activeStep.phase}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {activeFace && (
                    <button
                      onClick={() => focusFace(activeFace)}
                      className="text-[10px] text-neutral-300 hover:text-white flex items-center gap-1 underline underline-offset-2"
                    >
                      <Video className="w-3 h-3" />
                      View Face
                    </button>
                  )}
                  <button
                    onClick={() => setIsHudCollapsed(true)}
                    className="p-0.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                    title="Minimize HUD"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* High-visibility move hero banner */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Huge High-Contrast Move Badge */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white text-black font-mono text-2xl sm:text-3xl font-black flex items-center justify-center flex-shrink-0 shadow-lg border border-neutral-300">
                    {activeStep.notation}
                  </div>

                  <div className="flex flex-col min-w-0">
                    {/* Face Name & Action */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                        {activeFace ? `${FACE_NAMES[activeFace]} FACE` : 'TURN'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-white/15 text-[10px] font-mono text-neutral-200 border border-white/20 flex items-center gap-0.5">
                        {isDouble ? (
                          <>⟳ 180° Double</>
                        ) : isPrime ? (
                          <>↺ 90° Counter-Clockwise</>
                        ) : (
                          <>↻ 90° Clockwise</>
                        )}
                      </span>
                    </div>

                    {/* Step description */}
                    <span className="text-xs sm:text-[13px] font-medium text-neutral-200 mt-0.5 leading-snug line-clamp-1">
                      {activeStep.description}
                    </span>

                    {/* Visual prompt */}
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5 font-mono">
                      <RotateCw className="w-3 h-3 text-white" />
                      White highlighted layer &bull; Follow rotation arrow
                    </span>
                  </div>
                </div>

                {nextStep && (
                  <div className="hidden xs:flex flex-col items-end pl-3 border-l border-white/15 text-xs font-mono flex-shrink-0">
                    <span className="text-[10px] text-neutral-500 uppercase">Next</span>
                    <div className="flex items-center gap-1 font-bold text-white text-sm">
                      <span>{nextStep.notation}</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Mobile Floating Move Instruction Pill (Guarantees instructions are never hidden on mobile) */}
      {!interactivePainting && activeStep && (
        <div className="lg:hidden absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-xl pointer-events-none flex items-center gap-2 z-20">
          <span className="w-5 h-5 rounded-md bg-white text-black font-mono font-black text-xs flex items-center justify-center shadow-sm">
            {activeStep.notation}
          </span>
          <span className="text-[11px] font-bold font-mono">
            {activeFace ? `${FACE_NAMES[activeFace]} Face` : ''} {isDouble ? '⟳ 180°' : isPrime ? '↺ 90° CCW' : '↻ 90° CW'}
          </span>
        </div>
      )}

      {/* Interactive 3D Painter Mode Guide Overlay */}
      {interactivePainting && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/90 backdrop-blur-md border border-white/20 text-xs text-white font-mono shadow-xl pointer-events-none flex items-center gap-1.5 z-20">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Tap any sticker on the 3D cube to change its color</span>
        </div>
      )}
    </div>
  );
});
