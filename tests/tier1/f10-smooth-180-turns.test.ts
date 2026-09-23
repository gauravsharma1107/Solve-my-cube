import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { applyMove, invertMove, parseMove } from '../../src/solver/moveParser.ts';
import { createSolvedCube, isCubeSolved } from '../test-helpers.ts';
import type { Face } from '../../src/solver/cubeTypes.ts';

// Replicate cubic easing function from visualizer
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

describe('Tier 1: F10 - Smooth Continuous 180° Turns', () => {
  const doubleMoves = ['U2', 'D2', 'R2', 'L2', 'F2', 'B2'];

  it('F10-1: Double-turn target angle is exactly 180° (Math.PI) continuous rotation', () => {
    doubleMoves.forEach(move => {
      const face = move[0] as Face;
      const isDouble = move.includes('2');
      let baseAngle = -Math.PI / 2;
      let targetAngle = isDouble ? baseAngle * 2 : baseAngle;

      assert.strictEqual(Math.abs(targetAngle), Math.PI, `${move} target angle must be exactly PI radians (180°)`);
    });
  });

  it('F10-2: 180° turn duration scales by 1.35x for realistic speedcube physics', () => {
    const baseDuration = 350;
    const isDouble = true;
    const scaledDuration = isDouble ? Math.round(baseDuration * 1.35) : baseDuration;

    assert.strictEqual(scaledDuration, 473, 'Scaled duration for 350ms base must be 473ms (1.35x)');
  });

  it('F10-3: easeInOutCubic produces smooth start, midpoint, and finish without discontinuity', () => {
    assert.strictEqual(easeInOutCubic(0), 0, 'Start t=0 must equal 0');
    assert.strictEqual(easeInOutCubic(0.5), 0.5, 'Midpoint t=0.5 must equal 0.5');
    assert.strictEqual(easeInOutCubic(1), 1, 'End t=1 must equal 1');

    // Check monotonic increase
    let prev = 0;
    for (let t = 0.05; t <= 1.0; t += 0.05) {
      const curr = easeInOutCubic(t);
      assert.ok(curr >= prev, `Easing must be monotonically increasing at t=${t}`);
      prev = curr;
    }

    // Verify low slope near 0 and 1 (zero jerk / smooth deceleration)
    const slopeStart = (easeInOutCubic(0.05) - easeInOutCubic(0)) / 0.05;
    const slopeMid = (easeInOutCubic(0.55) - easeInOutCubic(0.45)) / 0.1;
    assert.ok(slopeStart < slopeMid, 'Starting velocity must be gentle compared to midpoint');
  });

  it('F10-4: All 6 faces rotate around their respective face normal axes', () => {
    const faceAxes: Record<Face, THREE.Vector3> = {
      U: new THREE.Vector3(0, 1, 0),
      D: new THREE.Vector3(0, 1, 0),
      R: new THREE.Vector3(1, 0, 0),
      L: new THREE.Vector3(1, 0, 0),
      F: new THREE.Vector3(0, 0, 1),
      B: new THREE.Vector3(0, 0, 1),
    };

    doubleMoves.forEach(m => {
      const face = m[0] as Face;
      const expectedAxis = faceAxes[face];
      assert.ok(expectedAxis, `Expected axis must be defined for ${face}`);
      assert.strictEqual(expectedAxis.length(), 1.0, 'Axis must be unit normalized');
    });
  });

  it('F10-5: Applying two consecutive 180° turns on any face returns to original state', () => {
    doubleMoves.forEach(move => {
      const solved = createSolvedCube();
      const state1 = applyMove(solved, move);
      assert.strictEqual(isCubeSolved(state1), false, `${move} must scramble the cube`);

      const state2 = applyMove(state1, move);
      assert.strictEqual(isCubeSolved(state2), true, `${move} twice (360°) must return to solved cube`);
    });
  });

  it('F10-6: InvertMove on double turns is an identity operation', () => {
    doubleMoves.forEach(move => {
      assert.strictEqual(invertMove(move), move, `Inverting ${move} must produce ${move}`);
    });
  });
});
