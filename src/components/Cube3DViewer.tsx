import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  RotateCcw, Eye, EyeOff, CheckCircle2, AlertTriangle, 
  ArrowRight, Video, RotateCw
} from 'lucide-react';
import type { CubeState, Face, SolutionStep } from '../solver/cubeTypes';
import { CUBE_COLORS, FACE_NAMES } from '../solver/cubeTypes';
import { soundManager } from '../utils/soundEffects';

export interface Cube3DViewerRef {
  animateMove: (move: string, speedMultiplier?: number) => Promise<void>;
  resetCamera: () => void;
  focusFace: (face: Face) => void;
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
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const arrowGroupRef = useRef<THREE.Group | null>(null);
  const layerHighlightRef = useRef<THREE.LineSegments | null>(null);

  const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getColorHex = (c: keyof typeof CUBE_COLORS) => {
    return parseInt(CUBE_COLORS[c].hex.replace('#', '0x'), 16);
  };

  // Reset all 27 cubies to exact identity alignment in world space
  const resetCubieTransforms = () => {
    cubiesRef.current.forEach((cubie) => {
      const u = cubie.userData;
      if (u && typeof u.gx === 'number') {
        cubie.position.set(u.gx, u.gy, u.gz);
      }
      cubie.rotation.set(0, 0, 0);
      cubie.quaternion.identity();
      cubie.updateMatrix();
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

  const findCubie = (x: number, y: number, z: number) => {
    return cubiesRef.current.find(mesh => {
      const u = mesh.userData;
      return u.gx === x && u.gy === y && u.gz === z;
    });
  };

  const updateStickerMaterials = (state: CubeState) => {
    if (!cubiesRef.current.length) return;

    resetCubieTransforms();

    uCoords.forEach((c, idx) => {
      const cubie = findCubie(c[0], c[1], c[2]);
      if (cubie && Array.isArray(cubie.material)) {
        (cubie.material[2] as THREE.MeshStandardMaterial).color.setHex(getColorHex(state.U[idx]));
      }
    });

    dCoords.forEach((c, idx) => {
      const cubie = findCubie(c[0], c[1], c[2]);
      if (cubie && Array.isArray(cubie.material)) {
        (cubie.material[3] as THREE.MeshStandardMaterial).color.setHex(getColorHex(state.D[idx]));
      }
    });

    fCoords.forEach((c, idx) => {
      const cubie = findCubie(c[0], c[1], c[2]);
      if (cubie && Array.isArray(cubie.material)) {
        (cubie.material[4] as THREE.MeshStandardMaterial).color.setHex(getColorHex(state.F[idx]));
      }
    });

    bCoords.forEach((c, idx) => {
      const cubie = findCubie(c[0], c[1], c[2]);
      if (cubie && Array.isArray(cubie.material)) {
        (cubie.material[5] as THREE.MeshStandardMaterial).color.setHex(getColorHex(state.B[idx]));
      }
    });

    lCoords.forEach((c, idx) => {
      const cubie = findCubie(c[0], c[1], c[2]);
      if (cubie && Array.isArray(cubie.material)) {
        (cubie.material[1] as THREE.MeshStandardMaterial).color.setHex(getColorHex(state.L[idx]));
      }
    });

    rCoords.forEach((c, idx) => {
      const cubie = findCubie(c[0], c[1], c[2]);
      if (cubie && Array.isArray(cubie.material)) {
        (cubie.material[0] as THREE.MeshStandardMaterial).color.setHex(getColorHex(state.R[idx]));
      }
    });
  };

  const updateLayerHighlight = (move: string | null) => {
    if (!sceneRef.current) return;

    if (layerHighlightRef.current) {
      sceneRef.current.remove(layerHighlightRef.current);
      layerHighlightRef.current.geometry.dispose();
      (layerHighlightRef.current.material as THREE.Material).dispose();
      layerHighlightRef.current = null;
    }

    if (!move) return;

    const face = move[0] as Face;
    let size = new THREE.Vector3(3.08, 3.08, 3.08);
    let center = new THREE.Vector3(0, 0, 0);

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
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });

    const highlightBox = new THREE.LineSegments(edgesGeom, lineMat);
    highlightBox.position.copy(center);
    highlightBox.renderOrder = 998;
    sceneRef.current.add(highlightBox);
    layerHighlightRef.current = highlightBox;
  };

  const updateRotationArrow = (move: string | null) => {
    if (!arrowGroupRef.current) return;
    arrowGroupRef.current.clear();
    if (!move || !showArrows) return;

    const trimmed = move.trim();
    const face = trimmed[0] as Face;
    const isPrime = trimmed.includes("'");
    const isDouble = trimmed.includes('2');

    const arrowGroup = new THREE.Group();
    // High-contrast pure white glowing rotation arrow
    const arrowColor = 0xffffff;

    const arcRadius = 1.08;
    const tubeRadius = 0.075;

    // Torus arc
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(arcRadius, tubeRadius, 16, 48, Math.PI * 1.5),
      new THREE.MeshBasicMaterial({
        color: arrowColor,
        transparent: true,
        opacity: 0.95,
        depthTest: false // NEVER occluded behind cubies!
      })
    );
    torus.renderOrder = 999;

    // Arrowhead cone
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.42, 16),
      new THREE.MeshBasicMaterial({
        color: arrowColor,
        transparent: true,
        opacity: 0.95,
        depthTest: false // NEVER occluded behind cubies!
      })
    );
    cone.renderOrder = 999;

    cone.position.set(arcRadius, 0, 0);
    cone.rotation.z = isPrime ? Math.PI : 0;

    arrowGroup.add(torus);
    arrowGroup.add(cone);

    const offset = 1.68;
    switch (face) {
      case 'U':
        arrowGroup.position.set(0, offset, 0);
        arrowGroup.rotation.set(-Math.PI / 2, 0, isPrime ? Math.PI : 0);
        break;
      case 'D':
        arrowGroup.position.set(0, -offset, 0);
        arrowGroup.rotation.set(Math.PI / 2, 0, isPrime ? 0 : Math.PI);
        break;
      case 'F':
        arrowGroup.position.set(0, 0, offset);
        arrowGroup.rotation.set(0, 0, isPrime ? Math.PI : 0);
        break;
      case 'B':
        arrowGroup.position.set(0, 0, -offset);
        arrowGroup.rotation.set(0, Math.PI, isPrime ? 0 : Math.PI);
        break;
      case 'R':
        arrowGroup.position.set(offset, 0, 0);
        arrowGroup.rotation.set(0, Math.PI / 2, isPrime ? Math.PI : 0);
        break;
      case 'L':
        arrowGroup.position.set(-offset, 0, 0);
        arrowGroup.rotation.set(0, -Math.PI / 2, isPrime ? 0 : Math.PI);
        break;
    }

    if (isDouble) {
      arrowGroup.scale.set(1.2, 1.2, 1.2);
    }

    arrowGroupRef.current.add(arrowGroup);
  };

  const smoothMoveCamera = (targetPos: THREE.Vector3, duration: number = 400) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const startPos = cameraRef.current.position.clone();
    const startTime = performance.now();

    const animateCam = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      cameraRef.current?.position.lerpVectors(startPos, targetPos, ease);
      controlsRef.current?.target.set(0, 0, 0);
      controlsRef.current?.update();

      if (t < 1) {
        requestAnimationFrame(animateCam);
      }
    };
    requestAnimationFrame(animateCam);
  };

  const focusFace = (face: Face) => {
    let target = new THREE.Vector3(4.5, 4.2, 5.5);
    switch (face) {
      case 'R':
        target.set(5.5, 1.5, 0.5);
        break;
      case 'L':
        target.set(-5.5, 1.5, 0.5);
        break;
      case 'F':
        target.set(0.5, 1.5, 5.5);
        break;
      case 'B':
        target.set(0.5, 1.5, -5.5);
        break;
      case 'U':
        target.set(0.2, 5.8, 1.2);
        break;
      case 'D':
        target.set(0.2, -5.8, 1.2);
        break;
    }
    smoothMoveCamera(target, 450);
  };

  const performMoveAnimation = (move: string, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      if (!sceneRef.current || !cubeGroupRef.current) {
        resolve();
        return;
      }

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

      let axis = new THREE.Vector3(0, 1, 0);
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

      if (isDouble) {
        targetAngle *= 2;
      }

      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const currentAngle = targetAngle * ease;
        pivot.setRotationFromAxisAngle(axis, currentAngle);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Finish rotation
          pivot.setRotationFromAxisAngle(axis, targetAngle);
          pivot.updateMatrixWorld();

          // Detach cubies back to cubeGroup
          targetCubies.forEach((cubie) => {
            cubeGroupRef.current?.attach(cubie);
          });
          cubeGroupRef.current?.remove(pivot);

          // Reset all 27 cubies to identity coordinate grid
          resetCubieTransforms();

          soundManager.playClick();
          setIsRotating(false);
          if (onAnimationEnd) onAnimationEnd();
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  };

  useImperativeHandle(ref, () => ({
    animateMove: (move: string, speedMultiplier: number = 1.0) => {
      const dur = Math.max(120, animationSpeed / speedMultiplier);
      return performMoveAnimation(move, dur);
    },
    resetCamera: () => {
      smoothMoveCamera(new THREE.Vector3(4.5, 4.2, 5.5));
    },
    focusFace: (face: Face) => {
      focusFace(face);
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

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.5, 4.2, 5.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 12;
    controls.rotateSpeed = 0.8;
    controls.enablePan = false;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.9);
    dirLight1.position.set(8, 12, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight2.position.set(-8, -6, -8);
    scene.add(dirLight2);

    const cubeGroup = new THREE.Group();
    cubeGroupRef.current = cubeGroup;
    scene.add(cubeGroup);

    const arrowGroup = new THREE.Group();
    arrowGroupRef.current = arrowGroup;
    scene.add(arrowGroup);

    // Floating Face Markers
    const faceLabelsGroup = new THREE.Group();
    const createFaceSprite = (text: string, x: number, y: number, z: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(64, 64, 48, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 54px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 64);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.set(x, y, z);
      sprite.scale.set(0.7, 0.7, 0.7);
      sprite.renderOrder = 997;
      return sprite;
    };

    faceLabelsGroup.add(createFaceSprite('U', 0, 2.15, 0));
    faceLabelsGroup.add(createFaceSprite('D', 0, -2.15, 0));
    faceLabelsGroup.add(createFaceSprite('F', 0, 0, 2.15));
    faceLabelsGroup.add(createFaceSprite('B', 0, 0, -2.15));
    faceLabelsGroup.add(createFaceSprite('R', 2.15, 0, 0));
    faceLabelsGroup.add(createFaceSprite('L', -2.15, 0, 0));
    scene.add(faceLabelsGroup);

    // 27 Cubies
    const cubies: THREE.Mesh[] = [];
    const cubieSize = 0.94;
    const geom = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const materials = [
            new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR, roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR, roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR, roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR, roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR, roughness: 0.3, metalness: 0.1 }),
            new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR, roughness: 0.3, metalness: 0.1 }),
          ];

          const mesh = new THREE.Mesh(geom, materials);
          mesh.position.set(x, y, z);
          mesh.userData = { gx: x, gy: y, gz: z };
          cubeGroup.add(mesh);
          cubies.push(mesh);
        }
      }
    }
    cubiesRef.current = cubies;

    // Render loop
    let animationFrameId: number;
    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geom.dispose();
    };
  }, []);

  // Raycasting for interactive 3D sticker clicks
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interactivePainting || !onStickerClick || !containerRef.current || !cameraRef.current) return;

    const dx = Math.abs(e.clientX - pointerDownPos.current.x);
    const dy = Math.abs(e.clientY - pointerDownPos.current.y);
    if (dx > 6 || dy > 6) return; // User dragged to orbit camera, not a tap

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);
    const intersects = raycaster.intersectObjects(cubiesRef.current, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const normal = hit.face?.normal;
      const cubie = hit.object as THREE.Mesh;
      const u = cubie.userData;
      if (!normal || !u) return;

      // Transform normal to world space
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
        if (stickerIdx !== -1 && stickerIdx !== 4) { // Don't allow changing fixed center
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
          onClick={() => smoothMoveCamera(new THREE.Vector3(4.5, 4.2, 5.5))}
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

      {/* HIGH-VISIBILITY MOVE COMPASS BANNER (Overhaul: Always Prominent, Clear & Never Hidden) */}
      {totalSteps > 0 && (
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-4 sm:right-4 z-20 pointer-events-auto">
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
