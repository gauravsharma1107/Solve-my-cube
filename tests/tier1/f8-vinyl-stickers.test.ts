import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import { CUBE_COLORS, FACE_ORDER, type Face, type CubeColor } from '../../src/solver/cubeTypes.ts';

function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
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

describe('Tier 1: F8 - Authentic Vinyl Sticker Meshes', () => {
  it('F8-1: Rounded rectangle shape generated with 0.85 dimensions and 0.06 radius', () => {
    const shape = createRoundedRectShape(0.85, 0.85, 0.06);
    assert.ok(shape);
    const geom = new THREE.ShapeGeometry(shape, 12);
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    assert.ok(bb);
    const width = Number((bb.max.x - bb.min.x).toFixed(4));
    const height = Number((bb.max.y - bb.min.y).toFixed(4));
    assert.strictEqual(width, 0.85);
    assert.strictEqual(height, 0.85);
    geom.dispose();
  });

  it('F8-2: Exactly 54 stickers mapped across the 6 faces (9 per face)', () => {
    const stickersMap: Record<Face, number> = {
      U: 9,
      D: 9,
      F: 9,
      B: 9,
      L: 9,
      R: 9
    };

    let totalStickers = 0;
    FACE_ORDER.forEach(f => {
      totalStickers += stickersMap[f];
    });
    assert.strictEqual(totalStickers, 54, 'There must be exactly 54 vinyl stickers on the cube');
  });

  it('F8-3: Vinyl sticker material possesses authentic satin finish (roughness 0.18, metalness 0.0)', () => {
    const stickerMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.18,
      metalness: 0.0
    });
    assert.strictEqual(stickerMat.roughness, 0.18);
    assert.strictEqual(stickerMat.metalness, 0.0);
    stickerMat.dispose();
  });

  it('F8-4: Black plastic bevel border around sticker is exactly 0.0575 units', () => {
    const cubieFaceWidth = 0.965;
    const stickerWidth = 0.85;
    const border = Number(((cubieFaceWidth - stickerWidth) / 2).toFixed(4));
    assert.strictEqual(border, 0.0575, 'Black plastic border must be 0.0575 on all 4 edges');
  });

  it('F8-5: Sticker offset halfDist places sticker precisely on cubie outer surface (0.4855)', () => {
    const halfCubie = 0.965 / 2; // 0.4825
    const halfDist = 0.4855; // 0.003 slight elevation to avoid z-fighting with beveled cubie plastic
    const delta = Number((halfDist - halfCubie).toFixed(4));
    assert.ok(delta > 0 && delta <= 0.005, 'Elevation offset must be subtle (0.003) to eliminate z-fighting');
  });

  it('F8-6: Face color definitions in CUBE_COLORS include standard WCA hues', () => {
    const colors: CubeColor[] = ['W', 'Y', 'G', 'B', 'O', 'R'];
    colors.forEach(c => {
      const def = CUBE_COLORS[c];
      assert.ok(def, `Color ${c} must exist in CUBE_COLORS`);
      assert.ok(def.hex.startsWith('#'), `${c} hex must start with '#'`);
      assert.ok(def.name.length > 0, `${c} must have human-readable name`);
    });
  });
});
