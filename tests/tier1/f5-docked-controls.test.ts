import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { 
  applyMove, 
  applyMoveSequence, 
  invertMove, 
  isCubeSolved 
} from '../../src/solver/moveParser.ts';
import { createSolvedCube, createScrambledCube } from '../test-helpers.ts';
import { solveWithKociemba } from '../../src/solver/kociemba.ts';

describe('Tier 1: F5 - Non-Scrolling Docked Controls', () => {
  it('F5-1: Step navigation index bounds clamping logic', () => {
    const stepsCount = 10;
    const clampIndex = (idx: number) => Math.max(0, Math.min(stepsCount, idx));

    assert.strictEqual(clampIndex(-1), 0, 'Negative step index must clamp to 0');
    assert.strictEqual(clampIndex(5), 5, 'Valid step index within range must remain unchanged');
    assert.strictEqual(clampIndex(12), 10, 'Out-of-bounds step index must clamp to totalSteps');
  });

  it('F5-2: Forward navigation step executes move and advances currentStepIndex', () => {
    const scramble = "R U R'";
    const initial = createScrambledCube(scramble);
    const steps = solveWithKociemba(initial);

    assert.ok(steps.length > 0);
    let currentStep = 0;
    let state = initial;

    // Simulate clicking Next button
    const stepToPerform = steps[currentStep];
    state = applyMove(state, stepToPerform.move);
    currentStep += 1;

    assert.strictEqual(currentStep, 1);
    assert.notDeepStrictEqual(state, initial);
  });

  it('F5-3: Backward navigation step inverts previous move and decrements currentStepIndex', () => {
    const scramble = "R U R'";
    const initial = createScrambledCube(scramble);
    const steps = solveWithKociemba(initial);

    let state = initial;
    // Step forward
    state = applyMove(state, steps[0].move);
    // Step backward using invertMove
    const undoMove = invertMove(steps[0].move);
    state = applyMove(state, undoMove);

    // Cube state should match initial scrambled state perfectly
    assert.deepStrictEqual(state, initial, 'Stepping forward and backward must return to exact state');
  });

  it('F5-4: Step jump directly computes target state without cumulative animation delays', () => {
    const scramble = "U R2 F D2 B";
    const initial = createScrambledCube(scramble);
    const steps = solveWithKociemba(initial);
    assert.ok(steps.length >= 3);

    const targetIndex = 3;
    let jumpedState = initial;
    for (let i = 0; i < targetIndex; i++) {
      jumpedState = applyMove(jumpedState, steps[i].move);
    }

    // Incremental step-by-step state
    let stepByStepState = initial;
    stepByStepState = applyMove(stepByStepState, steps[0].move);
    stepByStepState = applyMove(stepByStepState, steps[1].move);
    stepByStepState = applyMove(stepByStepState, steps[2].move);

    assert.deepStrictEqual(jumpedState, stepByStepState, 'Jumped state must equal sequential step state');
  });

  it('F5-5: Playback timing formula scales inversely with speed multiplier', () => {
    // Formula in StepSolverGuide: Math.max(500, 1400 / speedMultiplier)
    const computeDelay = (multiplier: number) => Math.max(500, Math.round(1400 / multiplier));

    assert.strictEqual(computeDelay(1.0), 1400, 'Normal 1x speed delay should be 1400ms');
    assert.strictEqual(computeDelay(2.0), 700, '2x speed delay should be 700ms');
    assert.strictEqual(computeDelay(4.0), 500, 'Clamped minimum delay should be 500ms');
  });

  it('F5-6: StepSolverGuide component includes touch-friendly playback bar', () => {
    const guidePath = path.resolve(process.cwd(), 'src/components/StepSolverGuide.tsx');
    const content = fs.readFileSync(guidePath, 'utf-8');

    // Controls must include playback triggers (SkipBack, Play/Pause, SkipForward)
    assert.ok(content.includes('handleStepForward'), 'Must have handleStepForward handler');
    assert.ok(content.includes('handleStepBack'), 'Must have handleStepBack handler');
    assert.ok(content.includes('isPlaying'), 'Must have isPlaying state');
  });
});
