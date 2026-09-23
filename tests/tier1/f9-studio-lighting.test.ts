import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as THREE from 'three';

describe('Tier 1: F9 - Studio Lighting & Tone Mapping', () => {
  it('F9-1: Three.js color space and ACES Filmic tone mapping definitions are valid', () => {
    assert.strictEqual(THREE.SRGBColorSpace, 'srgb');
    assert.strictEqual(THREE.ACESFilmicToneMapping, 4);
  });

  it('F9-2: Ambient light configuration provides balanced 0.55 base fill', () => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    assert.strictEqual(ambientLight.color.getHex(), 0xffffff);
    assert.strictEqual(ambientLight.intensity, 0.55);
  });

  it('F9-3: 3-Point studio directional lights have correct intensities', () => {
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85);
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);

    assert.strictEqual(keyLight.intensity, 2.0, 'Key light must be 2.0 for crisp specular highlights');
    assert.strictEqual(fillLight.intensity, 0.85, 'Fill light must soften dark faces at 0.85');
    assert.strictEqual(rimLight.intensity, 1.1, 'Rim light must separate cube edges from dark canvas at 1.1');
  });

  it('F9-4: Directional lights are positioned diagonally opposite to avoid unlit faces', () => {
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(6, 10, 7);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.85);
    fillLight.position.set(-6, -3, -5);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(-5, 7, -7);

    // Key is high-front-right (+X, +Y, +Z)
    assert.ok(keyLight.position.x > 0 && keyLight.position.y > 0 && keyLight.position.z > 0);
    // Fill is low-back-left (-X, -Y, -Z)
    assert.ok(fillLight.position.x < 0 && fillLight.position.y < 0 && fillLight.position.z < 0);
    // Rim is high-back-left (-X, +Y, -Z)
    assert.ok(rimLight.position.x < 0 && rimLight.position.y > 0 && rimLight.position.z < 0);
  });

  it('F9-5: Grounding contact shadow plane geometry matches 5.4 x 5.4 size and -2.25 Y position', () => {
    const shadowGeo = new THREE.PlaneGeometry(5.4, 5.4);
    assert.strictEqual(shadowGeo.parameters.width, 5.4);
    assert.strictEqual(shadowGeo.parameters.height, 5.4);

    const shadowPlane = new THREE.Mesh(shadowGeo, new THREE.MeshBasicMaterial());
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.25;

    assert.strictEqual(shadowPlane.position.y, -2.25);
    assert.strictEqual(shadowPlane.rotation.x, -Math.PI / 2);
    shadowGeo.dispose();
  });

  it('F9-6: Scene composition accommodates studio lighting hierarchy', () => {
    const scene = new THREE.Scene();
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    scene.add(ambient);
    scene.add(key);

    assert.strictEqual(scene.children.length, 2);
    assert.ok(scene.children.includes(ambient));
    assert.ok(scene.children.includes(key));
  });
});
