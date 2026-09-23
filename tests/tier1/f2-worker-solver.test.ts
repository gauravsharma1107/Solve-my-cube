import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  initSolverService, 
  solveCube, 
  type SolveResult 
} from '../../src/solver/solverService.ts';
import { 
  createSolvedCube, 
  createScrambledCube, 
  isCubeSolved 
} from '../test-helpers.ts';
import { applyMoveSequence } from '../../src/solver/moveParser.ts';

describe('Tier 1: F2 - Web Worker Solver Offloading', () => {
  it('F2-1: initSolverService initializes cleanly and idempotently', async () => {
    const p1 = initSolverService();
    const p2 = initSolverService();
    assert.ok(p1 instanceof Promise);
    await Promise.all([p1, p2]);
  });

  it('F2-2: solveCube returns compliant SolveResult interface contract', async () => {
    const scramble = "R U R' U'";
    const state = createScrambledCube(scramble);
    const result = await solveCube(state, 'optimal');

    assert.ok(result, 'Result must be defined');
    assert.ok(Array.isArray(result.steps), 'steps must be an array');
    assert.strictEqual(typeof result.algorithmName, 'string');
    assert.strictEqual(typeof result.solveTimeMs, 'number');
    assert.ok(result.solveTimeMs >= 0, 'solveTimeMs must be non-negative');

    if (result.steps.length > 0) {
      const step = result.steps[0];
      assert.strictEqual(typeof step.notation, 'string');
      assert.strictEqual(typeof step.description, 'string');
      assert.ok(['U', 'D', 'F', 'B', 'L', 'R'].includes(step.face));
      assert.strictEqual(typeof step.isDouble, 'boolean');
      assert.strictEqual(typeof step.isCounter, 'boolean');
    }
  });

  it('F2-3: Already solved cube returns empty solution steps immediately', async () => {
    const solved = createSolvedCube();
    const result = await solveCube(solved, 'optimal');
    assert.strictEqual(result.steps.length, 0, 'Solved cube should require 0 steps');
    assert.ok(result.solveTimeMs >= 0);
  });

  it('F2-4: Optimal method solves short scramble and leads to verified solved cube', async () => {
    const scramble = "F R U R' U' F'";
    const state = createScrambledCube(scramble);
    const result = await solveCube(state, 'optimal');

    assert.ok(result.steps.length > 0, 'Should find solution for scramble');
    const moveSeq = result.steps.map(s => s.notation).join(' ');
    const solvedState = applyMoveSequence(state, moveSeq);
    assert.strictEqual(isCubeSolved(solvedState), true, 'Applying solution must solve the cube');
  });

  it('F2-5: Beginner method categorizes steps into educational phases', async () => {
    const scramble = "R U R' F' U2 R U2 R'";
    const state = createScrambledCube(scramble);
    const result = await solveCube(state, 'beginner');

    assert.ok(result.steps.length > 0);
    const hasPhases = result.steps.some(s => s.phase && s.phase.length > 0);
    assert.strictEqual(hasPhases, true, 'Beginner steps must contain educational stage phases');
  });

  it('F2-6: Two-Phase deep scramble resolution works reliably', async () => {
    const deepScramble = "D2 B2 F2 L2 R2 U2 B2 D2 F2 L2 R2";
    const state = createScrambledCube(deepScramble);
    const result = await solveCube(state, 'optimal');

    assert.ok(result.steps.length > 0);
    const moveSeq = result.steps.map(s => s.notation).join(' ');
    const solved = applyMoveSequence(state, moveSeq);
    assert.strictEqual(isCubeSolved(solved), true, 'Deep scramble must be solved');
  });
});
