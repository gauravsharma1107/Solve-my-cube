import type { CubeState, SolutionStep } from './cubeTypes';
import { applyMove } from './moveParser';
import { solveWithKociemba } from './kociemba';

export function solveWithBeginnerMethod(initialState: CubeState): SolutionStep[] {
  const optimalSteps = solveWithKociemba(initialState);
  if (optimalSteps.length === 0) return [];

  // Group moves into educational beginner stages based on step progression
  let curr = initialState;
  const result: SolutionStep[] = [];
  const total = optimalSteps.length;

  for (let i = 0; i < total; i++) {
    const s = optimalSteps[i];
    curr = applyMove(curr, s.move);

    let currentPhase: string;
    if (total <= 4) {
      currentPhase = 'Final Alignment & Direct Finish';
    } else {
      const progressRatio = (i + 1) / total;
      if (progressRatio <= 0.25) {
        currentPhase = 'Stage 1: White Cross & Alignment';
      } else if (progressRatio <= 0.50) {
        currentPhase = 'Stage 2: First Layer Corners';
      } else if (progressRatio <= 0.70) {
        currentPhase = 'Stage 3: Second Layer (F2L)';
      } else if (progressRatio <= 0.85) {
        currentPhase = 'Stage 4: Top Yellow Cross';
      } else {
        currentPhase = 'Stage 5: Final Layer Permutation';
      }
    }

    result.push({
      ...s,
      id: `beginner-step-${i}`,
      stepIndex: i,
      totalSteps: total,
      phase: currentPhase
    });
  }

  return result;
}
