import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { 
  FACE_NORMALS, 
  OPTIMAL_VANTAGE_POINTS,
  computeFaceCameraDot,
  shouldAutoFrameFace 
} from '../../src/components/Cube3DViewer';
import type { Face } from '../../src/solver/cubeTypes';

describe('Tier 1: F14 - Smart Camera Auto-Framing', () => {
  it('F14-1: Face unit normals correspond to correct outward directions in 3D world coordinates', () => {
    assert.deepStrictEqual(FACE_NORMALS.U.toArray(), [0, 1, 0], 'U face normal points +Y');
    assert.deepStrictEqual(FACE_NORMALS.D.toArray(), [0, -1, 0], 'D face normal points -Y');
    assert.deepStrictEqual(FACE_NORMALS.F.toArray(), [0, 0, 1], 'F face normal points +Z');
    assert.deepStrictEqual(FACE_NORMALS.B.toArray(), [0, 0, -1], 'B face normal points -Z');
    assert.deepStrictEqual(FACE_NORMALS.R.toArray(), [1, 0, 0], 'R face normal points +X');
    assert.deepStrictEqual(FACE_NORMALS.L.toArray(), [-1, 0, 0], 'L face normal points -X');

    // All face normals must be normalized unit vectors
    const faces: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];
    for (const face of faces) {
      assert.strictEqual(FACE_NORMALS[face].length(), 1.0, `${face} normal must be unit vector`);
    }
  });

  it('F14-2: computeFaceCameraDot accurately evaluates the cosine angle between face normal and camera vector', () => {
    // Camera placed directly along +Z axis looking at origin
    const camPosF = new THREE.Vector3(0, 0, 10);
    const dotF = computeFaceCameraDot('F', camPosF);
    assert.strictEqual(Number(dotF.toFixed(4)), 1.0000, 'Direct line of sight produces dot = 1.0');

    // Dot with opposite face (B, -Z)
    const dotB = computeFaceCameraDot('B', camPosF);
    assert.strictEqual(Number(dotB.toFixed(4)), -1.0000, 'Opposite face produces dot = -1.0');

    // Dot with perpendicular face (U, +Y)
    const dotU = computeFaceCameraDot('U', camPosF);
    assert.strictEqual(Number(dotU.toFixed(4)), 0.0000, 'Perpendicular face produces dot = 0.0');
  });

  it('F14-3: At default camera (4.5, 4.2, 5.5), visible faces have dot >= 0.25 while back faces have dot < 0.25', () => {
    const defaultCamera = new THREE.Vector3(4.5, 4.2, 5.5);

    // Front-visible faces: U, F, R
    assert.ok(computeFaceCameraDot('U', defaultCamera) >= 0.25, 'U must be visible at default camera');
    assert.ok(computeFaceCameraDot('F', defaultCamera) >= 0.25, 'F must be visible at default camera');
    assert.ok(computeFaceCameraDot('R', defaultCamera) >= 0.25, 'R must be visible at default camera');

    // Obscured / back faces: B, L, D
    assert.ok(computeFaceCameraDot('B', defaultCamera) < 0.25, 'B must be obscured at default camera');
    assert.ok(computeFaceCameraDot('L', defaultCamera) < 0.25, 'L must be obscured at default camera');
    assert.ok(computeFaceCameraDot('D', defaultCamera) < 0.25, 'D must be obscured at default camera');
  });

  it('F14-4: shouldAutoFrameFace triggers when dot < 0.25 threshold and suppresses when face is in view', () => {
    const defaultCamera = new THREE.Vector3(4.5, 4.2, 5.5);

    // Moves targeting obscured faces must trigger auto-framing
    assert.strictEqual(shouldAutoFrameFace('B', defaultCamera), true, 'B move must trigger camera glide');
    assert.strictEqual(shouldAutoFrameFace('L', defaultCamera), true, 'L move must trigger camera glide');
    assert.strictEqual(shouldAutoFrameFace('D', defaultCamera), true, 'D move must trigger camera glide');

    // Moves targeting already visible faces do not trigger unnecessary camera jumps
    assert.strictEqual(shouldAutoFrameFace('U', defaultCamera), false, 'U move must not jump camera');
    assert.strictEqual(shouldAutoFrameFace('F', defaultCamera), false, 'F move must not jump camera');
    assert.strictEqual(shouldAutoFrameFace('R', defaultCamera), false, 'R move must not jump camera');
  });

  it('F14-5: Optimal 3/4 vantage points position the active face with dot > 0.65', () => {
    const faces: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];
    for (const face of faces) {
      const vantage = OPTIMAL_VANTAGE_POINTS[face];
      assert.ok(vantage, `Optimal vantage point must exist for ${face}`);

      const dot = computeFaceCameraDot(face, vantage);
      assert.ok(
        dot > 0.65,
        `Vantage for ${face} must position face prominently with dot > 0.65 (actual: ${dot.toFixed(3)})`
      );
    }
  });

  it('F14-6: Optimal 3/4 vantage points maintain 3D depth perspective with non-zero components on 3 axes', () => {
    const faces: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];
    for (const face of faces) {
      const vantage = OPTIMAL_VANTAGE_POINTS[face];
      assert.notStrictEqual(vantage.x, 0, `${face} vantage x must be non-zero for 3/4 depth`);
      assert.notStrictEqual(vantage.y, 0, `${face} vantage y must be non-zero for 3/4 depth`);
      assert.notStrictEqual(vantage.z, 0, `${face} vantage z must be non-zero for 3/4 depth`);

      const distance = vantage.length();
      assert.ok(
        distance >= 5.0 && distance <= 9.0,
        `${face} camera distance (${distance.toFixed(2)}) must be well within OrbitControls range [3.5, 12]`
      );
    }
  });
});
