import Cube from './cubeLib/cube.js';
import type { CubeColor, CubeState, Face, FaceState, SolutionStep } from './cubeTypes';
import { FACE_ORDER } from './cubeTypes';

export function cloneCubeState(state: CubeState): CubeState {
  return {
    U: [...state.U] as FaceState,
    R: [...state.R] as FaceState,
    F: [...state.F] as FaceState,
    D: [...state.D] as FaceState,
    L: [...state.L] as FaceState,
    B: [...state.B] as FaceState,
  };
}

export function cubeStateToKociembaString(state: CubeState): string {
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

export function kociembaStringToCubeState(str: string): CubeState {
  const charToColor: Record<string, CubeColor> = {
    U: 'W',
    R: 'R',
    F: 'G',
    D: 'Y',
    L: 'O',
    B: 'B',
  };

  const getFace = (start: number): FaceState => {
    const arr: CubeColor[] = [];
    for (let i = 0; i < 9; i++) {
      arr.push(charToColor[str[start + i]] || 'W');
    }
    return arr as FaceState;
  };

  return {
    U: getFace(0),
    R: getFace(9),
    F: getFace(18),
    D: getFace(27),
    L: getFace(36),
    B: getFace(45),
  };
}

export function applyMove(state: CubeState, move: string): CubeState {
  const trimmed = move.trim();
  if (!trimmed) return state;

  try {
    const str = cubeStateToKociembaString(state);
    const cube = Cube.fromString(str);
    cube.move(trimmed);
    return kociembaStringToCubeState(cube.asString());
  } catch (e) {
    console.warn('applyMove error:', e);
    return state;
  }
}

export function applyMoveSequence(initialState: CubeState, moveStr: string): CubeState {
  const trimmed = moveStr.trim();
  if (!trimmed) return initialState;

  try {
    const str = cubeStateToKociembaString(initialState);
    const cube = Cube.fromString(str);
    cube.move(trimmed);
    return kociembaStringToCubeState(cube.asString());
  } catch (e) {
    console.warn('applyMoveSequence error:', e);
    return initialState;
  }
}

export function invertMove(move: string): string {
  const trimmed = move.trim();
  if (trimmed.endsWith("'")) {
    return trimmed.slice(0, -1);
  } else if (trimmed.endsWith("2")) {
    return trimmed;
  } else {
    return trimmed + "'";
  }
}

export function isCubeSolved(state: CubeState): boolean {
  for (const face of ['U', 'R', 'F', 'D', 'L', 'B'] as Face[]) {
    const faceColors = state[face];
    const centerColor = faceColors[4];
    for (let i = 0; i < 9; i++) {
      if (faceColors[i] !== centerColor) return false;
    }
  }
  return true;
}

export function parseMove(move: string): { face: Face; turns: 1 | -1 | 2 } {
  const trimmed = move.trim();
  const face = trimmed[0] as Face;
  if (trimmed.includes('2')) return { face, turns: 2 };
  if (trimmed.includes("'")) return { face, turns: -1 };
  return { face, turns: 1 };
}

export const MOVE_DETAILS: Record<string, { desc: string; voice: string; arrowDir: string }> = {
  "R":  { desc: "Turn Right face Clockwise 90° (Push right side up / away from you)", voice: "Right face up", arrowDir: "Up" },
  "R'": { desc: "Turn Right face Counter-Clockwise 90° (Pull right side down / towards you)", voice: "Right face down", arrowDir: "Down" },
  "R2": { desc: "Turn Right face 180° (Turn right side twice)", voice: "Right face twice", arrowDir: "180°" },

  "L":  { desc: "Turn Left face Clockwise 90° (Pull left side down / towards you)", voice: "Left face down", arrowDir: "Down" },
  "L'": { desc: "Turn Left face Counter-Clockwise 90° (Push left side up / away from you)", voice: "Left face up", arrowDir: "Up" },
  "L2": { desc: "Turn Left face 180° (Turn left side twice)", voice: "Left face twice", arrowDir: "180°" },

  "U":  { desc: "Turn Top face Clockwise 90° (Flick top layer left towards Orange)", voice: "Top layer left", arrowDir: "Left" },
  "U'": { desc: "Turn Top face Counter-Clockwise 90° (Flick top layer right towards Red)", voice: "Top layer right", arrowDir: "Right" },
  "U2": { desc: "Turn Top face 180° (Turn top layer twice)", voice: "Top layer twice", arrowDir: "180°" },

  "D":  { desc: "Turn Bottom face Clockwise 90° (Flick bottom layer right towards Red)", voice: "Bottom layer right", arrowDir: "Right" },
  "D'": { desc: "Turn Bottom face Counter-Clockwise 90° (Flick bottom layer left towards Orange)", voice: "Bottom layer left", arrowDir: "Left" },
  "D2": { desc: "Turn Bottom face 180° (Turn bottom layer twice)", voice: "Bottom layer twice", arrowDir: "180°" },

  "F":  { desc: "Turn Front face Clockwise 90° (Turn front face right like a steering wheel)", voice: "Front face clockwise", arrowDir: "Clockwise" },
  "F'": { desc: "Turn Front face Counter-Clockwise 90° (Turn front face left like a steering wheel)", voice: "Front face counter clockwise", arrowDir: "Counter-Clockwise" },
  "F2": { desc: "Turn Front face 180° (Turn front face twice)", voice: "Front face twice", arrowDir: "180°" },

  "B":  { desc: "Turn Back face Clockwise 90° (Turn back face clockwise looking from behind)", voice: "Back face clockwise", arrowDir: "Clockwise" },
  "B'": { desc: "Turn Back face Counter-Clockwise 90° (Turn back face counter-clockwise looking from behind)", voice: "Back face counter clockwise", arrowDir: "Counter-Clockwise" },
  "B2": { desc: "Turn Back face 180° (Turn back face twice)", voice: "Back face twice", arrowDir: "180°" },
};

export function createSolutionStep(
  move: string,
  index: number,
  total: number,
  phase?: string
): SolutionStep {
  const { face, turns } = parseMove(move);
  const detail = MOVE_DETAILS[move] || {
    desc: `Turn ${face} face ${turns === 2 ? '180°' : turns === 1 ? 'clockwise' : 'counter-clockwise'}`,
    voice: `Turn ${face} face`,
    arrowDir: ''
  };

  return {
    id: `step-${index}-${move}`,
    stepIndex: index,
    totalSteps: total,
    move,
    notation: move,
    face,
    turns,
    description: detail.desc,
    voiceText: detail.voice,
    phase
  };
}
