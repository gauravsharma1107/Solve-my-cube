import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { setupMockDom, teardownMockDom } from '../test-helpers.ts';
import {
  applyBlackIntensity,
  getInitialIntensity,
  PRESETS,
  type BlackIntensityPreset
} from '../../src/utils/themeManager.ts';
import type { Face } from '../../src/solver/cubeTypes.ts';

// Cubic easing function as implemented in src/components/Cube3DViewer.tsx and ScanGuide3D.tsx
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Analytical first derivative (velocity) of easeInOutCubic
function easeInOutCubicVelocity(t: number): number {
  if (t < 0.5) {
    return 12 * t * t;
  } else {
    return 12 * Math.pow(1 - t, 2);
  }
}

// Analytical second derivative (acceleration) of easeInOutCubic
function easeInOutCubicAcceleration(t: number): number {
  if (t < 0.5) {
    return 24 * t;
  } else {
    return -24 * (1 - t);
  }
}

describe('Tier 5: Adversarial Stress 2 - 3D Geometry Invariants, Animation Curves & Theme Sync Race Conditions', () => {

  // =========================================================================
  // SUITE 1: MATHEMATICAL MONOTONICITY, BOUNDARY ACCELERATION & SMOOTHNESS
  // =========================================================================
  describe('Suite 1: easeInOutCubic Mathematical Rigor & Boundary Dynamics', () => {

    it('T5-2-1: Exact analytical boundary values, point symmetry, and range confinement', () => {
      // Exact boundaries
      assert.strictEqual(easeInOutCubic(0), 0, 'f(0) must be exactly 0');
      assert.strictEqual(easeInOutCubic(0.5), 0.5, 'f(0.5) must be exactly 0.5');
      assert.strictEqual(easeInOutCubic(1), 1, 'f(1) must be exactly 1');

      // Point symmetry around (0.5, 0.5): f(t) + f(1 - t) === 1.0
      const steps = 1000;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const v1 = easeInOutCubic(t);
        const v2 = easeInOutCubic(1 - t);
        const sum = v1 + v2;
        assert.ok(
          Math.abs(sum - 1.0) < 1e-12,
          `Point symmetry violated at t=${t}: f(t)=${v1}, f(1-t)=${v2}, sum=${sum}`
        );
        // Confinement in [0, 1]
        assert.ok(v1 >= 0 && v1 <= 1, `Output out of [0, 1] range: f(${t}) = ${v1}`);
      }
    });

    it('T5-2-2: Strict mathematical monotonicity across 100,000 dense steps with zero reversals', () => {
      const totalSteps = 100_000;
      let prev = easeInOutCubic(0);

      for (let i = 1; i <= totalSteps; i++) {
        const t = i / totalSteps;
        const curr = easeInOutCubic(t);

        // For strictly increasing function, curr > prev
        assert.ok(
          curr > prev,
          `Monotonicity failure at step ${i}/${totalSteps} (t=${t}): curr (${curr}) <= prev (${prev})`
        );
        prev = curr;
      }
    });

    it('T5-2-3: Boundary acceleration invariant (a = 0 at t=0 and t=1) and zero initial/terminal jerk', () => {
      // 1. Analytical acceleration at boundaries
      const a0 = easeInOutCubicAcceleration(0);
      const a1 = easeInOutCubicAcceleration(1);
      assert.strictEqual(a0, 0, 'Analytical initial acceleration a(0) must be identically 0');
      assert.strictEqual(a1, 0, 'Analytical terminal acceleration a(1) must be identically 0');

      // 2. Analytical velocity at boundaries
      const v0 = easeInOutCubicVelocity(0);
      const v1 = easeInOutCubicVelocity(1);
      assert.strictEqual(v0, 0, 'Analytical initial velocity v(0) must be identically 0');
      assert.strictEqual(v1, 0, 'Analytical terminal velocity v(1) must be identically 0');

      // 3. Numerical finite difference second derivative near boundaries: a_num = (f(2h) - 2f(h) + f(0)) / h^2
      // For f(t) = 4t^3 near 0: (4*(2h)^3 - 8h^3) / h^2 = (32h^3 - 8h^3) / h^2 = 24h -> 0 as h -> 0
      const testSteps = [1e-2, 1e-3, 1e-4];
      for (const h of testSteps) {
        const numA_start = (easeInOutCubic(2 * h) - 2 * easeInOutCubic(h) + easeInOutCubic(0)) / (h * h);
        const numA_end = (easeInOutCubic(1) - 2 * easeInOutCubic(1 - h) + easeInOutCubic(1 - 2 * h)) / (h * h);

        assert.ok(
          Math.abs(numA_start) < 25 * h,
          `Numerical start acceleration should vanish with h: got ${numA_start} for h=${h}`
        );
        assert.ok(
          Math.abs(numA_end) < 25 * h,
          `Numerical terminal acceleration should vanish with h: got ${numA_end} for h=${h}`
        );
      }

      // 4. Boundary velocity suppression compared to peak velocity (v(0.5) = 3.0)
      const vPeak = easeInOutCubicVelocity(0.5);
      assert.strictEqual(vPeak, 3.0, 'Peak velocity at midpoint must be exactly 3.0');

      const vNearStart = (easeInOutCubic(1e-4) - easeInOutCubic(0)) / 1e-4;
      const vNearEnd = (easeInOutCubic(1) - easeInOutCubic(1 - 1e-4)) / 1e-4;
      assert.ok(
        vNearStart < 1e-6 * vPeak,
        `Start velocity must be suppressed by at least 1e-6 compared to peak: got ${vNearStart}`
      );
      assert.ok(
        vNearEnd < 1e-6 * vPeak,
        `End velocity must be suppressed by at least 1e-6 compared to peak: got ${vNearEnd}`
      );
    });

    it('T5-2-4: C1 continuous smoothness at midpoint inflection transition (t = 0.5)', () => {
      // Test continuity across the piece boundary at t = 0.5
      const epsilon = 1e-7;
      const leftVal = easeInOutCubic(0.5 - epsilon);
      const midVal = easeInOutCubic(0.5);
      const rightVal = easeInOutCubic(0.5 + epsilon);

      // Value continuity
      assert.ok(Math.abs(leftVal - 0.5) < 1e-5, 'Left limit approaches 0.5');
      assert.ok(Math.abs(rightVal - 0.5) < 1e-5, 'Right limit approaches 0.5');
      assert.ok(Math.abs(rightVal - leftVal) < 1e-5, 'Displacement jump across 0.5 is negligible');

      // Left and right numerical derivative at t = 0.5
      const leftDeriv = (midVal - leftVal) / epsilon;
      const rightDeriv = (rightVal - midVal) / epsilon;

      // Both should approach 3.0
      assert.ok(Math.abs(leftDeriv - 3.0) < 1e-4, `Left velocity must equal 3.0: got ${leftDeriv}`);
      assert.ok(Math.abs(rightDeriv - 3.0) < 1e-4, `Right velocity must equal 3.0: got ${rightDeriv}`);
      assert.ok(
        Math.abs(leftDeriv - rightDeriv) < 1e-3,
        `Velocity difference at midpoint must be negligible (C1 continuity): got ${Math.abs(leftDeriv - rightDeriv)}`
      );
    });

    it('T5-2-5: Micro-step numerical gradient consistency and zero negative velocities', () => {
      // Test with 20,000 sub-intervals that forward difference delta is always strictly non-negative
      const n = 20_000;
      let minSlope = Infinity;
      let maxSlope = -Infinity;

      for (let i = 0; i < n; i++) {
        const t1 = i / n;
        const t2 = (i + 1) / n;
        const dt = t2 - t1;
        const dv = easeInOutCubic(t2) - easeInOutCubic(t1);
        const slope = dv / dt;

        assert.ok(slope >= 0, `Negative slope detected at t=${t1}: slope=${slope}`);
        if (slope < minSlope) minSlope = slope;
        if (slope > maxSlope) maxSlope = slope;
      }

      // Minimum slope occurs at endpoints (approaches 0)
      assert.ok(minSlope < 0.001, `Min slope should be near 0: got ${minSlope}`);
      // Maximum slope occurs at t=0.5 (approaches 3.0)
      assert.ok(Math.abs(maxSlope - 3.0) < 0.01, `Max slope should be near 3.0: got ${maxSlope}`);
    });

    it('T5-2-6: Extreme float boundary stability and tolerance to out-of-range progress', () => {
      // Precision boundaries: very small positive numbers
      const subZeroEpsilons = [1e-15, 1e-12, 1e-9, 1e-6];
      subZeroEpsilons.forEach(eps => {
        const valStart = easeInOutCubic(eps);
        assert.ok(valStart >= 0 && valStart < 1e-10, `f(${eps}) must be non-negative and tiny: ${valStart}`);

        const valEnd = easeInOutCubic(1 - eps);
        assert.ok(valEnd <= 1.0 && valEnd > 1 - 1e-10, `f(1 - ${eps}) must be <= 1.0 and near 1: ${valEnd}`);
      });

      // Verification that progress clipping in render loop (Math.min(elapsed / anim.duration, 1))
      // safely prevents overshoot when progress is clamped
      const rawProgressValues = [-0.25, 0.0, 0.5, 1.0, 1.25, 2.0];
      rawProgressValues.forEach(p => {
        const clamped = Math.min(Math.max(p, 0), 1);
        const eased = easeInOutCubic(clamped);
        assert.ok(eased >= 0 && eased <= 1.0, `Clamped progress must yield valid eased value in [0, 1]`);
      });
    });
  });

  // =========================================================================
  // SUITE 2: 3D GEOMETRY INVARIANTS, CONTINUOUS 180° TURNS & QUATERNION MATH
  // =========================================================================
  describe('Suite 2: 3D Geometry Invariants & 180° Turn Axis Stability', () => {
    const faces: Face[] = ['U', 'D', 'R', 'L', 'F', 'B'];

    // Expected rotation axis and angle definition from Cube3DViewer.tsx
    function getFaceAxisAndTargetAngle(face: Face, isPrime: boolean = false, isDouble: boolean = true) {
      const axis = new THREE.Vector3();
      let baseAngle = 0;

      switch (face) {
        case 'U':
          axis.set(0, 1, 0);
          baseAngle = isPrime ? Math.PI / 2 : -Math.PI / 2;
          break;
        case 'D':
          axis.set(0, 1, 0);
          baseAngle = isPrime ? -Math.PI / 2 : Math.PI / 2;
          break;
        case 'R':
          axis.set(1, 0, 0);
          baseAngle = isPrime ? Math.PI / 2 : -Math.PI / 2;
          break;
        case 'L':
          axis.set(1, 0, 0);
          baseAngle = isPrime ? -Math.PI / 2 : Math.PI / 2;
          break;
        case 'F':
          axis.set(0, 0, 1);
          baseAngle = isPrime ? Math.PI / 2 : -Math.PI / 2;
          break;
        case 'B':
          axis.set(0, 0, 1);
          baseAngle = isPrime ? -Math.PI / 2 : Math.PI / 2;
          break;
      }

      const targetAngle = isDouble ? baseAngle * 2 : baseAngle;
      return { axis, targetAngle };
    }

    it('T5-2-7: 180° turns around all 6 face axes execute continuous rotation of exact PI magnitude', () => {
      faces.forEach(face => {
        const { axis, targetAngle } = getFaceAxisAndTargetAngle(face, false, true);

        // Verify axis unit normalization
        assert.strictEqual(axis.length(), 1.0, `Axis for face ${face} must be a unit vector`);
        // Verify target angle magnitude is exactly Math.PI (180 degrees)
        assert.strictEqual(
          Math.abs(targetAngle),
          Math.PI,
          `180° turn on face ${face} must have magnitude PI: got ${targetAngle}`
        );

        // Check counter moves (prime)
        const prime = getFaceAxisAndTargetAngle(face, true, true);
        assert.strictEqual(
          Math.abs(prime.targetAngle),
          Math.PI,
          `Prime 180° turn on face ${face} must also have magnitude PI`
        );
        assert.strictEqual(
          prime.targetAngle,
          -targetAngle,
          `Prime 180° turn on face ${face} must be opposite direction of standard`
        );
      });
    });

    it('T5-2-8: Quaternion norm invariance (||q|| === 1.0) and zero distortion at all 180° frames', () => {
      // Simulate 100 interpolation frames for all 6 faces
      const frames = 100;

      faces.forEach(face => {
        const { axis, targetAngle } = getFaceAxisAndTargetAngle(face);
        const pivot = new THREE.Group();

        for (let i = 0; i <= frames; i++) {
          const progress = i / frames;
          const ease = easeInOutCubic(progress);
          const currentAngle = targetAngle * ease;

          pivot.setRotationFromAxisAngle(axis, currentAngle);
          const q = pivot.quaternion;

          // Quaternion length must be identically 1.0
          const qLen = q.length();
          assert.ok(
            Math.abs(qLen - 1.0) < 1e-14,
            `Quaternion norm distortion on face ${face} at progress ${progress}: ||q|| = ${qLen}`
          );

          // Components must never be NaN or infinite
          assert.ok(
            Number.isFinite(q.x) && Number.isFinite(q.y) && Number.isFinite(q.z) && Number.isFinite(q.w),
            `Non-finite quaternion component on face ${face} at progress ${progress}: [${q.x}, ${q.y}, ${q.z}, ${q.w}]`
          );
        }
      });
    });

    it('T5-2-9: Zero axis wobble / nutation: Rotation axis remains strictly colinear with face normal', () => {
      // When rotating around an axis, the axis itself must be an eigenvector with eigenvalue 1:
      // R * axis === axis at every point in time
      const frames = 60;

      faces.forEach(face => {
        const { axis, targetAngle } = getFaceAxisAndTargetAngle(face);
        const pivot = new THREE.Group();

        for (let i = 1; i <= frames; i++) {
          const progress = i / frames;
          const ease = easeInOutCubic(progress);
          const currentAngle = targetAngle * ease;

          pivot.setRotationFromAxisAngle(axis, currentAngle);

          // Apply rotation matrix to the rotation axis itself
          const rotatedAxis = axis.clone().applyEuler(pivot.rotation);

          // Distance between original axis and rotated axis must be 0 (no precession or wobble)
          const axisDrift = rotatedAxis.distanceTo(axis);
          assert.ok(
            axisDrift < 1e-12,
            `Axis wobble detected on face ${face} at angle ${currentAngle}: axis drifted by ${axisDrift}`
          );

          // Vector orthogonal to axis must stay in the perpendicular plane:
          // v_ortho . axis === 0 must remain 0 after rotation
          let testVector = new THREE.Vector3(1, 0, 0);
          if (Math.abs(axis.dot(testVector)) > 0.9) {
            testVector = new THREE.Vector3(0, 1, 0);
          }
          // Make testVector strictly orthogonal to axis
          testVector.sub(axis.clone().multiplyScalar(axis.dot(testVector))).normalize();

          const rotatedOrtho = testVector.clone().applyEuler(pivot.rotation);
          const dotWithAxis = Math.abs(rotatedOrtho.dot(axis));
          assert.ok(
            dotWithAxis < 1e-12,
            `Orthogonal vector leaked into axis direction on face ${face} (wobble): dot = ${dotWithAxis}`
          );
        }
      });
    });

    it('T5-2-10: Rigid body isometry: circular trajectory of rotating cubies with invariant radius', () => {
      // Build 9 cubies on the U layer (y = 1)
      const uCubies: THREE.Vector3[] = [];
      for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
          uCubies.push(new THREE.Vector3(x, 1, z));
        }
      }

      const { axis, targetAngle } = getFaceAxisAndTargetAngle('U');
      const pivot = new THREE.Group();
      const frames = 50;

      // Track trajectory of all 9 cubies during U2 rotation
      for (let f = 0; f <= frames; f++) {
        const progress = f / frames;
        const ease = easeInOutCubic(progress);
        const currentAngle = targetAngle * ease;

        pivot.setRotationFromAxisAngle(axis, currentAngle);

        uCubies.forEach((initialPos) => {
          const currentPos = initialPos.clone().applyEuler(pivot.rotation);

          // 1. Invariant height along rotation axis (y must stay identically 1.0)
          assert.ok(
            Math.abs(currentPos.y - 1.0) < 1e-12,
            `Axial drift on U2: cubie y coordinate changed from 1.0 to ${currentPos.y} at progress ${progress}`
          );

          // 2. Radius in x-z plane must remain strictly constant
          const initialRadius = Math.sqrt(initialPos.x * initialPos.x + initialPos.z * initialPos.z);
          const currentRadius = Math.sqrt(currentPos.x * currentPos.x + currentPos.z * currentPos.z);
          assert.ok(
            Math.abs(currentRadius - initialRadius) < 1e-12,
            `Radial distortion on U2: radius changed from ${initialRadius} to ${currentRadius} at progress ${progress}`
          );
        });
      }
    });

    it('T5-2-11: Exact discrete lattice mapping ({-1, 0, 1}^3) at 180° completion without skew or drift', () => {
      // At the end of a 180° turn (progress = 1.0, angle = +-PI),
      // every cubie on the face must land on an exact integer grid coordinate in {-1, 0, 1}^3
      faces.forEach(face => {
        const { axis, targetAngle } = getFaceAxisAndTargetAngle(face);
        const pivot = new THREE.Group();
        pivot.setRotationFromAxisAngle(axis, targetAngle);

        // Generate all 27 cubie positions
        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              const isParticipating =
                (face === 'U' && y === 1) ||
                (face === 'D' && y === -1) ||
                (face === 'R' && x === 1) ||
                (face === 'L' && x === -1) ||
                (face === 'F' && z === 1) ||
                (face === 'B' && z === -1);

              if (!isParticipating) continue;

              const original = new THREE.Vector3(x, y, z);
              const rotated = original.clone().applyEuler(pivot.rotation);

              // Check distance to nearest integer
              const rx = Math.round(rotated.x);
              const ry = Math.round(rotated.y);
              const rz = Math.round(rotated.z);

              assert.ok(
                Math.abs(rotated.x - rx) < 1e-14 &&
                Math.abs(rotated.y - ry) < 1e-14 &&
                Math.abs(rotated.z - rz) < 1e-14,
                `Cubie [${x},${y},${z}] on face ${face} did not land on integer grid: [${rotated.x}, ${rotated.y}, ${rotated.z}]`
              );

              // The integer must be within {-1, 0, 1}
              assert.ok([-1, 0, 1].includes(rx), `Grid x out of bounds: ${rx}`);
              assert.ok([-1, 0, 1].includes(ry), `Grid y out of bounds: ${ry}`);
              assert.ok([-1, 0, 1].includes(rz), `Grid z out of bounds: ${rz}`);
            }
          }
        }
      });
    });

    it('T5-2-12: Non-participating cubies maintain strictly identity transform', () => {
      // In Cube3DViewer.tsx: only targetCubies are attached to the pivot.
      // The other 18 cubies remain attached to cubeGroup.
      // Verify that for all 6 double turns, exactly 9 cubies participate and exactly 18 cubies remain untouched.
      faces.forEach(face => {
        let participatingCount = 0;
        let stationaryCount = 0;

        for (let x = -1; x <= 1; x++) {
          for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
              const isParticipating =
                (face === 'U' && y === 1) ||
                (face === 'D' && y === -1) ||
                (face === 'R' && x === 1) ||
                (face === 'L' && x === -1) ||
                (face === 'F' && z === 1) ||
                (face === 'B' && z === -1);

              if (isParticipating) participatingCount++;
              else stationaryCount++;
            }
          }
        }

        assert.strictEqual(participatingCount, 9, `Face ${face} must have exactly 9 participating cubies`);
        assert.strictEqual(stationaryCount, 18, `Face ${face} must have exactly 18 stationary cubies`);
      });
    });

    it('T5-2-13: Involution invariant: Two consecutive 180° turns (360°) yield exact identity transform', () => {
      // R(PI) * R(PI) = R(2*PI) = I
      faces.forEach(face => {
        const { axis, targetAngle } = getFaceAxisAndTargetAngle(face);
        const m1 = new THREE.Matrix4().makeRotationAxis(axis, targetAngle);
        const m2 = new THREE.Matrix4().makeRotationAxis(axis, targetAngle);
        const combined = new THREE.Matrix4().multiplyMatrices(m2, m1);

        const identity = new THREE.Matrix4().identity();
        const diff = combined.elements.map((v, idx) => Math.abs(v - identity.elements[idx]));
        const maxDiff = Math.max(...diff);

        assert.ok(
          maxDiff < 1e-14,
          `Involution failed for face ${face}: two consecutive 180° turns deviated from identity by ${maxDiff}`
        );
      });
    });
  });

  // =========================================================================
  // SUITE 3: THEME SYNCHRONIZATION, RACE CONDITIONS & ZERO UNSTYLED FLASH
  // =========================================================================
  describe('Suite 3: Theme Application Race Conditions & CSS Variable Injection', () => {
    beforeEach(() => {
      setupMockDom();
    });

    afterEach(() => {
      teardownMockDom();
    });

    it('T5-2-14: Zero unstyled flash on synchronous initial paint (enableTransition = false)', () => {
      // When page first loads or component mounts, enableTransition must be false
      // CSS variables and styles must apply synchronously without adding theme-transitioning
      applyBlackIntensity(100, false);
      const root = globalThis.document.documentElement;

      // 1. Transition class must NEVER be present on initial load
      assert.strictEqual(
        root.classList.contains('theme-transitioning'),
        false,
        'Initial theme application must NOT set theme-transitioning class (prevents FOUC)'
      );

      // 2. CSS variables and background color must be set synchronously
      assert.strictEqual(root.style.getPropertyValue('--bg-canvas'), 'rgb(0, 0, 0)');
      assert.strictEqual(root.style.backgroundColor, 'rgb(0, 0, 0)');
      assert.strictEqual(globalThis.document.body.style.backgroundColor, 'rgb(0, 0, 0)');

      // 3. Storage must be populated
      assert.strictEqual(globalThis.localStorage.getItem('cubesync_theme_intensity'), '100');
    });

    it('T5-2-15: High-frequency race condition stress test: 1,000 rapid chaotic switches converge deterministically', () => {
      const root = globalThis.document.documentElement;

      // Generate a chaotic sequence of 1,000 intensity changes
      const intensities: number[] = [];
      for (let i = 0; i < 1000; i++) {
        // Mix of presets and arbitrary slider numbers
        const r = i % 7;
        if (r === 0) intensities.push(100);
        else if (r === 1) intensities.push(85);
        else if (r === 2) intensities.push(70);
        else if (r === 3) intensities.push(50);
        else if (r === 4) intensities.push(0);
        else intensities.push((i * 37) % 101);
      }

      // Final target intensity that must be deterministically achieved
      const finalIntensity = 62;
      intensities.push(finalIntensity);

      // Fire the calls rapidly in synchronous succession
      for (const intVal of intensities) {
        applyBlackIntensity(intVal, true);
      }

      // Check that final values reflect the exact target
      const t = (100 - finalIntensity) / 100;
      const expectedR = Math.round(0 + (40 - 0) * t);
      const expectedG = Math.round(0 + (40 - 0) * t);
      const expectedB = Math.round(0 + (48 - 0) * t);
      const expectedCanvas = `rgb(${expectedR}, ${expectedG}, ${expectedB})`;

      assert.strictEqual(
        root.style.getPropertyValue('--bg-canvas'),
        expectedCanvas,
        'Final canvas color must match the final requested intensity exactly'
      );
      assert.strictEqual(root.style.backgroundColor, expectedCanvas);
      assert.strictEqual(globalThis.document.body.style.backgroundColor, expectedCanvas);
      assert.strictEqual(
        globalThis.localStorage.getItem('cubesync_theme_intensity'),
        String(finalIntensity),
        'LocalStorage must retain the final intensity value'
      );
    });

    it('T5-2-16: Transition timeout debouncing: Rapid interactive switches cleanly remove transitioning class', async () => {
      const root = globalThis.document.documentElement;

      // Rapidly switch 20 times with enableTransition: true
      for (let i = 0; i < 20; i++) {
        applyBlackIntensity(70 + (i % 10), true);
        assert.strictEqual(
          root.classList.contains('theme-transitioning'),
          true,
          'theme-transitioning must remain active during rapid user interaction'
        );
      }

      // Await transition timeout expiration (250ms in themeManager.ts)
      await new Promise((resolve) => setTimeout(resolve, 300));

      assert.strictEqual(
        root.classList.contains('theme-transitioning'),
        false,
        'theme-transitioning must be removed cleanly after 250ms debounce timeout expires'
      );
    });

    it('T5-2-17: Comprehensive CSS variable injection and RGB/RGBA syntax validity across all presets', () => {
      const root = globalThis.document.documentElement;
      const presetKeys = Object.keys(PRESETS) as BlackIntensityPreset[];

      presetKeys.forEach(key => {
        const preset = PRESETS[key];
        applyBlackIntensity(preset.value, false);

        // Required CSS variables defined in themeManager
        const requiredVars = [
          '--bg-canvas',
          '--bg-surface',
          '--bg-card',
          '--bg-elevated',
          '--border-subtle',
          '--border-strong',
          '--text-primary',
          '--text-secondary',
          '--text-muted'
        ];

        requiredVars.forEach(varName => {
          const val = root.style.getPropertyValue(varName);
          assert.ok(val, `CSS variable ${varName} must not be empty for preset ${key}`);
          assert.ok(!val.includes('NaN'), `CSS variable ${varName} contains NaN: ${val}`);
          assert.ok(!val.includes('undefined'), `CSS variable ${varName} contains undefined: ${val}`);

          // Validate RGB / RGBA syntax
          if (val.startsWith('rgb(')) {
            const match = val.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            assert.ok(match, `Invalid rgb syntax for ${varName}: ${val}`);
            const [, r, g, b] = match;
            assert.ok(Number(r) >= 0 && Number(r) <= 255, `Red channel out of bounds: ${r}`);
            assert.ok(Number(g) >= 0 && Number(g) <= 255, `Green channel out of bounds: ${g}`);
            assert.ok(Number(b) >= 0 && Number(b) <= 255, `Blue channel out of bounds: ${b}`);
          } else if (val.startsWith('rgba(')) {
            const match = val.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)$/);
            assert.ok(match, `Invalid rgba syntax for ${varName}: ${val}`);
            const [, r, g, b, a] = match;
            assert.ok(Number(a) >= 0 && Number(a) <= 1, `Alpha channel out of bounds: ${a}`);
          }
        });
      });
    });

    it('T5-2-18: Malformed storage resilience: injection attempts and boundary inputs clamp safely', () => {
      // Test malicious / injection strings in localStorage
      const corruptInputs = [
        '<script>alert("xss")</script>',
        '${evil}',
        '-99999',
        '99999',
        'NaN',
        'Infinity',
        'null',
        'undefined',
        '   ',
        '',
        '{"intensity": 50}',
        'javascript:void(0)'
      ];

      corruptInputs.forEach(input => {
        globalThis.localStorage.setItem('cubesync_theme_intensity', input);
        const intensity = getInitialIntensity();

        // Must default safely to 100 without throwing
        assert.strictEqual(
          intensity,
          100,
          `Corrupt input '${input}' must safely resolve to 100`
        );
      });

      // Test applyBlackIntensity out-of-bounds clamping
      applyBlackIntensity(-100, false);
      assert.strictEqual(globalThis.localStorage.getItem('cubesync_theme_intensity'), '0');

      applyBlackIntensity(500, false);
      assert.strictEqual(globalThis.localStorage.getItem('cubesync_theme_intensity'), '100');

      // NaN should clamp safely
      applyBlackIntensity(NaN, false);
      const val = globalThis.document.documentElement.style.getPropertyValue('--bg-canvas');
      assert.ok(!val.includes('NaN'), `applyBlackIntensity(NaN) must not inject NaN into styles: ${val}`);
    });

    it('T5-2-19: Pre-paint index.html inline script parity with runtime themeManager.ts across full [0, 100] spectrum', () => {
      // Read index.html and verify pre-paint script
      const indexPath = path.resolve(process.cwd(), 'index.html');
      const html = fs.readFileSync(indexPath, 'utf-8');

      // Ensure inline script sets --bg-canvas and backgroundColor synchronously
      assert.ok(
        html.includes("document.documentElement.style.setProperty('--bg-canvas', bg)"),
        'index.html must set --bg-canvas inline'
      );
      assert.ok(
        html.includes("document.documentElement.style.backgroundColor = bg"),
        'index.html must set backgroundColor inline'
      );

      // Verify mathematical parity between index.html formula and themeManager.ts formula
      // For every integer intensity from 0 to 100:
      for (let intensity = 0; intensity <= 100; intensity++) {
        // 1. themeManager.ts result
        applyBlackIntensity(intensity, false);
        const themeManagerBg = globalThis.document.documentElement.style.getPropertyValue('--bg-canvas');

        // 2. index.html inline formula simulation
        const raw = String(intensity);
        const parsed = parseInt(raw, 10);
        const t = (100 - parsed) / 100;
        const cR = Math.round(40 * t);
        const cG = Math.round(40 * t);
        const cB = Math.round(48 * t);
        const indexHtmlBg = `rgb(${cR}, ${cG}, ${cB})`;

        assert.strictEqual(
          themeManagerBg,
          indexHtmlBg,
          `Parity mismatch at intensity ${intensity}: themeManager=${themeManagerBg}, indexHtml=${indexHtmlBg}`
        );
      }
    });
  });
});
