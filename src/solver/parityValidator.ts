import type { CubeColor, CubeState, ParityValidationResult } from './cubeTypes';
import { FACE_ORDER, CUBE_COLORS } from './cubeTypes';

const OPPOSITE_COLORS: Record<CubeColor, CubeColor> = {
  W: 'Y',
  Y: 'W',
  G: 'B',
  B: 'G',
  R: 'O',
  O: 'R',
  X: 'X'
};

export function validateCubeParity(state: CubeState): ParityValidationResult {
  const errors: string[] = [];
  const VALID_SOLVE_COLORS: CubeColor[] = ['W', 'Y', 'G', 'B', 'R', 'O'];
  const colorCounts: Record<CubeColor, number> = {
    W: 0,
    Y: 0,
    G: 0,
    B: 0,
    R: 0,
    O: 0,
    X: 0
  };

  // Count stickers
  for (const face of FACE_ORDER) {
    const stickers = state[face];
    for (let i = 0; i < 9; i++) {
      const col = stickers[i];
      if (colorCounts[col] !== undefined) {
        colorCounts[col]++;
      }
    }
  }

  if (colorCounts.X > 0) {
    errors.push(`Cube has ${colorCounts.X} unassigned sticker${colorCounts.X > 1 ? 's' : ''}. Please assign colors to all stickers to solve.`);
    return { 
      isValid: false, 
      errors,
      colorCounts 
    };
  }

  // Check 9 stickers per color
  const countMismatches: string[] = [];
  for (const col of VALID_SOLVE_COLORS) {
    const count = colorCounts[col];
    const name = CUBE_COLORS[col].name;
    if (count !== 9) {
      countMismatches.push(`${name}: ${count}/9 (${count > 9 ? `+${count - 9}` : `${count - 9}`})`);
    }
  }

  if (countMismatches.length > 0) {
    errors.push(`Sticker count mismatch: each color must have exactly 9 stickers. Currently: ${countMismatches.join(', ')}`);
  }

  // Check centers
  const centerColors = FACE_ORDER.map(f => state[f][4]);
  const uniqueCenters = new Set(centerColors);
  if (uniqueCenters.size < 6) {
    errors.push('Cube centers must be unique: each of the 6 faces must have a different center color.');
  }

  // If counts don't match, return early with actionable counts
  if (errors.length > 0) {
    return {
      isValid: false,
      errors,
      colorCounts
    };
  }

  // Check impossible edge combinations (opposite colors cannot share an edge)
  const edges = [
    [state.U[5], state.R[1]],
    [state.U[7], state.F[1]],
    [state.U[3], state.L[1]],
    [state.U[1], state.B[1]],
    [state.D[5], state.R[7]],
    [state.D[1], state.F[7]],
    [state.D[3], state.L[7]],
    [state.D[7], state.B[7]],
    [state.F[5], state.R[3]],
    [state.F[3], state.L[5]],
    [state.B[3], state.R[5]],
    [state.B[5], state.L[3]],
  ];

  for (let i = 0; i < edges.length; i++) {
    const [c1, c2] = edges[i];
    if (c1 === c2) {
      errors.push(`Invalid edge found with two identical ${CUBE_COLORS[c1].name} stickers.`);
    }
    if (OPPOSITE_COLORS[c1] === c2) {
      errors.push(`Invalid edge: ${CUBE_COLORS[c1].name} and ${CUBE_COLORS[c2].name} are opposite colors and cannot touch on an edge.`);
    }
  }

  // Corners
  const corners = [
    [state.U[8], state.R[0], state.F[2]],
    [state.U[6], state.F[0], state.L[2]],
    [state.U[0], state.L[0], state.B[2]],
    [state.U[2], state.B[0], state.R[2]],
    [state.D[2], state.F[8], state.R[6]],
    [state.D[0], state.L[8], state.F[6]],
    [state.D[6], state.B[8], state.L[6]],
    [state.D[8], state.R[8], state.B[6]],
  ];

  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    if (c[0] === c[1] || c[1] === c[2] || c[0] === c[2]) {
      errors.push('Invalid corner piece: duplicate colors on the same corner.');
    }
    if (
      OPPOSITE_COLORS[c[0]] === c[1] ||
      OPPOSITE_COLORS[c[0]] === c[2] ||
      OPPOSITE_COLORS[c[1]] === c[2]
    ) {
      errors.push(`Invalid corner piece with opposite colors (${c.map(col => CUBE_COLORS[col].name).join(', ')}).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    colorCounts
  };
}
