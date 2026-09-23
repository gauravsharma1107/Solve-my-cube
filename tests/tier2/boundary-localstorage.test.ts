import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setupMockDom, teardownMockDom } from '../test-helpers.ts';
import { 
  applyBlackIntensity, 
  getInitialIntensity, 
  PRESETS 
} from '../../src/utils/themeManager.ts';

describe('Tier 2: Boundary - Corrupted & Malformed LocalStorage Data', () => {
  beforeEach(() => {
    setupMockDom();
  });

  afterEach(() => {
    teardownMockDom();
  });

  it('B2-1: Malformed non-numeric strings fall back safely to 100% OLED black', () => {
    const corruptValues = ['undefined', 'null', 'NaN', '{"bad":12}', 'abc', '---'];

    corruptValues.forEach(badVal => {
      globalThis.localStorage.setItem('cubesync_theme_intensity', badVal);
      const intensity = getInitialIntensity();
      assert.strictEqual(
        intensity, 
        100, 
        `Corrupt storage value '${badVal}' must default safely to 100`
      );
    });
  });

  it('B2-2: Out-of-bounds intensity values clamped to [0, 100]', () => {
    // Test negative intensity
    globalThis.localStorage.setItem('cubesync_theme_intensity', '-40');
    let intensity = getInitialIntensity();
    assert.strictEqual(intensity, 100, 'Negative values in storage must fall back safely');

    // Test applyBlackIntensity clamping
    applyBlackIntensity(-50);
    assert.strictEqual(globalThis.localStorage.getItem('cubesync_theme_intensity'), '0');

    applyBlackIntensity(250);
    assert.strictEqual(globalThis.localStorage.getItem('cubesync_theme_intensity'), '100');
  });

  it('B2-3: Empty or whitespace string falls back safely', () => {
    globalThis.localStorage.setItem('cubesync_theme_intensity', '');
    assert.strictEqual(getInitialIntensity(), 100);

    globalThis.localStorage.setItem('cubesync_theme_intensity', '   ');
    assert.strictEqual(getInitialIntensity(), 100);
  });

  it('B2-4: String preset identifiers resolve to their exact numeric values', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      globalThis.localStorage.setItem('cubesync_theme_intensity', key);
      const intensity = getInitialIntensity();
      assert.strictEqual(
        intensity, 
        preset.value, 
        `Preset '${key}' must resolve to numeric value ${preset.value}`
      );
    }
  });

  it('B2-5: Storage throwing QuotaExceededError or SecurityError does not throw unhandled exception', () => {
    // Override localStorage methods to simulate throw
    const throwingStorage = {
      getItem: () => { throw new Error('SecurityError: Access is denied'); },
      setItem: () => { throw new Error('QuotaExceededError: Storage quota exceeded'); },
      removeItem: () => {},
      clear: () => {}
    };
    (globalThis as any).localStorage = throwingStorage;

    // Must not crash
    assert.doesNotThrow(() => {
      const init = getInitialIntensity();
      assert.strictEqual(init, 100);
    });

    assert.doesNotThrow(() => {
      applyBlackIntensity(85);
    });
  });

  it('B2-6: Extreme float values parsed and clamped gracefully', () => {
    applyBlackIntensity(72.648);
    const stored = globalThis.localStorage.getItem('cubesync_theme_intensity');
    assert.ok(stored !== null);
    assert.ok(!isNaN(Number(stored)));
    assert.ok(Number(stored) >= 0 && Number(stored) <= 100);
  });
});
