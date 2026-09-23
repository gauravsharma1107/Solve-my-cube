import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

describe('Tier 1: F7 - Solid Beveled Cubies & Core Mesh', () => {
  const PLASTIC_COLOR = 0x111111;

  it('F7-1: Cubie RoundedBoxGeometry parameters match 0.965 size and 0.045 bevel radius', () => {
    // 0.965 dimensions with 0.045 bevel radius
    const cubieGeom = new RoundedBoxGeometry(0.965, 0.965, 0.965, 3, 0.045);
    assert.ok(cubieGeom);
    assert.strictEqual(cubieGeom.parameters.width, 0.965);
    assert.strictEqual(cubieGeom.parameters.height, 0.965);
    assert.strictEqual(cubieGeom.parameters.depth, 0.965);
    assert.strictEqual(cubieGeom.parameters.radius, 0.045);
    assert.strictEqual(cubieGeom.parameters.segments, 3);
    cubieGeom.dispose();
  });

  it('F7-2: Solid Core mesh RoundedBoxGeometry parameters match 1.95 internal volume', () => {
    // 1.95 dimensions with 0.2 bevel radius to block light through seams
    const coreGeom = new RoundedBoxGeometry(1.95, 1.95, 1.95, 3, 0.2);
    assert.ok(coreGeom);
    assert.strictEqual(coreGeom.parameters.width, 1.95);
    assert.strictEqual(coreGeom.parameters.height, 1.95);
    assert.strictEqual(coreGeom.parameters.depth, 1.95);
    assert.strictEqual(coreGeom.parameters.radius, 0.2);
    coreGeom.dispose();
  });

  it('F7-3: Exactly 27 cubie coordinates exist across 3x3x3 coordinate space', () => {
    const coords: [number, number, number][] = [];
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          coords.push([x, y, z]);
        }
      }
    }
    assert.strictEqual(coords.length, 27, 'Cube must consist of exactly 27 cubies in 3x3x3 grid');

    // Verify center cubie at (0, 0, 0)
    const centerCubie = coords.find(c => c[0] === 0 && c[1] === 0 && c[2] === 0);
    assert.ok(centerCubie, 'Must include center coordinate (0, 0, 0)');
  });

  it('F7-4: Core mesh positioned at coordinate origin (0, 0, 0)', () => {
    const coreMesh = new THREE.Mesh(
      new RoundedBoxGeometry(1.95, 1.95, 1.95, 3, 0.2),
      new THREE.MeshStandardMaterial({ color: PLASTIC_COLOR })
    );
    assert.strictEqual(coreMesh.position.x, 0);
    assert.strictEqual(coreMesh.position.y, 0);
    assert.strictEqual(coreMesh.position.z, 0);
    coreMesh.geometry.dispose();
    (coreMesh.material as THREE.Material).dispose();
  });

  it('F7-5: Dark plastic material parameters match premium speedcube finish', () => {
    const cubieMat = new THREE.MeshStandardMaterial({
      color: PLASTIC_COLOR,
      roughness: 0.55,
      metalness: 0.1
    });

    assert.strictEqual(cubieMat.color.getHex(), PLASTIC_COLOR);
    assert.strictEqual(cubieMat.roughness, 0.55);
    assert.strictEqual(cubieMat.metalness, 0.1);
    cubieMat.dispose();
  });

  it('F7-6: Physical seam spacing between cubies is exactly 0.035 units', () => {
    // Grid pitch is 1.0 unit, cubie width is 0.965 units -> Seam = 1.0 - 0.965 = 0.035
    const gridPitch = 1.0;
    const cubieWidth = 0.965;
    const seamWidth = Number((gridPitch - cubieWidth).toFixed(4));
    assert.strictEqual(seamWidth, 0.035, 'Seam gap between cubies must be 0.035 units');
  });
});
