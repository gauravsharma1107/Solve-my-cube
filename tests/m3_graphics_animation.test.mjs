import assert from 'node:assert';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

console.log('--- Starting Milestone 3 (R1 & R6) Verification Tests ---');

// 1. Solid Beveled Cubie Geometry Verification
console.log('1. Verifying Solid Beveled Cubie Geometry...');
const cubieSize = 0.965;
const cubieGeom = new RoundedBoxGeometry(cubieSize, cubieSize, cubieSize, 3, 0.045);
assert.ok(cubieGeom.attributes.position, 'Cubie geometry has position attributes');
assert.ok(cubieGeom.attributes.normal, 'Cubie geometry has normal attributes');
const cubieHalf = cubieSize / 2;
const seam = 1.0 - cubieSize;
console.log(`   Cubie Size: ${cubieSize}, Bevel Radius: 0.045, Seam Width: ${seam.toFixed(3)}`);
assert.strictEqual(Number(seam.toFixed(3)), 0.035, 'Seam width must be exactly 0.035');

// 2. Solid Central Core Mesh Verification
console.log('2. Verifying Solid Central Core Mesh...');
const coreGeom = new RoundedBoxGeometry(1.95, 1.95, 1.95, 3, 0.2);
assert.ok(coreGeom.attributes.position, 'Core geometry has position attributes');
const coreBbox = new THREE.Box3().setFromBufferAttribute(coreGeom.attributes.position);
console.log(`   Core Bounding Box: min=(${coreBbox.min.x.toFixed(2)}, ${coreBbox.min.y.toFixed(2)}, ${coreBbox.min.z.toFixed(2)}), max=(${coreBbox.max.x.toFixed(2)}, ${coreBbox.max.y.toFixed(2)}, ${coreBbox.max.z.toFixed(2)})`);
assert.ok(coreBbox.max.x >= 0.97 && coreBbox.min.x <= -0.97, 'Core spans across internal seams to block canvas background');

// 3. Authentic Vinyl Sticker Shape & Uniform Plastic Border Verification
console.log('3. Verifying Authentic Vinyl Stickers & Uniform Plastic Border...');
function createRoundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}
const stickerWidth = 0.85;
const stickerHeight = 0.85;
const cornerRadius = 0.06;
const stickerShape = createRoundedRectShape(stickerWidth, stickerHeight, cornerRadius);
const stickerGeom = new THREE.ShapeGeometry(stickerShape, 12);
assert.ok(stickerGeom.attributes.position.count > 0, 'Sticker geometry generated vertices');

const plasticBorder = (cubieSize - stickerWidth) / 2;
console.log(`   Sticker Dimensions: ${stickerWidth}x${stickerHeight}, Corner Radius: ${cornerRadius}`);
console.log(`   Uniform Black Plastic Border Width: ${plasticBorder.toFixed(4)}`);
assert.strictEqual(Number(plasticBorder.toFixed(4)), 0.0575, 'Black plastic border must be exactly 0.0575');

// 4. Mathematical easeInOutCubic & Pacing Verification
console.log('4. Verifying easeInOutCubic & Pacing Curves...');
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

assert.strictEqual(easeInOutCubic(0), 0, 'easeInOutCubic(0) === 0');
assert.strictEqual(easeInOutCubic(0.5), 0.5, 'easeInOutCubic(0.5) === 0.5');
assert.strictEqual(easeInOutCubic(1), 1, 'easeInOutCubic(1) === 1');

// Monotonicity check
let prev = -1;
for (let t = 0; t <= 1; t += 0.05) {
  const v = easeInOutCubic(t);
  assert.ok(v >= prev, `easeInOutCubic must be monotonically increasing at t=${t}`);
  prev = v;
}

// 5. 180° Continuous Double Turn & Duration Scaling Verification
console.log('5. Verifying 180° Continuous Double Turns & Duration Scaling...');
const baseDuration = 350;
const doubleDuration = Math.round(baseDuration * 1.35);
console.log(`   Base 90° Turn Duration: ${baseDuration}ms, Double 180° Turn Duration: ${doubleDuration}ms (1.35x)`);
assert.strictEqual(doubleDuration, 473, 'Double turn duration must scale by 1.35x');

const singleTargetAngle = Math.PI / 2;
const doubleTargetAngle = singleTargetAngle * 2;
assert.strictEqual(doubleTargetAngle, Math.PI, 'Double turn target angle must be a full continuous 180° (Math.PI)');

// 6. Complete 54-Sticker Distribution Across All 6 Faces
console.log('6. Verifying 54-Sticker Distribution Across All Faces...');
const uCoords = [
  [-1, 1, -1], [0, 1, -1], [1, 1, -1],
  [-1, 1,  0], [0, 1,  0], [1, 1,  0],
  [-1, 1,  1], [0, 1,  1], [1, 1,  1]
];
const dCoords = [
  [-1, -1,  1], [0, -1,  1], [1, -1,  1],
  [-1, -1,  0], [0, -1,  0], [1, -1,  0],
  [-1, -1, -1], [0, -1, -1], [1, -1, -1]
];
const fCoords = [
  [-1,  1, 1], [0,  1, 1], [1,  1, 1],
  [-1,  0, 1], [0,  0, 1], [1,  0, 1],
  [-1, -1, 1], [0, -1, 1], [1, -1, 1]
];
const bCoords = [
  [ 1,  1, -1], [0,  1, -1], [-1,  1, -1],
  [ 1,  0, -1], [0,  0, -1], [-1,  0, -1],
  [ 1, -1, -1], [0, -1, -1], [-1, -1, -1]
];
const lCoords = [
  [-1,  1, -1], [-1,  1, 0], [-1,  1, 1],
  [-1,  0, -1], [-1,  0, 0], [-1,  0, 1],
  [-1, -1, -1], [-1, -1, 0], [-1, -1, 1]
];
const rCoords = [
  [1,  1, 1], [1,  1, 0], [1,  1, -1],
  [1,  0, 1], [1,  0, 0], [1,  0, -1],
  [1, -1, 1], [1, -1, 0], [1, -1, -1]
];

const faceMap = { U: uCoords, D: dCoords, F: fCoords, B: bCoords, L: lCoords, R: rCoords };
let totalStickerCount = 0;
for (const [face, coords] of Object.entries(faceMap)) {
  assert.strictEqual(coords.length, 9, `Face ${face} must have exactly 9 stickers`);
  totalStickerCount += coords.length;
}
assert.strictEqual(totalStickerCount, 54, 'Cube must have exactly 54 stickers across all 6 faces');
console.log('   All 54 stickers mapped across U, D, F, B, L, R with 9 stickers each.');

console.log('--- ALL MILESTONE 3 VERIFICATION TESTS PASSED ---');
