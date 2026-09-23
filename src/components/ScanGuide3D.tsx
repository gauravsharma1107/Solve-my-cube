import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Face } from '../solver/cubeTypes';

interface ScanGuide3DProps {
  currentStep: number;
  prevStep: number;
  isAnimating: boolean;
  onAnimationComplete?: () => void;
  size?: number;
  interactive?: boolean;
}

// Target rotations for each scan face (F, R, B, L, U, D)
// Standard Rubik's arrangement:
// F: Green (+Z), U: White (+Y), R: Red (+X), L: Orange (-X), D: Yellow (-Y), B: Blue (-Z)
export const STEP_TARGET_EULERS: THREE.Euler[] = [
  // 0: F (Green facing, White top)
  new THREE.Euler(0, 0, 0, 'YXZ'),
  // 1: R (Red facing, White top) -> Yaw LEFT by 90° (-PI/2 around Y)
  new THREE.Euler(0, -Math.PI / 2, 0, 'YXZ'),
  // 2: B (Blue facing, White top) -> Yaw LEFT by 180° (-PI around Y)
  new THREE.Euler(0, -Math.PI, 0, 'YXZ'),
  // 3: L (Orange facing, White top) -> Yaw LEFT by 270° (-3PI/2 around Y)
  new THREE.Euler(0, -Math.PI * 1.5, 0, 'YXZ'),
  // 4: U (White facing, Green bottom, Blue top) -> Pitch DOWN 90° (+PI/2 around X)
  new THREE.Euler(Math.PI / 2, 0, 0, 'YXZ'),
  // 5: D (Yellow facing, Green top, Blue bottom) -> Pitch UP 90° (-PI/2 around X, or 180° from White)
  new THREE.Euler(-Math.PI / 2, 0, 0, 'YXZ'),
];

export const STEP_INSTRUCTIONS = [
  {
    step: 0,
    face: 'F' as Face,
    turnAction: 'Starting Position',
    mainText: 'Hold GREEN Facing Camera',
    subText: 'Keep WHITE on top • GREEN facing camera • RED on right side',
    arrowDirection: 'none' as const,
  },
  {
    step: 1,
    face: 'R' as Face,
    turnAction: 'Turn 90° to the LEFT',
    mainText: 'Rotate Cube 90° LEFT',
    subText: 'Keep WHITE on top • GREEN moves to left • RED is now in front',
    arrowDirection: 'left' as const,
  },
  {
    step: 2,
    face: 'B' as Face,
    turnAction: 'Turn 90° to the LEFT again',
    mainText: 'Rotate Cube 90° LEFT',
    subText: 'Keep WHITE on top • RED moves to left • BLUE is now in front',
    arrowDirection: 'left' as const,
  },
  {
    step: 3,
    face: 'L' as Face,
    turnAction: 'Turn 90° to the LEFT again',
    mainText: 'Rotate Cube 90° LEFT',
    subText: 'Keep WHITE on top • BLUE moves to left • ORANGE is now in front',
    arrowDirection: 'left' as const,
  },
  {
    step: 4,
    face: 'U' as Face,
    turnAction: 'Turn to Green & Tilt DOWN',
    mainText: 'Tilt Cube 90° DOWN Toward You',
    subText: 'Turn back to GREEN in front, then tilt DOWN • WHITE faces camera',
    arrowDirection: 'down' as const,
  },
  {
    step: 5,
    face: 'D' as Face,
    turnAction: 'Flip 180° UP Away from You',
    mainText: 'Flip Cube 180° UP',
    subText: 'Flip cube UP • YELLOW faces camera • GREEN is at top edge',
    arrowDirection: 'up' as const,
  },
];

// Easing function: smooth cubic ease-in-out
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const ScanGuide3D: React.FC<ScanGuide3DProps> = ({
  currentStep,
  prevStep,
  isAnimating,
  onAnimationComplete,
  size = 260,
  interactive = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubeGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number | null>(null);

  // Keep latest props in refs for animation loop
  const currentStepRef = useRef(currentStep);
  const prevStepRef = useRef(prevStep);
  const isAnimatingRef = useRef(isAnimating);
  const onCompleteRef = useRef(onAnimationComplete);

  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { prevStepRef.current = prevStep; }, [prevStep]);
  useEffect(() => { isAnimatingRef.current = isAnimating; }, [isAnimating]);
  useEffect(() => { onCompleteRef.current = onAnimationComplete; }, [onAnimationComplete]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Clean any prior children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const width = size;
    const height = size;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera: slightly tilted from above (+Y=1.2, +Z=5.6) so top face & 3D volume are visible
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(0, 1.2, 5.6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and transparent background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights: authentic plastic appearance
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight1.position.set(4, 6, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dirLight2.position.set(-4, -3, -3);
    scene.add(dirLight2);

    // 5. Materials
    const blackPlastic = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.65,
      metalness: 0.1,
    });

    // Real Rubik's vinyl sticker colors
    const STICKER_COLORS = {
      W: 0xffffff, // White  (Top)
      Y: 0xffd500, // Yellow (Bottom)
      G: 0x009b48, // Green  (Front)
      B: 0x0046ad, // Blue   (Back)
      R: 0xb71234, // Red    (Right)
      O: 0xff5800, // Orange (Left)
    };

    const stickerMaterials: Record<keyof typeof STICKER_COLORS, THREE.MeshStandardMaterial> = {
      W: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.W, roughness: 0.3, metalness: 0.05 }),
      Y: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.Y, roughness: 0.3, metalness: 0.05 }),
      G: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.G, roughness: 0.3, metalness: 0.05 }),
      B: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.B, roughness: 0.3, metalness: 0.05 }),
      R: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.R, roughness: 0.3, metalness: 0.05 }),
      O: new THREE.MeshStandardMaterial({ color: STICKER_COLORS.O, roughness: 0.3, metalness: 0.05 }),
    };

    // 6. Build the 3D Rubik's Cube with 27 cubies and beveled stickers
    const cubeGroup = new THREE.Group();
    cubeGroupRef.current = cubeGroup;
    scene.add(cubeGroup);

    const cubieSize = 0.94;
    const stickerSize = 0.82;
    const cubieGeo = new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize);
    const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);

    const halfDist = cubieSize / 2 + 0.005; // sticker offset just outside cubie

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubie = new THREE.Mesh(cubieGeo, blackPlastic);
          cubie.position.set(x, y, z);
          cubeGroup.add(cubie);

          // Stickers on outer faces
          // +X: Right (Red)
          if (x === 1) {
            const sticker = new THREE.Mesh(stickerGeo, stickerMaterials.R);
            sticker.position.set(x + halfDist, y, z);
            sticker.rotation.y = Math.PI / 2;
            cubeGroup.add(sticker);
          }
          // -X: Left (Orange)
          if (x === -1) {
            const sticker = new THREE.Mesh(stickerGeo, stickerMaterials.O);
            sticker.position.set(x - halfDist, y, z);
            sticker.rotation.y = -Math.PI / 2;
            cubeGroup.add(sticker);
          }
          // +Y: Top (White)
          if (y === 1) {
            const sticker = new THREE.Mesh(stickerGeo, stickerMaterials.W);
            sticker.position.set(x, y + halfDist, z);
            sticker.rotation.x = -Math.PI / 2;
            cubeGroup.add(sticker);
          }
          // -Y: Bottom (Yellow)
          if (y === -1) {
            const sticker = new THREE.Mesh(stickerGeo, stickerMaterials.Y);
            sticker.position.set(x, y - halfDist, z);
            sticker.rotation.x = Math.PI / 2;
            cubeGroup.add(sticker);
          }
          // +Z: Front (Green)
          if (z === 1) {
            const sticker = new THREE.Mesh(stickerGeo, stickerMaterials.G);
            sticker.position.set(x, y, z + halfDist);
            cubeGroup.add(sticker);
          }
          // -Z: Back (Blue)
          if (z === -1) {
            const sticker = new THREE.Mesh(stickerGeo, stickerMaterials.B);
            sticker.position.set(x, y, z - halfDist);
            sticker.rotation.y = Math.PI;
            cubeGroup.add(sticker);
          }
        }
      }
    }

    // Set initial rotation
    const initEuler = STEP_TARGET_EULERS[currentStep] || STEP_TARGET_EULERS[0];
    cubeGroup.rotation.copy(initEuler);

    // Optional interactive drag rotation
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (!interactive) return;
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging || !interactive) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      cubeGroup.rotation.y += dx * 0.01;
      cubeGroup.rotation.x += dy * 0.01;
      renderer.render(scene, camera);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    if (interactive) {
      container.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    // Render static frame
    renderer.render(scene, camera);

    // Cleanup
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (interactive) {
        container.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
      renderer.dispose();
      cubieGeo.dispose();
      stickerGeo.dispose();
      blackPlastic.dispose();
      Object.values(stickerMaterials).forEach(m => m.dispose());
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      cubeGroupRef.current = null;
    };
  }, [size, interactive]);

  // Run the smooth 3D rotation animation whenever isAnimating is true or step changes
  useEffect(() => {
    const cubeGroup = cubeGroupRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    if (!cubeGroup || !scene || !camera || !renderer) return;

    if (!isAnimating) {
      // Snap to target orientation when not animating
      const targetEuler = STEP_TARGET_EULERS[currentStep] || STEP_TARGET_EULERS[0];
      cubeGroup.quaternion.setFromEuler(targetEuler);
      renderer.render(scene, camera);
      return;
    }

    // Animate smoothly from prevStep to currentStep
    const DURATION = 2000; // 2.0s for clear, slow, followable movement
    animStartTimeRef.current = performance.now();

    // Step 4 (Top/White) has a 2-stage animation:
    // First turn from Orange (step 3) to Green (step 0), then tilt down to White!
    const isStep4Transition = currentStep === 4;

    const fromEuler = STEP_TARGET_EULERS[prevStep] || STEP_TARGET_EULERS[0];
    const toEuler = STEP_TARGET_EULERS[currentStep] || STEP_TARGET_EULERS[0];

    const qStart = new THREE.Quaternion().setFromEuler(fromEuler);
    const qGreen = new THREE.Quaternion().setFromEuler(STEP_TARGET_EULERS[0]);
    const qEnd = new THREE.Quaternion().setFromEuler(toEuler);

    const animateLoop = (time: number) => {
      const start = animStartTimeRef.current || time;
      const elapsed = time - start;
      const progress = Math.min(elapsed / DURATION, 1);

      if (isStep4Transition) {
        // Two stages for step 4:
        // Stage 1 (0 to 0.38): turn to Green
        // Stage 2 (0.38 to 1.0): tilt down to White
        if (progress < 0.38) {
          const subT = easeInOutCubic(progress / 0.38);
          cubeGroup.quaternion.copy(qStart).slerp(qGreen, subT);
        } else {
          const subT = easeInOutCubic((progress - 0.38) / 0.62);
          cubeGroup.quaternion.copy(qGreen).slerp(qEnd, subT);
        }
      } else {
        // Standard single-axis turn via direct quaternion slerp
        const easedProgress = easeInOutCubic(progress);
        cubeGroup.quaternion.copy(qStart).slerp(qEnd, easedProgress);
      }

      // Re-render each frame
      renderer.render(scene, camera);

      if (progress < 1) {
        animFrameIdRef.current = requestAnimationFrame(animateLoop);
      } else {
        // Settle at exact end orientation
        cubeGroup.quaternion.copy(qEnd);
        renderer.render(scene, camera);
        if (onCompleteRef.current) {
          onCompleteRef.current();
        }
      }
    };

    animFrameIdRef.current = requestAnimationFrame(animateLoop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [currentStep, prevStep, isAnimating]);

  return (
    <div
      ref={mountRef}
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    />
  );
};
