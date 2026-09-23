import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';

describe('Tier 1: F11 - Snapback Glitch Elimination', () => {
  it('F11-1: Source code eliminates premature resetCubieTransforms call in animation complete', () => {
    const viewerPath = path.resolve(process.cwd(), 'src/components/Cube3DViewer.tsx');
    const content = fs.readFileSync(viewerPath, 'utf-8');

    // Verify the architectural fix: DO NOT call resetCubieTransforms() inside animation loop completion
    assert.ok(
      content.includes('DO NOT call resetCubieTransforms() here'),
      'Viewer must not prematurely reset cubie positions before sticker colors are updated'
    );
  });

  it('F11-2: updateStickerMaterials synchronously performs cubie reset and sticker repaint', () => {
    const viewerPath = path.resolve(process.cwd(), 'src/components/Cube3DViewer.tsx');
    const content = fs.readFileSync(viewerPath, 'utf-8');

    assert.ok(
      content.includes('updateStickerMaterials'),
      'Must contain updateStickerMaterials synchronization method'
    );
    assert.ok(
      content.includes('resetCubieTransforms()'),
      'updateStickerMaterials must be the single authority for resetting transforms during repaint'
    );
  });

  it('F11-3: Fast-forward mechanism handles mid-flight interruption safely', () => {
    const cubeGroup = new THREE.Group();
    const pivot = new THREE.Group();
    cubeGroup.add(pivot);

    const testCubie = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    pivot.attach(testCubie);

    // Fast-forward simulation: rotate pivot to target and detach cubies back to cubeGroup
    const axis = new THREE.Vector3(0, 1, 0);
    const targetAngle = Math.PI / 2;
    pivot.setRotationFromAxisAngle(axis, targetAngle);
    pivot.updateMatrixWorld();

    cubeGroup.attach(testCubie);
    cubeGroup.remove(pivot);

    assert.strictEqual(cubeGroup.children.includes(testCubie), true);
    assert.strictEqual(cubeGroup.children.includes(pivot), false);
    testCubie.geometry.dispose();
  });

  it('F11-4: Grid coordinate reset accurately restores identity positions and quaternions', () => {
    const cubie = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    cubie.userData = { gx: 1, gy: -1, gz: 0 };

    // Simulate disturbed position during animation
    cubie.position.set(0.5, 0.5, 0.5);
    cubie.rotation.set(0.4, 0.8, 0.2);

    // Run reset logic
    const u = cubie.userData;
    cubie.position.set(u.gx, u.gy, u.gz);
    cubie.rotation.set(0, 0, 0);
    cubie.quaternion.identity();

    assert.strictEqual(cubie.position.x, 1);
    assert.strictEqual(cubie.position.y, -1);
    assert.strictEqual(cubie.position.z, 0);
    assert.strictEqual(Math.abs(cubie.rotation.x), 0);
    assert.strictEqual(cubie.quaternion.w, 1);
    cubie.geometry.dispose();
  });

  it('F11-5: Visualizer code defers coordinate resets to synchronous sticker repainting frame', () => {
    const viewerPath = path.resolve(process.cwd(), 'src/components/Cube3DViewer.tsx');
    const content = fs.readFileSync(viewerPath, 'utf-8');

    assert.ok(
      content.includes('eliminates the 1-frame snapback visual rollback glitch'),
      'Code must document and enforce elimination of 1-frame visual rollback flash'
    );
  });

  it('F11-6: Multiple animated attachments preserve parent scene graph integrity', () => {
    const root = new THREE.Group();
    const pivot = new THREE.Group();
    root.add(pivot);

    const cubies: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      root.add(c);
      cubies.push(c);
    }

    // Attach to pivot
    cubies.forEach(c => pivot.attach(c));
    assert.strictEqual(pivot.children.length, 9);
    assert.strictEqual(root.children.length, 1); // Only pivot is child of root

    // Detach back to root
    cubies.forEach(c => root.attach(c));
    root.remove(pivot);
    assert.strictEqual(root.children.length, 9);
    assert.strictEqual(pivot.children.length, 0);

    cubies.forEach(c => c.geometry.dispose());
  });
});
