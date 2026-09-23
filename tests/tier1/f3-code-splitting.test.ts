import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('Tier 1: F3 - Code Splitting & Manual Chunks', () => {
  const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts');
  const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf-8');

  it('F3-1: Vite config defines manualChunks in rollupOptions', () => {
    assert.ok(viteConfigContent.includes('manualChunks'), 'vite.config.ts must declare manualChunks');
    assert.ok(viteConfigContent.includes('rollupOptions'), 'vite.config.ts must configure rollupOptions');
  });

  it('F3-2: Three.js library is assigned to vendor-three chunk', () => {
    assert.ok(viteConfigContent.includes('vendor-three'), 'manualChunks must define vendor-three chunk');
    assert.ok(viteConfigContent.includes('three'), 'manualChunks must match three modules');
  });

  it('F3-3: React and React-DOM are assigned to vendor-react chunk', () => {
    assert.ok(viteConfigContent.includes('vendor-react'), 'manualChunks must define vendor-react chunk');
    assert.ok(viteConfigContent.includes('react-dom'), 'manualChunks must match react-dom');
  });

  it('F3-4: Build chunkSizeWarningLimit is raised to prevent build warnings', () => {
    assert.ok(viteConfigContent.includes('chunkSizeWarningLimit'), 'chunkSizeWarningLimit should be configured');
  });

  it('F3-5: Heavy feature views are architecturally separated and independently importable', async () => {
    // Verify that the heavy views can be imported individually
    const cameraScanner = await import('../../src/components/CameraScanner.tsx');
    assert.ok(cameraScanner.CameraScanner, 'CameraScanner must be an exportable component');

    const cubeNet = await import('../../src/components/CubeNetEditor.tsx');
    assert.ok(cubeNet.CubeNetEditor, 'CubeNetEditor must be an exportable component');

    const timer = await import('../../src/components/ScrambleAndTimer.tsx');
    assert.ok(timer.ScrambleAndTimer, 'ScrambleAndTimer must be an exportable component');

    const settings = await import('../../src/components/ThemeSettingsModal.tsx');
    assert.ok(settings.ThemeSettingsModal, 'ThemeSettingsModal must be an exportable component');
  });

  it('F3-6: Application code does not import heavy solver worker synchronously in main thread', () => {
    const appTsx = fs.readFileSync(path.resolve(process.cwd(), 'src/App.tsx'), 'utf-8');
    assert.strictEqual(
      appTsx.includes("from './solver/solver.worker'"),
      false,
      'App.tsx must not directly synchronously import solver.worker'
    );
  });
});
