declare module 'cubejs' {
  export default class Cube {
    constructor();
    static initSolver(): void;
    static fromString(str: string): Cube;
    move(algorithm: string): void;
    solve(): string;
    isSolved(): boolean;
    asString(): string;
    clone(): Cube;
  }
}
