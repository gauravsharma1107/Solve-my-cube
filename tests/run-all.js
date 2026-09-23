import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tier1Files = [
  'tier1/f1-theme-sync.test.ts',
  'tier1/f2-worker-solver.test.ts',
  'tier1/f3-code-splitting.test.ts',
  'tier1/f4-viewport-layout.test.ts',
  'tier1/f5-docked-controls.test.ts',
  'tier1/f6-dual-hud.test.ts',
  'tier1/f7-solid-cubies-core.test.ts',
  'tier1/f8-vinyl-stickers.test.ts',
  'tier1/f9-studio-lighting.test.ts',
  'tier1/f10-smooth-180-turns.test.ts',
  'tier1/f11-snapback-glitch.test.ts',
  'tier1/f12-orbiting-arcs.test.ts',
  'tier1/f13-depth-ghosting.test.ts',
  'tier1/f14-camera-framing.test.ts',
].map(f => path.resolve(__dirname, f));

const tier2Files = [
  'tier2/boundary-viewports.test.ts',
  'tier2/boundary-localstorage.test.ts',
  'tier2/boundary-rapid-turns.test.ts',
  'tier2/boundary-animation-speeds.test.ts',
  'tier2/boundary-invalid-inputs.test.ts',
].map(f => path.resolve(__dirname, f));

const tier3Files = [
  'tier3/cross-feature-interactions.test.ts',
].map(f => path.resolve(__dirname, f));

const tier4Files = [
  'tier4/real-world-scenarios.test.ts',
].map(f => path.resolve(__dirname, f));

const allFiles = [...tier1Files, ...tier2Files, ...tier3Files, ...tier4Files];

console.log('='.repeat(70));
console.log(" Rubik's Cube Solver Overhaul - Comprehensive 4-Tier E2E Test Suite");
console.log('='.repeat(70));
console.log(`[Tier 1: Feature Coverage]            ${tier1Files.length} suites (F1 - F14)`);
console.log(`[Tier 2: Boundary & Corner Cases]     ${tier2Files.length} suites (B1 - B5)`);
console.log(`[Tier 3: Cross-Feature Interactions]  ${tier3Files.length} suites (Pairwise)`);
console.log(`[Tier 4: Real-World Scenarios]        ${tier4Files.length} suites (Scenarios S1 - S5)`);
console.log(`Total Test Files: ${allFiles.length}`);
console.log('='.repeat(70));

const testStream = run({
  files: allFiles,
  concurrency: false,
});

testStream.compose(new spec()).pipe(process.stdout);

testStream.on('error', (err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

testStream.on('end', () => {
  console.log('\n' + '='.repeat(70));
  console.log(' All 4-Tier E2E Test Suites Completed Successfully!');
  console.log('='.repeat(70));
});
