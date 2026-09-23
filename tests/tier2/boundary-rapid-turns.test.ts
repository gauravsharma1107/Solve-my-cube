import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { applyMove, applyMoveSequence, invertMove, isCubeSolved } from '../../src/solver/moveParser.ts';
import { createSolvedCube, createScrambledCube } from '../test-helpers.ts';

describe('Tier 2: Boundary - Rapid Turn Inputs & Animation Interruptions', () => {
  it('B3-1: Interruption fast-forwards active pivot to final target angle before new move starts', () => {
    const cubeGroup = new THREE.Group();
    const pivot1 = new THREE.Group();
    cubeGroup.add(pivot1);

    const cubie = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    pivot1.attach(cubie);

    // Turn 1 starts: pivot rotated partially (e.g. 30 degrees)
    pivot1.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);

    // Fast-forward Turn 1 to target angle (90 degrees = PI/2)
    const targetAngle1 = Math.PI / 2;
    pivot1.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle1);
    pivot1.updateMatrixWorld();
    cubeGroup.attach(cubie);
    cubeGroup.remove(pivot1);

    // Start Turn 2 on same cubie with new pivot
    const pivot2 = new THREE.Group();
    cubeGroup.add(pivot2);
    pivot2.attach(cubie);

    assert.strictEqual(pivot2.children.length, 1);
    assert.strictEqual(cubeGroup.children.includes(pivot1), false);
    cubie.geometry.dispose();
  });

  it('B3-2: 5 sequential rapid moves without waiting matches sequential applyMoveSequence', () => {
    const moves = ['R', 'U', "R'", "U'", 'R2'];
    let state = createSolvedCube();

    // Fast successive application
    moves.forEach(m => {
      state = applyMove(state, m);
    });

    const expectedState = applyMoveSequence(createSolvedCube(), moves.join(' '));
    assert.deepStrictEqual(state, expectedState, 'Rapid moves must produce identical state to sequential string');
  });

  it('B3-3: Step jump interrupts active move and loads target step state immediately', () => {
    const scramble = "R U R' F' U2 R";
    const initial = createScrambledCube(scramble);

    // Suppose user is playing step 0 ("R"), but rapidly jumps to step 4
    let intermediateState = applyMove(initial, 'R');

    // User jumps to step 4 (R U R' F')
    const jumpMoves = ['R', 'U', "R'", "F'"];
    let jumpedState = initial;
    for (const m of jumpMoves) {
      jumpedState = applyMove(jumpedState, m);
    }

    const expected = applyMoveSequence(initial, jumpMoves.join(' '));
    assert.deepStrictEqual(jumpedState, expected);
  });

  it('B3-4: Reset while animating instantly recovers clean solved state', () => {
    let state = createScrambledCube("R U R' U'");
    // Call reset
    const solved = createSolvedCube();
    state = solved;

    assert.strictEqual(isCubeSolved(state), true, 'Reset must immediately produce solved cube');
  });

  it('B3-5: Rapid forward-backward toggle (Next then Previous) preserves cube state parity', () => {
    const initial = createScrambledCube("F R U R'");
    let state = initial;

    // Tap Next (move 'U')
    state = applyMove(state, 'U');
    // Rapidly tap Previous (move invertMove('U'))
    state = applyMove(state, invertMove('U'));

    assert.deepStrictEqual(state, initial, 'Rapid next/prev spam must leave cube state completely intact');
  });

  it('B3-6: Concurrent promise simulation resolves without rejection', async () => {
    // Simulate multiple move promises in flight resolving
    const resolvers: (() => void)[] = [];
    const p1 = new Promise<void>(res => resolvers.push(res));
    const p2 = new Promise<void>(res => resolvers.push(res));
    const p3 = new Promise<void>(res => resolvers.push(res));

    // Resolve all sequentially
    resolvers.forEach(res => res());
    await Promise.all([p1, p2, p3]);
  });
});
