declare class Cube {
  constructor(other?: Cube);
  static initSolver(): void;
  static fromString(str: string): Cube;
  static random(): Cube;
  static inverse(alg: string): string;
  move(algorithm: string): Cube;
  solve(maxDepth?: number): string;
  isSolved(): boolean;
  asString(): string;
  clone(): Cube;
}

export default Cube;
