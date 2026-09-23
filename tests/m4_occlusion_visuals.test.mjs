import assert from 'node:assert';
import * as THREE from 'three';
import {
  FACE_NORMALS,
  OPTIMAL_VANTAGE_POINTS,
  DUAL_PASS_CONFIG,
  computeFaceCameraDot,
  shouldAutoFrameFace,
  getRotationArcParameters,
  createLayerCollarGeometry
} from '../src/components/Cube3DViewer.tsx';

console.log('--- Starting Milestone 4 (R5: Tri-Pillar Move Occlusion) Verification Tests ---');

// 1. Pillar 1: Smart Camera Auto-Framing Math & Vantage Verification
console.log('1. Verifying Pillar 1: Smart Camera Auto-Framing Math...');
const defaultCam = new THREE.Vector3(4.5, 4.2, 5.5);

// Test dot products from default camera
const dotU = computeFaceCameraDot('U', defaultCam);
const dotF = computeFaceCameraDot('F', defaultCam);
const dotR = computeFaceCameraDot('R', defaultCam);
const dotB = computeFaceCameraDot('B', defaultCam);
const dotL = computeFaceCameraDot('L', defaultCam);
const dotD = computeFaceCameraDot('D', defaultCam);

console.log(`   Default Camera Face Dot Products: U=${dotU.toFixed(3)}, F=${dotF.toFixed(3)}, R=${dotR.toFixed(3)}, B=${dotB.toFixed(3)}, L=${dotL.toFixed(3)}, D=${dotD.toFixed(3)}`);

assert.ok(dotU >= 0.25, 'U is visible from default camera');
assert.ok(dotF >= 0.25, 'F is visible from default camera');
assert.ok(dotR >= 0.25, 'R is visible from default camera');
assert.ok(dotB < 0.25, 'B is obscured from default camera (dot < 0.25)');
assert.ok(dotL < 0.25, 'L is obscured from default camera (dot < 0.25)');
assert.ok(dotD < 0.25, 'D is obscured from default camera (dot < 0.25)');

// Verify auto-framing trigger
assert.strictEqual(shouldAutoFrameFace('B', defaultCam), true, 'B move triggers camera glide');
assert.strictEqual(shouldAutoFrameFace('L', defaultCam), true, 'L move triggers camera glide');
assert.strictEqual(shouldAutoFrameFace('D', defaultCam), true, 'D move triggers camera glide');
assert.strictEqual(shouldAutoFrameFace('U', defaultCam), false, 'U move does not jump camera');
assert.strictEqual(shouldAutoFrameFace('F', defaultCam), false, 'F move does not jump camera');
assert.strictEqual(shouldAutoFrameFace('R', defaultCam), false, 'R move does not jump camera');

// Verify all optimal 3/4 vantage points
const faces = ['U', 'D', 'F', 'B', 'L', 'R'];
for (const face of faces) {
  const vp = OPTIMAL_VANTAGE_POINTS[face];
  const dot = computeFaceCameraDot(face, vp);
  console.log(`   Optimal Vantage for ${face}: (${vp.x}, ${vp.y}, ${vp.z}) -> dot = ${dot.toFixed(3)}`);
  assert.ok(dot > 0.65, `${face} vantage must position face with dot > 0.65`);
  assert.notStrictEqual(vp.x, 0);
  assert.notStrictEqual(vp.y, 0);
  assert.notStrictEqual(vp.z, 0);
}

// 2. Pillar 2: Exterior Orbiting Indicator Arcs Verification
console.log('2. Verifying Pillar 2: Exterior Orbiting Indicator Arcs...');
const arcParams = getRotationArcParameters('U');
assert.strictEqual(arcParams.arcRadius, 1.90, 'Indicator arc radius must be exactly 1.90');
assert.ok(arcParams.arcRadius > 1.50, 'Arc radius must extend beyond 1.50 cube boundary');

// 180° double-turn unidirectional 195° arc verification
const doubleMoves = ['U2', 'D2', 'F2', 'B2', 'L2', 'R2'];
for (const m of doubleMoves) {
  const p = getRotationArcParameters(m);
  assert.strictEqual(p.isDouble, true);
  const deg = Math.round(Math.abs(p.sweepAngle) * (180 / Math.PI));
  assert.strictEqual(deg, 195, `${m} double turn arc must sweep exactly 195°`);
}
console.log('   All 180° double turns have unidirectional 195° continuous sweep.');

// 3. Pillar 3: Dual-Pass Depth-Aware Ghosting Verification
console.log('3. Verifying Pillar 3: Dual-Pass Depth-Aware Ghosting Parameters...');
assert.strictEqual(DUAL_PASS_CONFIG.pass1.depthFunc, THREE.GreaterDepth, 'Pass 1 must use GreaterDepth');
assert.strictEqual(DUAL_PASS_CONFIG.pass1.transparent, true, 'Pass 1 must be transparent');
assert.strictEqual(DUAL_PASS_CONFIG.pass1.opacity, 0.35, 'Pass 1 opacity must be 0.35');
assert.strictEqual(DUAL_PASS_CONFIG.pass1.depthWrite, false, 'Pass 1 depthWrite must be false');
assert.strictEqual(DUAL_PASS_CONFIG.pass1.renderOrder, 998, 'Pass 1 renderOrder must be 998');

assert.strictEqual(DUAL_PASS_CONFIG.pass2.depthFunc, THREE.LessEqualDepth, 'Pass 2 must use LessEqualDepth');
assert.strictEqual(DUAL_PASS_CONFIG.pass2.transparent, false, 'Pass 2 must be opaque (transparent: false)');
assert.strictEqual(DUAL_PASS_CONFIG.pass2.opacity, 1.0, 'Pass 2 opacity must be 1.0');
assert.strictEqual(DUAL_PASS_CONFIG.pass2.renderOrder, 999, 'Pass 2 renderOrder must be 999');
console.log('   Dual-pass depth parameters match GreaterDepth (0.35) and LessEqualDepth (1.0).');

// 4. Active Layer Visuals: Exterior Glowing Collar / Halo Verification
console.log('4. Verifying Active Layer Visuals: Exterior Glowing Layer Collar...');
for (const face of faces) {
  const geom = createLayerCollarGeometry(face);
  const bbox = new THREE.Box3().setFromBufferAttribute(geom.attributes.position);
  console.log(`   ${face} Collar Bounding Box: min=(${bbox.min.x.toFixed(2)}, ${bbox.min.y.toFixed(2)}, ${bbox.min.z.toFixed(2)}), max=(${bbox.max.x.toFixed(2)}, ${bbox.max.y.toFixed(2)}, ${bbox.max.z.toFixed(2)})`);

  // Max coordinates in collar must reach >= 1.55 (outside 1.50)
  const maxExtent = Math.max(Math.abs(bbox.max.x), Math.abs(bbox.max.y), Math.abs(bbox.max.z));
  assert.ok(maxExtent >= 1.55, `${face} collar must extend outside 1.50 cube`);

  geom.dispose();
}
console.log('   All 6 face layer collars sit on active slice perimeter outside 1.50 cube.');

console.log('--- ALL MILESTONE 4 VERIFICATION TESTS PASSED ---');
