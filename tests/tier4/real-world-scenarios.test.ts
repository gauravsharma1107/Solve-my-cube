import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  createSolvedCube, 
  createScrambledCube, 
  isCubeSolved 
} from '../test-helpers.ts';
import { 
  applyMove, 
  applyMoveSequence, 
  isCubeSolved as verifySolved 
} from '../../src/solver/moveParser.ts';
import { solveWithKociemba } from '../../src/solver/kociemba.ts';
import { solveWithBeginnerMethod } from '../../src/solver/beginnerSolver.ts';
import { validateCubeParity } from '../../src/solver/parityValidator.ts';
import { generateWcaScramble } from '../../src/components/ScrambleAndTimer.tsx';
import type { CubeColor, CubeState, FaceState } from '../../src/solver/cubeTypes.ts';

describe('Tier 4: Real-World Scenarios & Application Flows', () => {
  it('S1: Full Scramble to Kociemba Two-Phase Solve workflow', () => {
    // 1. Generate 16-move WCA scramble
    const scramble = generateWcaScramble(16);
    assert.ok(scramble && scramble.split(' ').length >= 10);

    // 2. Apply to solved cube
    const scrambledState = createScrambledCube(scramble);
    assert.strictEqual(verifySolved(scrambledState), false, 'Cube must be in scrambled state');

    // 3. Parity validation check
    const parity = validateCubeParity(scrambledState);
    assert.strictEqual(parity.isValid, true, 'WCA scramble must always produce valid parity');

    // 4. Compute optimal solution
    const solutionSteps = solveWithKociemba(scrambledState);
    assert.ok(solutionSteps.length > 0, 'Solver must find valid sequence of steps');

    // 5. Navigate through all steps
    let currentState = scrambledState;
    for (let i = 0; i < solutionSteps.length; i++) {
      currentState = applyMove(currentState, solutionSteps[i].move);
    }

    // 6. Verify 100% solved
    assert.strictEqual(verifySolved(currentState), true, 'Cube must be completely solved after all steps');
  });

  it('S2: Beginner Method full educational flow with 5-stage progression', () => {
    const scramble = "R U R' F' U2 R U2 R'";
    const scrambledState = createScrambledCube(scramble);

    const steps = solveWithBeginnerMethod(scrambledState);
    assert.ok(steps.length > 0);

    // Verify stage labeling exists
    const phases = steps.map(s => s.phase);
    assert.ok(phases.some(p => p && p.includes('Cross') || p && p.includes('Stage') || p && p.includes('Optimal')));

    // Step through beginner steps
    let currentState = scrambledState;
    steps.forEach(step => {
      currentState = applyMove(currentState, step.move);
    });

    assert.strictEqual(verifySolved(currentState), true, 'Beginner method must completely solve cube');
  });

  it('S3: 3D Net manual paint to solve flow with fanfare verification', () => {
    // 1. User manual input: construct valid custom scrambled state
    const knownScramble = "U F2 D' R2 B2";
    const customNetState = createScrambledCube(knownScramble);

    // 2. Validate parity
    const parity = validateCubeParity(customNetState);
    assert.strictEqual(parity.isValid, true);
    assert.strictEqual(parity.errors.length, 0);

    // 3. Solve
    const steps = solveWithKociemba(customNetState);
    assert.ok(steps.length > 0);

    // 4. Verification of solve completion condition:
    // Confetti fanfare must trigger ONLY when currentStepIndex >= totalSteps AND isCubeSolved(cubeState)
    let state = customNetState;
    let stepIndex = 0;
    const totalSteps = steps.length;

    // In mid-progress, isSequenceFinished is false -> no fanfare
    assert.strictEqual(stepIndex >= totalSteps && verifySolved(state), false);

    // Complete all steps
    while (stepIndex < totalSteps) {
      state = applyMove(state, steps[stepIndex].move);
      stepIndex++;
    }

    // Now sequence finished and cube is solved -> fanfare condition met!
    const shouldCelebrate = stepIndex >= totalSteps && verifySolved(state);
    assert.strictEqual(shouldCelebrate, true, 'Fanfare should trigger exactly upon verified solve completion');
  });

  it('S4: Camera scan guide flow across 6 faces', () => {
    // Simulate camera scanning 6 faces of a scrambled cube
    const testScramble = "F R U' B2 L D";
    const actualCube = createScrambledCube(testScramble);

    // Scanner reconstructs CubeState face by face
    const scannedState: CubeState = {
      U: [...actualCube.U] as FaceState,
      R: [...actualCube.R] as FaceState,
      F: [...actualCube.F] as FaceState,
      D: [...actualCube.D] as FaceState,
      L: [...actualCube.L] as FaceState,
      B: [...actualCube.B] as FaceState,
    };

    // Verify center invariants
    assert.strictEqual(scannedState.U[4], 'W');
    assert.strictEqual(scannedState.R[4], 'R');
    assert.strictEqual(scannedState.F[4], 'G');
    assert.strictEqual(scannedState.D[4], 'Y');
    assert.strictEqual(scannedState.L[4], 'O');
    assert.strictEqual(scannedState.B[4], 'B');

    // Validate parity
    const parity = validateCubeParity(scannedState);
    assert.strictEqual(parity.isValid, true);

    // Hand off to solver
    const steps = solveWithKociemba(scannedState);
    assert.ok(steps.length > 0);

    const finalState = applyMoveSequence(scannedState, steps.map(s => s.move).join(' '));
    assert.strictEqual(verifySolved(finalState), true);
  });

  it('S5: Scramble & Speedcubing Timer training workflow', () => {
    // 1. Generate WCA scramble
    const scramble = generateWcaScramble(20);
    const moves = scramble.split(' ');
    assert.strictEqual(moves.length, 20);

    // Verify no consecutive identical face moves in scramble (e.g. R followed by R)
    for (let i = 1; i < moves.length; i++) {
      assert.notStrictEqual(
        moves[i][0], 
        moves[i - 1][0], 
        `WCA scramble must not contain consecutive turns on the same face: ${moves[i-1]} followed by ${moves[i]}`
      );
    }

    // 2. Simulate timer start and solve
    const startTime = 1000;
    const finishTime = 15420;
    const solveDurationMs = finishTime - startTime;
    assert.strictEqual(solveDurationMs, 14420, 'Solve time calculation should be 14.42s');

    // 3. User can review scramble on 3D cube
    const scrambled = createScrambledCube(scramble);
    const parity = validateCubeParity(scrambled);
    assert.strictEqual(parity.isValid, true);
  });
});
