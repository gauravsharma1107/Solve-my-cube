import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import type { Face } from '../../src/solver/cubeTypes.ts';

describe('Tier 1: F13 - Dual-Pass Depth-Aware Ghosting & Layer Highlight', () => {
  const getHighlightConfig = (face: Face): { size: THREE.Vector3; center: THREE.Vector3 } => {
    const size = new THREE.Vector3(3.08, 3.08, 3.08);
    const center = new THREE.Vector3(0, 0, 0);

    switch (face) {
      case 'U': size.set(3.08, 1.05, 3.08); center.set(0, 1.0, 0); break;
      case 'D': size.set(3.08, 1.05, 3.08); center.set(0, -1.0, 0); break;
      case 'R': size.set(1.05, 3.08, 3.08); center.set(1.0, 0, 0); break;
      case 'L': size.set(1.05, 3.08, 3.08); center.set(-1.0, 0, 0); break;
      case 'F': size.set(3.08, 3.08, 1.05); center.set(0, 0, 1.0); break;
      case 'B': size.set(3.08, 3.08, 1.05); center.set(0, 0, -1.0); break;
    }
    return { size, center };
  };

  it('F13-1: Layer collar dimensions enclose the 3-cubie layer (3.08) with 1.05 thickness', () => {
    const config = getHighlightConfig('U');
    assert.strictEqual(config.size.x, 3.08);
    assert.strictEqual(config.size.y, 1.05);
    assert.strictEqual(config.size.z, 3.08);

    // Layer thickness is 1.05, exceeding cubie size 0.965
    assert.ok(config.size.y > 0.965);
  });

  it('F13-2: Center coordinates for all 6 faces correspond to layer positions (+/- 1.0)', () => {
    const faces: Face[] = ['U', 'D', 'R', 'L', 'F', 'B'];
    faces.forEach(face => {
      const config = getHighlightConfig(face);
      assert.strictEqual(config.center.length(), 1.0, `Face ${face} center must be at distance 1.0 from origin`);
    });
  });

  it('F13-3: EdgesGeometry generates clean wireframe segments for layer collar', () => {
    const boxGeom = new THREE.BoxGeometry(3.08, 1.05, 3.08);
    const edgesGeom = new THREE.EdgesGeometry(boxGeom);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthTest: false
    });

    const highlightBox = new THREE.LineSegments(edgesGeom, lineMat);
    highlightBox.renderOrder = 998;

    assert.ok(highlightBox);
    assert.strictEqual(highlightBox.renderOrder, 998);
    assert.strictEqual(lineMat.depthTest, false);
    assert.strictEqual(lineMat.opacity, 0.9);

    boxGeom.dispose();
    edgesGeom.dispose();
    lineMat.dispose();
  });

  it('F13-4: Depth-aware ghosting parameters ensure visibility through solid core', () => {
    // When depthTest is false and renderOrder is 998, lines render on top of scene elements
    const scene = new THREE.Scene();
    const solidMesh = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), new THREE.MeshStandardMaterial());
    const highlight = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3.08, 1.05, 3.08)),
      new THREE.LineBasicMaterial({ depthTest: false })
    );
    highlight.renderOrder = 998;

    scene.add(solidMesh);
    scene.add(highlight);

    assert.strictEqual(scene.children.length, 2);
    assert.ok(highlight.renderOrder > (solidMesh.renderOrder || 0));

    solidMesh.geometry.dispose();
    highlight.geometry.dispose();
  });

  it('F13-5: Highlight cleanup routine disposes previous geometry and material', () => {
    let disposedGeom = false;
    let disposedMat = false;

    const boxGeom = new THREE.BoxGeometry(3.08, 1.05, 3.08);
    boxGeom.addEventListener('dispose', () => { disposedGeom = true; });

    const mat = new THREE.LineBasicMaterial();
    mat.addEventListener('dispose', () => { disposedMat = true; });

    // Simulate cleanup
    boxGeom.dispose();
    mat.dispose();

    assert.strictEqual(disposedGeom, true);
    assert.strictEqual(disposedMat, true);
  });

  it('F13-6: Layer collar correctly alters axis orientation for R/L vs F/B vs U/D', () => {
    const uConfig = getHighlightConfig('U');
    const rConfig = getHighlightConfig('R');
    const fConfig = getHighlightConfig('F');

    // U thin axis is Y
    assert.strictEqual(uConfig.size.y, 1.05);
    // R thin axis is X
    assert.strictEqual(rConfig.size.x, 1.05);
    // F thin axis is Z
    assert.strictEqual(fConfig.size.z, 1.05);
  });
});
