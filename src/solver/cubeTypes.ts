export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

export type CubeColor = 'W' | 'Y' | 'G' | 'B' | 'R' | 'O' | 'X';

export interface ColorMeta {
  code: CubeColor;
  name: string;
  hex: string;
  face: Face;
}

export const CUBE_COLORS: Record<CubeColor, ColorMeta> = {
  W: { code: 'W', name: 'White', hex: '#FFFFFF', face: 'U' },
  Y: { code: 'Y', name: 'Yellow', hex: '#FFD500', face: 'D' },
  G: { code: 'G', name: 'Green', hex: '#009B48', face: 'F' },
  B: { code: 'B', name: 'Blue', hex: '#0046AD', face: 'B' },
  R: { code: 'R', name: 'Red', hex: '#B71234', face: 'R' },
  O: { code: 'O', name: 'Orange', hex: '#FF5800', face: 'L' },
  X: { code: 'X', name: 'Unassigned', hex: '#26262b', face: 'U' },
};

export const FACE_NAMES: Record<Face, string> = {
  U: 'Top (Up / White)',
  R: 'Right (Red)',
  F: 'Front (Green)',
  D: 'Bottom (Down / Yellow)',
  L: 'Left (Orange)',
  B: 'Back (Blue)',
};

export const FACE_ORDER: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_DEFAULT_COLORS: Record<Face, CubeColor> = {
  U: 'W',
  R: 'R',
  F: 'G',
  D: 'Y',
  L: 'O',
  B: 'B',
};

// 9 stickers per face (indices 0..8 in row-major order: top-left, top-mid, top-right, mid-left, center, mid-right, bot-left, bot-mid, bot-right)
export type FaceState = [
  CubeColor, CubeColor, CubeColor,
  CubeColor, CubeColor, CubeColor,
  CubeColor, CubeColor, CubeColor
];

export type CubeState = Record<Face, FaceState>;

export interface SolutionStep {
  id: string;
  stepIndex: number;
  totalSteps: number;
  move: string;              // e.g. "R", "U'", "F2"
  face: Face;                // 'R'
  turns: 1 | -1 | 2;         // 1 = 90 deg CW, -1 = 90 deg CCW, 2 = 180 deg
  notation: string;          // e.g. "R'"
  description: string;       // e.g. "Rotate Right face Counter-Clockwise (down towards you)"
  voiceText: string;         // e.g. "Turn right face down"
  phase?: string;            // e.g. "White Cross" or "Optimal Two-Phase"
}

export type SolverMode = 'optimal' | 'beginner';

export interface ParityValidationResult {
  isValid: boolean;
  errors: string[];
  colorCounts: Record<CubeColor, number>;
}
