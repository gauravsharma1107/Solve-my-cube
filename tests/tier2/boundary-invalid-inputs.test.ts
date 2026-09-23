import { describe, it } from 'node:test';
import assert from 'node:assert';
import { applyMove, parseMove } from '../../src/solver/moveParser.ts';
import { validateCubeParity } from '../../src/solver/parityValidator.ts';
import { createSolvedCube } from '../test-helpers.ts';
import type { CubeColor, CubeState, FaceState } from '../../src/solver/cubeTypes.ts';

describe('Tier 2: Boundary - Invalid Inputs & Parity Edge Cases', () => {
  it('B5-1: Empty or whitespace move string returns unchanged state without warning', () => {
    const solved = createSolvedCube();
    const s1 = applyMove(solved, '');
    const s2 = applyMove(solved, '   ');
    assert.deepStrictEqual(s1, solved);
    assert.deepStrictEqual(s2, solved);
  });

  it('B5-2: Malformed or non-standard move string handled safely without unhandled exception', () => {
    const solved = createSolvedCube();
    assert.doesNotThrow(() => {
      applyMove(solved, 'X');
      applyMove(solved, 'r');
      applyMove(solved, 'U4');
      applyMove(solved, 'INVALID');
    });
  });

  it('B5-3: Parity validator flags sticker count mismatch when color counts are not 9 each', () => {
    const state = createSolvedCube();
    // Tamper: replace 1 white sticker with red (10 red, 8 white)
    state.U[0] = 'R';

    const result = validateCubeParity(state);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors.some(e => e.includes('Sticker count mismatch')));
  });

  it('B5-4: Parity validator catches impossible edge with opposite colors (White & Yellow)', () => {
    const state = createSolvedCube();
    // Edge U5 (White) and R1 (Red).
    // Put Yellow on R1, and compensate by putting Red on D1 (which was Yellow)
    // Counts of all colors remain exactly 9.
    state.R[1] = 'Y'; // Edge U5/R1 is now White + Yellow
    state.D[1] = 'R'; // Compensate Yellow/Red count

    const result = validateCubeParity(state);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('opposite colors and cannot touch on an edge')));
  });

  it('B5-5: Parity validator catches impossible corner with duplicate colors', () => {
    const state = createSolvedCube();
    // Corner U8 (White), R0 (Red), F2 (Green).
    // Set F2 to 'R' (two Reds on same corner piece).
    // Compensate Green/Red count by setting R8 to 'G'.
    state.F[2] = 'R';
    state.R[8] = 'G';

    const result = validateCubeParity(state);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('Invalid corner piece: duplicate colors')));
  });

  it('B5-6: Parity validator detects unassigned placeholder X stickers', () => {
    const state = createSolvedCube();
    state.U[0] = 'X' as CubeColor;

    const result = validateCubeParity(state);
    assert.strictEqual(result.isValid, false);
    assert.ok(result.errors.some(e => e.includes('unassigned sticker')));
  });
});
