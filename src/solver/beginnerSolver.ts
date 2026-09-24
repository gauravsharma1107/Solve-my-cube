import type { CubeState, SolutionStep } from './cubeTypes';
import { solveWithHumanLBL } from './humanStateMachineSolver';

export function solveWithBeginnerMethod(initialState: CubeState): SolutionStep[] {
  return solveWithHumanLBL(initialState, 'en');
}

