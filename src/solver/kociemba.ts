import Cube from './cubeLib/solve.js';
import type { CubeColor, CubeState, Face, SolutionStep } from './cubeTypes';
import { FACE_ORDER } from './cubeTypes';
import { createSolutionStep } from './moveParser';
import { bfsShortSolver, simplifyMoves } from './moveOptimizer';

let isSolverInitialized = false;

export function initKociembaSolver(): void {
  if (!isSolverInitialized) {
    try {
      Cube.initSolver();
      isSolverInitialized = true;
    } catch (e) {
      console.warn('Cube.initSolver error or already initialized:', e);
      isSolverInitialized = true;
    }
  }
}

// Convert a CubeState into the 54-char string format expected by cubejs:
// 9 chars for U, 9 for R, 9 for F, 9 for D, 9 for L, 9 for B
export function cubeStateToKociembaString(state: CubeState): string {
  // Map each center's color to its corresponding face notation
  const colorToFace: Partial<Record<CubeColor, Face>> = {
    [state.U[4]]: 'U',
    [state.R[4]]: 'R',
    [state.F[4]]: 'F',
    [state.D[4]]: 'D',
    [state.L[4]]: 'L',
    [state.B[4]]: 'B',
  };

  let result = '';
  for (const face of FACE_ORDER) {
    for (let i = 0; i < 9; i++) {
      const col = state[face][i];
      const mappedChar = colorToFace[col] || 'U';
      result += mappedChar;
    }
  }
  return result;
}

export function solveWithKociemba(state: CubeState): SolutionStep[] {
  initKociembaSolver();

  const faceletStr = cubeStateToKociembaString(state);
  
  // Check if already solved
  if (faceletStr === 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB') {
    return [];
  }

  const cube = Cube.fromString(faceletStr);
  if (cube.isSolved()) {
    return [];
  }

  // TIER 1: Lightning-fast BFS for short scrambles (1-4 moves)
  // Guarantees minimal moves if cube is close to solved
  const shortMoves = bfsShortSolver(cube, 4);
  if (shortMoves !== null) {
    return shortMoves.map((move: string, idx: number) => {
      return createSolutionStep(move, idx, shortMoves.length, 'Optimal Minimal');
    });
  }

  // TIER 2: Kociemba two-phase algorithm for deep scrambles
  const rawSolution = cube.solve();
  if (!rawSolution || rawSolution.trim() === '') {
    return [];
  }

  const rawMoves: string[] = rawSolution.trim().split(/\s+/).filter(Boolean);
  // TIER 3: Move contraction & simplification to prune redundant/canceling turns
  const moves = simplifyMoves(rawMoves);

  return moves.map((move: string, idx: number) => {
    return createSolutionStep(move, idx, moves.length, 'Optimal Two-Phase');
  });
}
