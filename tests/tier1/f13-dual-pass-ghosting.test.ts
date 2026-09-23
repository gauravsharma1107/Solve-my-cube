import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
import { DUAL_PASS_CONFIG } from '../../src/components/Cube3DViewer';

describe('Tier 1: F13 - Dual-Pass Depth-Aware Ghosting', () => {
  it('F13-1: Pass 1 (Ghost pass) configuration matches GreaterDepth, opacity 0.35, depthWrite false', () => {
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass1.depthFunc,
      THREE.GreaterDepth,
      'Pass 1 depthFunc must be THREE.GreaterDepth (activates behind solid cubies)'
    );
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass1.transparent,
      true,
      'Pass 1 must be transparent'
    );
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass1.opacity,
      0.35,
      'Pass 1 opacity must be exactly 0.35 for subtle x-ray silhouette'
    );
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass1.depthWrite,
      false,
      'Pass 1 must not write to depth buffer (depthWrite: false)'
    );
  });

  it('F13-2: Pass 2 (Foreground pass) configuration matches LessEqualDepth, opacity 1.0, transparent false', () => {
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass2.depthFunc,
      THREE.LessEqualDepth,
      'Pass 2 depthFunc must be THREE.LessEqualDepth (activates for directly visible fragments)'
    );
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass2.transparent,
      false,
      'Pass 2 must be opaque (transparent: false)'
    );
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass2.opacity,
      1.0,
      'Pass 2 opacity must be exactly 1.0 for crisp, vibrant foreground geometry'
    );
    assert.strictEqual(
      DUAL_PASS_CONFIG.pass2.depthWrite,
      false,
      'Pass 2 depthWrite is false to avoid z-fighting with indicators'
    );
  });

  it('F13-3: Render order hierarchy establishes Pass 1 (998) before Pass 2 (999)', () => {
    assert.strictEqual(DUAL_PASS_CONFIG.pass1.renderOrder, 998, 'Pass 1 renderOrder must be 998');
    assert.strictEqual(DUAL_PASS_CONFIG.pass2.renderOrder, 999, 'Pass 2 renderOrder must be 999');
    assert.ok(
      DUAL_PASS_CONFIG.pass2.renderOrder > DUAL_PASS_CONFIG.pass1.renderOrder,
      'Pass 2 must render after Pass 1'
    );
  });

  it('F13-4: Source code eliminates confusing depthTest: false approach from arrows and layer highlights', () => {
    const viewerPath = path.resolve(process.cwd(), 'src/components/Cube3DViewer.tsx');
    const content = fs.readFileSync(viewerPath, 'utf-8');

    // Neither updateRotationArrow nor updateLayerHighlight should use depthTest: false
    // Extract updateLayerHighlight function body
    const highlightFn = content.slice(
      content.indexOf('const updateLayerHighlight ='),
      content.indexOf('const updateRotationArrow =')
    );
    assert.ok(
      !highlightFn.includes('depthTest: false'),
      'updateLayerHighlight must NOT contain depthTest: false'
    );

    // Extract updateRotationArrow function body
    const arrowFn = content.slice(
      content.indexOf('const updateRotationArrow ='),
      content.indexOf('const smoothMoveCamera =')
    );
    assert.ok(
      !arrowFn.includes('depthTest: false'),
      'updateRotationArrow must NOT contain depthTest: false'
    );
  });

  it('F13-5: Pass 1 ghost material instantiates with verified Three.js properties', () => {
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthFunc: DUAL_PASS_CONFIG.pass1.depthFunc,
      transparent: DUAL_PASS_CONFIG.pass1.transparent,
      opacity: DUAL_PASS_CONFIG.pass1.opacity,
      depthWrite: DUAL_PASS_CONFIG.pass1.depthWrite,
    });

    assert.strictEqual(ghostMat.depthFunc, THREE.GreaterDepth);
    assert.strictEqual(ghostMat.transparent, true);
    assert.strictEqual(ghostMat.opacity, 0.35);
    assert.strictEqual(ghostMat.depthWrite, false);
    assert.strictEqual(ghostMat.depthTest, true); // Depth test is active
    ghostMat.dispose();
  });

  it('F13-6: Pass 2 foreground material instantiates with verified Three.js properties', () => {
    const foregroundMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthFunc: DUAL_PASS_CONFIG.pass2.depthFunc,
      transparent: DUAL_PASS_CONFIG.pass2.transparent,
      opacity: DUAL_PASS_CONFIG.pass2.opacity,
      depthWrite: DUAL_PASS_CONFIG.pass2.depthWrite,
    });

    assert.strictEqual(foregroundMat.depthFunc, THREE.LessEqualDepth);
    assert.strictEqual(foregroundMat.transparent, false);
    assert.strictEqual(foregroundMat.opacity, 1.0);
    assert.strictEqual(foregroundMat.depthTest, true);
    foregroundMat.dispose();
  });
});
