# Test Infrastructure Architecture & Inventory (Rubik's Cube Solver Overhaul)

## 1. Overview & Architecture

The test infrastructure for the Rubik's Cube Solver Overhaul provides a high-performance, deterministic, zero-flakiness opaque-box testing framework.

### Key Architectural Pillars
1. **Test Runner**: Node.js v24 Native Test Runner (`node:test`) using `spec` reporting and assertion primitives (`node:assert`).
2. **Native TypeScript & TSX Support**:
   - Node `--experimental-strip-types` for native zero-transpilation TypeScript type stripping.
   - Module registration hook (`tests/register.js` & `tests/ts-loader.js`) resolving extensionless imports and utilizing `sucrase` for on-the-fly JSX/TSX compilation.
3. **Headless 3D & Math Parity**:
   - Direct execution of Three.js vector mathematics, geometries (`RoundedBoxGeometry`, `ShapeGeometry`, `EdgesGeometry`), materials, and color spaces (`SRGBColorSpace`, `ACESFilmicToneMapping`) without headless browser GPU bloat.
   - Kociemba two-phase table generation, move optimization, parity validation, and beginner layer algorithms executed natively in Node.
4. **Mock DOM & Storage Isolation (`tests/test-helpers.ts`)**:
   - In-memory `Proxy`-backed CSS variable and DOM property mocks (`document.documentElement.style`, `localStorage`, `requestAnimationFrame`).
   - Clean `beforeEach` and `afterEach` setup/teardown ensuring 100% test isolation with zero cross-test leakage.

---

## 2. Invocation Commands

### Run Full 4-Tier Test Suite
```bash
npm test
```
*Equivalent explicit command:*
```bash
node --import ./tests/register.js --experimental-strip-types tests/run-all.js
```

### Run Specific Tier or Single Test File
```bash
# Run specific tier
node --import ./tests/register.js --experimental-strip-types --test "tests/tier1/*.test.ts"
node --import ./tests/register.js --experimental-strip-types --test "tests/tier2/*.test.ts"
node --import ./tests/register.js --experimental-strip-types --test "tests/tier3/*.test.ts"
node --import ./tests/register.js --experimental-strip-types --test "tests/tier4/*.test.ts"

# Run individual test file
node --import ./tests/register.js --experimental-strip-types --test tests/tier1/f1-theme-sync.test.ts
```

---

## 3. Test Suite Inventory

### Tier 1: Feature Coverage (14 Suites, 84 Tests)
Each feature (F1 through F14) has at least 6 comprehensive requirement-derived tests:
- **`tests/tier1/f1-theme-sync.test.ts`** (F1: Instant Pre-Paint Theme Sync - 6 tests)
  - Default theme fallback when storage empty (100% OLED true black).
  - Synchronous CSS variable assignment (`--bg-canvas`, `backgroundColor`).
  - Preset value mappings (`obsidian`, `charcoal`, `graphite`).
  - Absence of `theme-transitioning` class during initial load (zero unstyled flash).
  - Dynamic `theme-transitioning` application during user adjustment.
  - Verification of `index.html` viewport-fit and pre-paint contracts.
- **`tests/tier1/f2-worker-solver.test.ts`** (F2: Web Worker Solver Offloading - 6 tests)
  - Idempotent background solver initialization (`initSolverService`).
  - Interface contract conformity (`SolveResult`, `steps`, `algorithmName`, `solveTimeMs`).
  - Zero-step response for already solved cubes.
  - Optimal two-phase solve execution leading to verified solved state.
  - Beginner method educational stage partitioning.
  - Deep scramble resolution without main thread freezing.
- **`tests/tier1/f3-code-splitting.test.ts`** (F3: Code Splitting & Manual Chunks - 6 tests)
  - Rollup manualChunks configuration for `vendor-three`.
  - Rollup manualChunks configuration for `vendor-react`.
  - Raised `chunkSizeWarningLimit` threshold.
  - Independent importability of heavy feature views (`CameraScanner`, `CubeNetEditor`, `ScrambleAndTimer`, `ThemeSettingsModal`).
  - Elimination of synchronous worker imports in main bundle.
- **`tests/tier1/f4-viewport-layout.test.ts`** (F4: 100dvh Viewport Layout - 6 tests)
  - Mobile meta viewport tag configuration (`viewport-fit=cover`, `maximum-scale=1.0`, `user-scalable=no`).
  - Global CSS scroll jitter prevention (`overflow-x: hidden`).
  - Viewport height budgeting on modern mobile (390px x 844px).
  - Viewport height budgeting on compact mobile (375px x 667px).
  - App root layout height containment.
  - Elimination of tap delay via `touch-manipulation`.
- **`tests/tier1/f5-docked-controls.test.ts`** (F5: Non-Scrolling Docked Controls - 6 tests)
  - Navigation index clamping logic [0, totalSteps].
  - Forward step execution and state updating.
  - Backward step execution with exact move inversion.
  - Instant step jumping without cumulative animation latency.
  - Playback timing scaling formula inversely proportional to speed multiplier.
  - Ergonomic touch button presence in docked guide.
- **`tests/tier1/f6-dual-hud.test.ts`** (F6: Unified Dual-Audience HUD - 6 tests)
  - Complete 18-move WCA dictionary with beginner steering analogies.
  - SolutionStep creation with notation, face, turns, and phase.
  - Elimination of in-canvas occluding bottom banner on mobile (`hidden lg:block`).
  - Next step lookahead pill accuracy.
  - Single, prime, and double move parsing.
  - Clear steering analogies ("steering wheel", "push up", "pull down", "flick left").
- **`tests/tier1/f7-solid-cubies-core.test.ts`** (F7: Solid Beveled Cubies & Core Mesh - 6 tests)
  - Beveled cubie geometry `RoundedBoxGeometry(0.965, 0.965, 0.965, 3, 0.045)`.
  - Internal solid core mesh `RoundedBoxGeometry(1.95, 1.95, 1.95, 3, 0.2)` at origin (0, 0, 0).
  - 27 cubie grid coordinate positioning across 3x3x3 space.
  - Core mesh origin alignment blocking see-through light seams.
  - Speedcube plastic material properties (`color: 0x111111`, `roughness: 0.55`, `metalness: 0.1`).
  - Seam spacing calculation yielding tight 0.035 gaps.
- **`tests/tier1/f8-vinyl-stickers.test.ts`** (F8: Authentic Vinyl Sticker Meshes - 6 tests)
  - Rounded rectangle sticker geometry (0.85 x 0.85, corner radius 0.06).
  - Exact 54 sticker count across 6 faces.
  - Authentic satin vinyl finish (`roughness: 0.18`, `metalness: 0.0`).
  - Uniform 0.0575 black plastic bevel borders surrounding stickers.
  - Precise outer offset (`halfDist: 0.4855`) preventing z-fighting.
  - Official Rubik's color mapping in `CUBE_COLORS`.
- **`tests/tier1/f9-studio-lighting.test.ts`** (F9: Studio Lighting & Tone Mapping - 6 tests)
  - Three.js renderer tone mapping and color space constants (`SRGBColorSpace`, `ACESFilmicToneMapping`).
  - Base ambient fill (0.55 intensity) preventing dark crevices.
  - Balanced 3-point studio lighting (Key 2.0, Fill 0.85, Rim 1.1).
  - Diagonal 3D light positioning preventing unlit faces.
  - Grounding contact shadow plane (5.4 x 5.4 at -2.25 Y).
  - Scene graph lighting hierarchy.
- **`tests/tier1/f10-smooth-180-turns.test.ts`** (F10: Smooth Continuous 180° Turns - 6 tests)
  - 180° continuous rotation angle (Math.PI) around face normal.
  - Duration scaling factor (1.35x) for authentic speedcube pacing.
  - `easeInOutCubic` easing continuity and zero start/end jerk.
  - Normal axis alignment across all 6 faces.
  - Identity parity for consecutive 180° rotations (360° total).
  - Move inversion symmetry (`invertMove('R2') === 'R2'`).
- **`tests/tier1/f11-snapback-glitch.test.ts`** (F11: Snapback Glitch Elimination - 6 tests)
  - Prevention of premature cubie transform resets in animation loop.
  - Synchronous sticker material updating and grid realignment in identical frame.
  - Fast-forward mechanism for interrupted animations.
  - Coordinate reset accuracy restoring identity coordinates and quaternions.
  - Elimination of 1-frame visual rollback flash.
  - Multi-cubie scene graph attachment and detachment integrity.
- **`tests/tier1/f12-orbiting-arcs.test.ts`** (F12: Exterior Orbiting Indicator Arcs - 6 tests)
  - Exterior center offset (1.72) clearing cube silhouette (1.5 max extent).
  - Unidirectional 195° sweep arc for 180° turns without opposing arrowheads.
  - Angular direction differentiation between clockwise and counter-clockwise turns.
  - Tangent-aligned cone arrowhead geometry.
  - High renderOrder (999) and unoccluded depth visibility.
  - Orthogonal basis vectors for all 6 faces.
- **`tests/tier1/f13-depth-ghosting.test.ts`** (F13: Dual-Pass Depth-Aware Ghosting - 6 tests)
  - Active layer collar bounding box dimensions (3.08 x 1.05 x 3.08).
  - Center positioning for all 6 faces.
  - Wireframe `EdgesGeometry` LineSegments configuration.
  - Depth-aware visibility parameters through solid core.
  - Geometry and material cleanup lifecycle.
  - Axis orientation adaptability for R/L, U/D, and F/B layers.
- **`tests/tier1/f14-camera-framing.test.ts`** (F14: Smart Camera Auto-Framing - 6 tests)
  - Default perspective vantage point (4.5, 4.2, 5.5).
  - Distinct vantage point calculation for all 6 faces.
  - Canonical view restoration via camera reset.
  - OrbitControls damping and boundary constraints [3.5, 12].
  - Smooth camera interpolation with cubic easing.
  - Origin focus vector alignment.

### Tier 2: Boundary & Corner Cases (5 Suites, 30 Tests)
- **`tests/tier2/boundary-viewports.test.ts`** (6 tests):
  - Ultra-narrow 320px mobile screens (iPhone SE gen 1).
  - Modern compact 375px screens.
  - Flagship 390px screens.
  - Max mobile threshold boundary 430px screens.
  - Ultra-wide landscape mobile aspect ratio (844px x 390px, >2.1:1).
  - Tablet breakpoint threshold (768px).
- **`tests/tier2/boundary-localstorage.test.ts`** (6 tests):
  - Corrupt non-numeric strings ('undefined', 'NaN', 'null', invalid JSON).
  - Out-of-bounds intensity values (negative numbers, >100).
  - Empty or whitespace strings.
  - String preset identifiers ('oled', 'obsidian', 'charcoal', 'graphite').
  - Storage exceptions (`QuotaExceededError`, `SecurityError`) handled gracefully.
  - Extreme float values clamped and parsed safely.
- **`tests/tier2/boundary-rapid-turns.test.ts`** (6 tests):
  - Fast-forward interruption during active turn animation.
  - 5 rapid consecutive turns without waiting for completion.
  - Step jump interruption during active turn.
  - Instant reset during active turn.
  - Rapid Next/Previous toggle spamming.
  - Concurrent promise resolution.
- **`tests/tier2/boundary-animation-speeds.test.ts`** (6 tests):
  - 0ms duration execution.
  - Negative or zero speed multiplier clamping (minimum 120ms).
  - Extreme fast playback multiplier (10x, clamped to 500ms).
  - Extreme slow playback multiplier (0.1x, 14000ms delay).
  - Consistent 1.35x scaling on 180° turns across all speeds.
  - Fractional speed multipliers producing integer milliseconds.
- **`tests/tier2/boundary-invalid-inputs.test.ts`** (6 tests):
  - Empty or whitespace move strings.
  - Malformed non-standard move strings ('X', 'r', 'U4', 'INVALID').
  - Parity check: sticker count mismatches.
  - Parity check: impossible edge sharing opposite colors (White & Yellow).
  - Parity check: impossible corner sharing duplicate colors.
  - Parity check: unassigned placeholder 'X' stickers.

### Tier 3: Cross-Feature Interactions (1 Suite, 6 Tests)
- **`tests/tier3/cross-feature-interactions.test.ts`** (6 tests):
  - Theme switch during active 180° double-turn animation.
  - Mobile viewport resize during active solve playback.
  - Background worker solver computation while timer runs.
  - Smart camera auto-framing triggered during active layer rotation.
  - Solver mode switch (Optimal <-> Beginner) during active step playback.
  - Interactive sticker editing invalidating active solution and triggering parity re-verification.

### Tier 4: Real-World Scenarios (1 Suite, 5 Tests)
- **`tests/tier4/real-world-scenarios.test.ts`** (5 tests):
  - Scenario 1: Full Scramble to Kociemba Two-Phase Solve workflow (16-move WCA scramble -> parity check -> solve -> step navigation to solved state).
  - Scenario 2: Beginner Method 5-stage educational flow with stage labeling and step execution to solved cube.
  - Scenario 3: 3D Net manual paint to solve flow with fanfare trigger verification.
  - Scenario 4: Camera scan guide flow across 6 faces with center invariant validation and solver handoff.
  - Scenario 5: Scramble & Speedcubing Timer training workflow with move parity and inspection verification.

---

## 4. Total Metrics Summary
- **Total Test Suites**: 21
- **Total Executable Tests**: 125
- **Tier 1 (Feature Coverage)**: 84 tests
- **Tier 2 (Boundary & Corner Cases)**: 30 tests
- **Tier 3 (Cross-Feature Interactions)**: 6 tests
- **Tier 4 (Real-World Scenarios)**: 5 tests
- **Pass Rate**: 100% (125 passed, 0 failed)
