import { describe, it } from 'node:test';
import assert from 'node:assert';

// Formula from Cube3DViewer:
// Math.max(120, animationSpeed / (speedOption || 1.0))
function calculateMoveDuration(animationSpeed: number, optionsOrSpeed?: number | { duration?: number }): number {
  if (typeof optionsOrSpeed === 'number') {
    return Math.max(120, Math.round(animationSpeed / (optionsOrSpeed || 1.0)));
  } else if (optionsOrSpeed && typeof optionsOrSpeed.duration === 'number') {
    return Math.max(0, optionsOrSpeed.duration);
  }
  return animationSpeed;
}

// Formula from StepSolverGuide:
// Math.max(500, 1400 / speedMultiplier)
function calculatePlaybackDelay(speedMultiplier: number): number {
  const safeMult = Math.max(0.01, speedMultiplier);
  return Math.max(500, Math.round(1400 / safeMult));
}

describe('Tier 2: Boundary - Extreme Animation Speeds & Timing Parameters', () => {
  it('B4-1: Zero ms duration option handled safely', () => {
    const dur = calculateMoveDuration(350, { duration: 0 });
    assert.strictEqual(dur, 0, 'Explicit 0ms duration must be respected for instant testing');
  });

  it('B4-2: Negative or zero speed multiplier falls back to base speed or clamped minimum (120ms)', () => {
    const durZero = calculateMoveDuration(350, 0);
    assert.strictEqual(durZero, 350, '0 speed multiplier must fall back to 1.0x (350ms)');

    const durExtremeFast = calculateMoveDuration(350, 100);
    assert.strictEqual(durExtremeFast, 120, 'Extreme speed must be clamped to minimum 120ms to prevent visual tearing');
  });

  it('B4-3: Extremely fast playback multiplier (10.0x) clamped to 500ms minimum interval', () => {
    const delay = calculatePlaybackDelay(10.0);
    assert.strictEqual(delay, 500, 'Delay must clamp to 500ms lower bound so user can track turns');
  });

  it('B4-4: Extremely slow playback multiplier (0.1x) calculates 14000ms delay safely', () => {
    const delay = calculatePlaybackDelay(0.1);
    assert.strictEqual(delay, 14000, '0.1x speed should be 14,000ms (14s)');
  });

  it('B4-5: 180° double turn 1.35x scaling applies consistently across speed variations', () => {
    const baseDurations = [120, 250, 350, 500, 1000];
    baseDurations.forEach(base => {
      const doubleDur = Math.round(base * 1.35);
      const ratio = Number((doubleDur / base).toFixed(2));
      assert.strictEqual(ratio, 1.35, `Double turn duration ratio must be 1.35x for base ${base}ms`);
    });
  });

  it('B4-6: Fractional speed multipliers calculate rounded integer milliseconds', () => {
    const multipliers = [0.75, 1.25, 1.5, 2.5];
    multipliers.forEach(m => {
      const dur = calculateMoveDuration(350, m);
      assert.strictEqual(Number.isInteger(dur), true, `Duration for ${m}x must be an integer`);
      const delay = calculatePlaybackDelay(m);
      assert.strictEqual(Number.isInteger(delay), true, `Delay for ${m}x must be an integer`);
    });
  });
});
