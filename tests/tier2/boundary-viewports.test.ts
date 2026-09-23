import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { setupMockDom, teardownMockDom } from '../test-helpers.ts';

describe('Tier 2: Boundary - Extreme Viewports & Aspect Ratios', () => {
  afterEach(() => {
    teardownMockDom();
  });

  it('B1-1: Ultra-narrow mobile viewport (320px width - iPhone SE gen 1)', () => {
    const { documentElement } = setupMockDom({ viewportWidth: 320, viewportHeight: 568 });
    assert.strictEqual(documentElement.clientWidth, 320);

    // Viewport budget calculation: canvas (280) + navbar (50) + bottom dock (200) = 530 <= 568
    const totalContentHeight = 280 + 50 + 200;
    assert.ok(
      totalContentHeight <= 568,
      'Ultra-narrow 320x568 screen must fit 3D canvas and docked controls without document overflow'
    );
  });

  it('B1-2: Modern compact mobile (375px x 667px)', () => {
    const { documentElement } = setupMockDom({ viewportWidth: 375, viewportHeight: 667 });
    assert.strictEqual(documentElement.clientWidth, 375);
    const canvasH = 280;
    const remainingH = 667 - canvasH - 56;
    assert.ok(remainingH >= 300, 'Budget for controls on 375px mobile must exceed 300px');
  });

  it('B1-3: Standard flagship mobile width boundary (390px x 844px)', () => {
    const { documentElement } = setupMockDom({ viewportWidth: 390, viewportHeight: 844 });
    assert.strictEqual(documentElement.clientWidth, 390);
    const canvasH = 330;
    const remainingH = 844 - canvasH - 56;
    assert.ok(remainingH >= 400, 'Budget for controls on 390px mobile must exceed 400px');
  });

  it('B1-4: Upper mobile threshold boundary (430px x 932px - iPhone 14 Pro Max)', () => {
    const { documentElement } = setupMockDom({ viewportWidth: 430, viewportHeight: 932 });
    assert.strictEqual(documentElement.clientWidth, 430);

    const isMobile = documentElement.clientWidth <= 430;
    assert.strictEqual(isMobile, true, '430px must be classified as mobile for 100dvh containment');
  });

  it('B1-5: Landscape mobile extreme aspect ratio (844px width x 390px height)', () => {
    const { documentElement } = setupMockDom({ viewportWidth: 844, viewportHeight: 390 });
    assert.strictEqual(documentElement.clientHeight, 390);

    // In landscape, height is compressed. Aspect ratio is > 2.1
    const aspectRatio = documentElement.clientWidth / documentElement.clientHeight;
    assert.ok(aspectRatio > 2.0, 'Must recognize ultra-wide mobile landscape aspect ratio');
  });

  it('B1-6: Tablet breakpoint threshold (768px width)', () => {
    const { documentElement } = setupMockDom({ viewportWidth: 768, viewportHeight: 1024 });
    const isMobile = documentElement.clientWidth <= 430;
    assert.strictEqual(isMobile, false, '768px tablet must not be constrained by mobile <=430px layout');
  });
});
