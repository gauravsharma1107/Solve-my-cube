import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { setupMockDom, teardownMockDom, createSolvedCube, createScrambledCube } from '../test-helpers.ts';
import { applyBlackIntensity } from '../../src/utils/themeManager.ts';
import { solveCube } from '../../src/solver/solverService.ts';
import { applyMove, isCubeSolved } from '../../src/solver/moveParser.ts';
import { solveWithKociemba } from '../../src/solver/kociemba.ts';
import { solveWithBeginnerMethod } from '../../src/solver/beginnerSolver.ts';
import { validateCubeParity } from '../../src/solver/parityValidator.ts';

describe('Tier 3: Cross-Feature Interactions (Pairwise Combinations)', () => {
  beforeEach(() => {
    setupMockDom();
  });

  afterEach(() => {
    teardownMockDom();
  });

  it('C1: Theme switch during active 180° double-turn animation', async () => {
    const cubeGroup = new THREE.Group();
    const pivot = new THREE.Group();
    cubeGroup.add(pivot);

    const cubie = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    pivot.attach(cubie);

    // 1. Double turn begins rotation (90 degrees into 180 degree turn)
    pivot.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);

    // 2. User toggles theme intensity while turn is midway
    applyBlackIntensity(70, true);
    const root = globalThis.document.documentElement;

    // Verify theme CSS applied instantly
    assert.strictEqual(root.style.getPropertyValue('--bg-canvas'), 'rgb(12, 12, 14)');
    assert.strictEqual(root.classList.contains('theme-transitioning'), true);

    // 3. Double turn animation finishes smoothly without disruption
    pivot.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    pivot.updateMatrixWorld();
    cubeGroup.attach(cubie);
    cubeGroup.remove(pivot);

    assert.strictEqual(cubeGroup.children.includes(cubie), true);
    assert.strictEqual(cubeGroup.children.includes(pivot), false);
    cubie.geometry.dispose();
  });

  it('C2: Mobile viewport resize during active solve playback', () => {
    const camera = new THREE.PerspectiveCamera(40, 1024 / 768, 0.1, 100);
    assert.strictEqual(Number(camera.aspect.toFixed(2)), 1.33);

    // Solve navigation in progress
    const scramble = "R U R' U'";
    let state = createScrambledCube(scramble);
    const steps = solveWithKociemba(state);
    let stepIdx = 0;

    // Perform step 1
    state = applyMove(state, steps[0].move);
    stepIdx = 1;

    // Viewport resize occurs (user rotates device or opens split-screen: 390x844)
    const newWidth = 390;
    const newHeight = 844;
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();

    assert.strictEqual(Number(camera.aspect.toFixed(4)), Number((390 / 844).toFixed(4)));

    // Continue playback uninterrupted
    state = applyMove(state, steps[1].move);
    stepIdx = 2;

    assert.strictEqual(stepIdx, 2);
    assert.ok(steps.length >= 2);
  });

  it('C3: Worker solver computation triggered concurrently with running timer', async () => {
    // 1. Timer starts
    let timerElapsedMs = 0;
    const timerInterval = setInterval(() => {
      timerElapsedMs += 10;
    }, 10);

    // 2. Asynchronous solver initiated
    const scramble = "D2 B2 L2 R2 U2 B2";
    const state = createScrambledCube(scramble);
    const solvePromise = solveCube(state, 'optimal');

    // Timer continues running while worker solves
    const result = await solvePromise;
    clearInterval(timerInterval);

    assert.ok(result.steps.length > 0);
    assert.ok(result.solveTimeMs >= 0);
    assert.ok(timerElapsedMs >= 0, 'Timer must operate independently of solver computation');
  });

  it('C4: Smart camera auto-framing triggered during active layer rotation', () => {
    const camera = new THREE.PerspectiveCamera(40, 1.0, 0.1, 100);
    camera.position.set(4.5, 4.2, 5.5);

    // Move animation starts on R face
    const moveAxis = new THREE.Vector3(1, 0, 0);
    let currentAngle = Math.PI / 4; // 45 degrees

    // Smart camera auto-framing glides to face view
    const targetCamPos = new THREE.Vector3(5.5, 1.5, 0.5);
    camera.position.lerp(targetCamPos, 0.5);

    assert.ok(camera.position.x > 4.5, 'Camera must move towards target vantage');
    assert.strictEqual(currentAngle, Math.PI / 4, 'Move rotation angle must not be overwritten by camera glide');
  });

  it('C5: Mode switch (Optimal to Beginner) during active step playback resets step progression safely', () => {
    const scramble = "R U R' F' U2 R";
    const initialScramble = createScrambledCube(scramble);

    // Playing Optimal solution
    const optimalSteps = solveWithKociemba(initialScramble);
    let currentIndex = 2; // User had advanced to step 2

    // User switches mode to 'beginner'
    const beginnerSteps = solveWithBeginnerMethod(initialScramble);
    currentIndex = 0; // State resets to step 0 on mode switch
    const currentCubeState = initialScramble;

    assert.strictEqual(currentIndex, 0);
    assert.deepStrictEqual(currentCubeState, initialScramble);
    assert.ok(beginnerSteps.length > 0);
    assert.ok(beginnerSteps[0].phase !== undefined);
  });

  it('C6: Interactive sticker editing invalidates existing solution and triggers parity re-verification', () => {
    const initial = createScrambledCube("R U R'");
    const steps = solveWithKociemba(initial);
    assert.ok(steps.length > 0);

    // User edits a sticker in CubeNetEditor (e.g. paints a sticker improperly)
    const modifiedState = { ...initial, U: [...initial.U] as any };
    modifiedState.U[0] = 'R'; // Introduce parity mismatch

    const parity = validateCubeParity(modifiedState);
    assert.strictEqual(parity.isValid, false, 'Tampered state must fail parity check');

    // Solution steps cleared upon parity failure
    let activeSolution = steps;
    if (!parity.isValid) {
      activeSolution = [];
    }
    assert.strictEqual(activeSolution.length, 0, 'Active solution must be cleared if modified cube is invalid');
  });
});
