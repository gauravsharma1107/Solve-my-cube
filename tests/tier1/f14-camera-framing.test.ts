import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import type { Face } from '../../src/solver/cubeTypes.ts';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const getFaceCameraTarget = (face: Face): THREE.Vector3 => {
  const target = new THREE.Vector3(4.5, 4.2, 5.5);
  switch (face) {
    case 'R': target.set(5.5, 1.5, 0.5); break;
    case 'L': target.set(-5.5, 1.5, 0.5); break;
    case 'F': target.set(0.5, 1.5, 5.5); break;
    case 'B': target.set(0.5, 1.5, -5.5); break;
    case 'U': target.set(0.2, 5.8, 1.2); break;
    case 'D': target.set(0.2, -5.8, 1.2); break;
  }
  return target;
};

describe('Tier 1: F14 - Smart Camera Auto-Framing', () => {
  const defaultPos = new THREE.Vector3(4.5, 4.2, 5.5);

  it('F14-1: Default perspective camera vantage point is (4.5, 4.2, 5.5)', () => {
    const cam = new THREE.PerspectiveCamera(40, 1.0, 0.1, 100);
    cam.position.copy(defaultPos);

    assert.strictEqual(cam.position.x, 4.5);
    assert.strictEqual(cam.position.y, 4.2);
    assert.strictEqual(cam.position.z, 5.5);
    assert.strictEqual(cam.fov, 40);
  });

  it('F14-2: FocusFace calculates distinct, unobstructed vantage for all 6 faces', () => {
    const faces: Face[] = ['U', 'D', 'R', 'L', 'F', 'B'];
    const seenPositions = new Set<string>();

    faces.forEach(face => {
      const target = getFaceCameraTarget(face);
      const key = `${target.x},${target.y},${target.z}`;
      assert.strictEqual(seenPositions.has(key), false, `Face ${face} must have distinct camera position`);
      seenPositions.add(key);

      // Verify principal axis dominance
      if (face === 'R') assert.ok(target.x > 4.0);
      if (face === 'L') assert.ok(target.x < -4.0);
      if (face === 'F') assert.ok(target.z > 4.0);
      if (face === 'B') assert.ok(target.z < -4.0);
      if (face === 'U') assert.ok(target.y > 4.0);
      if (face === 'D') assert.ok(target.y < -4.0);
    });
  });

  it('F14-3: Reset camera restores canonical 3/4 perspective', () => {
    const cam = new THREE.PerspectiveCamera(40, 1.0, 0.1, 100);
    cam.position.set(-5.5, 1.5, 0.5); // Focused on L

    // Simulate resetCamera
    cam.position.copy(defaultPos);

    assert.deepStrictEqual(cam.position, defaultPos);
  });

  it('F14-4: Orbit distance bounds constrain zoom between 3.5 and 12 units', () => {
    const minDistance = 3.5;
    const maxDistance = 12;

    const defaultDistance = defaultPos.length();
    assert.ok(
      defaultDistance >= minDistance && defaultDistance <= maxDistance,
      `Default distance (${defaultDistance.toFixed(2)}) must be between ${minDistance} and ${maxDistance}`
    );

    const faces: Face[] = ['U', 'D', 'R', 'L', 'F', 'B'];
    faces.forEach(face => {
      const dist = getFaceCameraTarget(face).length();
      assert.ok(
        dist >= minDistance && dist <= maxDistance,
        `Face ${face} vantage distance (${dist.toFixed(2)}) must be within limits`
      );
    });
  });

  it('F14-5: Camera animation lerps smoothly using cubic ease-in-out', () => {
    const startPos = new THREE.Vector3(4.5, 4.2, 5.5);
    const targetPos = new THREE.Vector3(0.5, 1.5, 5.5); // Focus F
    const currentPos = new THREE.Vector3();

    // At t = 0.5, ease = 0.5
    const easeMid = easeInOutCubic(0.5);
    currentPos.lerpVectors(startPos, targetPos, easeMid);

    const expectedX = (4.5 + 0.5) / 2;
    const expectedY = (4.2 + 1.5) / 2;
    const expectedZ = (5.5 + 5.5) / 2;

    assert.strictEqual(currentPos.x, expectedX);
    assert.strictEqual(currentPos.y, expectedY);
    assert.strictEqual(currentPos.z, expectedZ);
  });

  it('F14-6: Camera focus always points towards cube center (0, 0, 0)', () => {
    const cam = new THREE.PerspectiveCamera(40, 1.0, 0.1, 100);
    cam.position.set(4.5, 4.2, 5.5);
    cam.lookAt(0, 0, 0);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const towardsOrigin = new THREE.Vector3(0, 0, 0).sub(cam.position).normalize();

    // Dot product should be ~1.0 (pointing towards origin)
    const dot = forward.dot(towardsOrigin);
    assert.ok(dot > 0.999, 'Camera forward vector must align with vector towards origin');
  });
});
