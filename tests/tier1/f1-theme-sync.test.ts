import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { setupMockDom, teardownMockDom } from '../test-helpers.ts';
import { 
  applyBlackIntensity, 
  getInitialIntensity, 
  PRESETS, 
  type BlackIntensityPreset 
} from '../../src/utils/themeManager.ts';

describe('Tier 1: F1 - Instant Pre-Paint Theme Sync', () => {
  beforeEach(() => {
    setupMockDom();
  });

  afterEach(() => {
    teardownMockDom();
  });

  it('F1-1: Default theme fallback when storage is empty', () => {
    // When no localStorage key exists, should default to 100 (OLED True Black)
    const initial = getInitialIntensity();
    assert.strictEqual(initial, 100, 'Empty storage must default to 100% OLED black');
  });

  it('F1-2: OLED 100% intensity applies pure pitch black canvas style synchronously', () => {
    applyBlackIntensity(100, false);
    const root = globalThis.document.documentElement;
    assert.strictEqual(root.style.getPropertyValue('--bg-canvas'), 'rgb(0, 0, 0)');
    assert.strictEqual(root.style.backgroundColor, 'rgb(0, 0, 0)');
    assert.strictEqual(globalThis.localStorage.getItem('cubesync_theme_intensity'), '100');
  });

  it('F1-3: Obsidian / Charcoal preset values map properly and persist', () => {
    // Test presets defined in themeManager
    assert.ok(PRESETS.oled && PRESETS.obsidian && PRESETS.charcoal && PRESETS.graphite);
    assert.strictEqual(PRESETS.oled.value, 100);
    assert.strictEqual(PRESETS.obsidian.value, 85);
    assert.strictEqual(PRESETS.charcoal.value, 70);

    applyBlackIntensity(PRESETS.charcoal.value, false);
    const root = globalThis.document.documentElement;
    // At intensity 70, t = 0.3 -> canvas r,g,b = lerp(0, 40, 0.3) = 12
    assert.strictEqual(root.style.getPropertyValue('--bg-canvas'), 'rgb(12, 12, 14)');
    assert.strictEqual(globalThis.localStorage.getItem('cubesync_theme_intensity'), '70');
  });

  it('F1-4: Synchronous execution without transition class during initial load', () => {
    applyBlackIntensity(100, false);
    const root = globalThis.document.documentElement;
    assert.strictEqual(
      root.classList.contains('theme-transitioning'), 
      false, 
      'theme-transitioning must not be present when enableTransition is false'
    );
  });

  it('F1-5: Transition class active during explicit user changes', () => {
    applyBlackIntensity(85, true);
    const root = globalThis.document.documentElement;
    assert.strictEqual(
      root.classList.contains('theme-transitioning'), 
      true, 
      'theme-transitioning must be added during interactive adjustments'
    );
  });

  it('F1-6: Index.html contains pre-paint configuration and meta viewport', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(indexHtml.includes('viewport-fit=cover'), 'index.html must include viewport-fit=cover');
    assert.ok(indexHtml.includes('theme-color'), 'index.html must specify theme-color meta tag');
  });
});
