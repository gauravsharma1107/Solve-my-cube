declare class Cube {
  constructor(other?: Cube);
  static fromString(str: string): Cube;
  static random(): Cube;
  static inverse(alg: string): string;
  move(algorithm: string): Cube;
  isSolved(): boolean;
  asString(): string;
  clone(): Cube;
}

export default Cube;
