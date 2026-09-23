import type { Face } from './cubeTypes';

export const ALL_MOVES: string[] = [
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'R', "R'", 'R2',
  'L', "L'", 'L2',
  'F', "F'", 'F2',
  'B', "B'", 'B2'
];

const OPPOSITE_FACE_MAP: Record<Face, Face> = {
  'U': 'D',
  'D': 'U',
  'R': 'L',
  'L': 'R',
  'F': 'B',
  'B': 'F'
};

interface ParsedMove {
  face: Face;
  quarters: number; // 1, 2, or 3 (where 3 = -1 / prime)
}

function parseMove(m: string): ParsedMove | null {
  const trimmed = m.trim();
  if (!trimmed) return null;
  const face = trimmed[0] as Face;
  if (!['U', 'D', 'R', 'L', 'F', 'B'].includes(face)) return null;

  let quarters = 1;
  if (trimmed.includes("'")) quarters = 3;
  else if (trimmed.includes('2')) quarters = 2;

  return { face, quarters };
}

function formatMove(parsed: ParsedMove): string | null {
  const q = ((parsed.quarters % 4) + 4) % 4;
  if (q === 0) return null;
  if (q === 1) return parsed.face;
  if (q === 2) return `${parsed.face}2`;
  if (q === 3) return `${parsed.face}'`;
  return null;
}

/**
 * Optimizes and simplifies a sequence of Rubik's cube moves:
 * 1. Cancels adjacent inverse moves (e.g., R R' -> empty)
 * 2. Merges same-face moves (e.g., U U -> U2, U2 U -> U', F2 F2 -> empty)
 * 3. Commutes opposite-face moves to cancel or merge across them (e.g. R L R' -> L, U D U -> U2 D)
 */
export function simplifyMoves(moves: string[]): string[] {
  let list: ParsedMove[] = moves
    .map(parseMove)
    .filter((m): m is ParsedMove => m !== null);

  let changed = true;
  let iterations = 0;

  while (changed && iterations < 30) {
    changed = false;
    iterations++;

    const nextList: ParsedMove[] = [];

    for (let i = 0; i < list.length; i++) {
      const current = list[i];
      if (nextList.length === 0) {
        nextList.push(current);
        continue;
      }

      const prev = nextList[nextList.length - 1];

      // 1. Direct consecutive same-face moves
      if (prev.face === current.face) {
        const combinedQuarters = (prev.quarters + current.quarters) % 4;
        nextList.pop();
        if (combinedQuarters !== 0) {
          nextList.push({ face: prev.face, quarters: combinedQuarters });
        }
        changed = true;
        continue;
      }

      // 2. Check if prev is an opposite face and the one before that matches current face
      // (e.g. prev-prev is R, prev is L, current is R')
      if (nextList.length >= 2) {
        const prevPrev = nextList[nextList.length - 2];
        if (
          prevPrev.face === current.face &&
          OPPOSITE_FACE_MAP[prev.face] === current.face
        ) {
          // current and prevPrev can merge across the commuting opposite face
          const combinedQuarters = (prevPrev.quarters + current.quarters) % 4;
          const oppMove = nextList.pop()!; // Remove prev
          nextList.pop(); // Remove prevPrev

          if (combinedQuarters !== 0) {
            nextList.push({ face: current.face, quarters: combinedQuarters });
          }
          nextList.push(oppMove);
          changed = true;
          continue;
        }
      }

      nextList.push(current);
    }

    list = nextList;
  }

  return list
    .map(formatMove)
    .filter((m): m is string => m !== null);
}

/**
 * Fast Breadth-First Search optimal solver for short scrambles (depths 1 to 4).
 * Returns the exact strictly shortest move sequence in milliseconds.
 * If depth > 4, returns null so Kociemba can handle deep states.
 */
export function bfsShortSolver(cube: any, maxDepth: number = 4): string[] | null {
  if (cube.isSolved()) return [];

  // Depth 1 (18 checks - < 0.2ms)
  for (const m1 of ALL_MOVES) {
    const c1 = cube.clone().move(m1);
    if (c1.isSolved()) return [m1];
  }

  if (maxDepth < 2) return null;

  // Depth 2 (270 checks - < 2ms)
  for (const m1 of ALL_MOVES) {
    const f1 = m1[0];
    for (const m2 of ALL_MOVES) {
      if (m2[0] === f1) continue;
      const c2 = cube.clone().move(m1).move(m2);
      if (c2.isSolved()) return [m1, m2];
    }
  }

  if (maxDepth < 3) return null;

  // Depth 3 (~4,050 checks - < 15ms)
  for (const m1 of ALL_MOVES) {
    const f1 = m1[0];
    for (const m2 of ALL_MOVES) {
      const f2 = m2[0];
      if (f2 === f1) continue;
      for (const m3 of ALL_MOVES) {
        if (m3[0] === f2) continue;
        const c3 = cube.clone().move(m1).move(m2).move(m3);
        if (c3.isSolved()) return [m1, m2, m3];
      }
    }
  }

  if (maxDepth < 4) return null;

  // Depth 4 (~35,000 pruned checks - < 70ms)
  // Pruning: skip opposite commutative duplicates (e.g. only test U then D, not D then U)
  const COMMUTATIVE_CANONICAL: Partial<Record<string, string>> = {
    'D': 'U',
    'L': 'R',
    'B': 'F'
  };

  for (const m1 of ALL_MOVES) {
    const f1 = m1[0];
    for (const m2 of ALL_MOVES) {
      const f2 = m2[0];
      if (f2 === f1) continue;
      if (COMMUTATIVE_CANONICAL[f2] === f1) continue;

      for (const m3 of ALL_MOVES) {
        const f3 = m3[0];
        if (f3 === f2) continue;

        for (const m4 of ALL_MOVES) {
          const f4 = m4[0];
          if (f4 === f3) continue;
          if (COMMUTATIVE_CANONICAL[f4] === f3) continue;

          const c4 = cube.clone().move(m1).move(m2).move(m3).move(m4);
          if (c4.isSolved()) return [m1, m2, m3, m4];
        }
      }
    }
  }

  return null;
}
