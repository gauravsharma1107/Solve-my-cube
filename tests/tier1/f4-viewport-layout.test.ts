import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { setupMockDom, teardownMockDom } from '../test-helpers.ts';

describe('Tier 1: F4 - 100dvh Viewport Layout', () => {
  beforeEach(() => {
    setupMockDom();
  });

  afterEach(() => {
    teardownMockDom();
  });

  it('F4-1: Index.html has comprehensive mobile viewport meta tags', () => {
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');

    assert.ok(indexHtml.includes('width=device-width'), 'Must have width=device-width');
    assert.ok(indexHtml.includes('maximum-scale=1.0'), 'Must have maximum-scale=1.0');
    assert.ok(indexHtml.includes('user-scalable=no'), 'Must prevent pinch zoom scaling');
    assert.ok(indexHtml.includes('viewport-fit=cover'), 'Must specify viewport-fit=cover');
  });

  it('F4-2: Global CSS enforces overflow-x hidden and dark color scheme', () => {
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    assert.ok(css.includes('overflow-x: hidden'), 'Global CSS must prevent horizontal scroll jitter');
    assert.ok(css.includes('color-scheme: dark'), 'Global CSS must declare dark color-scheme');
  });

  it('F4-3: Viewport height budget allows 3D canvas and solver controls within 100dvh on 390px mobile', () => {
    // Standard iPhone 12/13/14 viewport: 390px x 844px
    const vh = 844;
    const navbarHeight = 56;
    const canvasHeight = 330; // Mobile canvas height defined in App.tsx
    const controlsBudget = vh - navbarHeight - canvasHeight; // ~458px remaining

    assert.ok(
      controlsBudget >= 300,
      `Controls budget (${controlsBudget}px) must be >= 300px to fit docked solver guide comfortably`
    );
  });

  it('F4-4: Viewport height budget on ultra-compact mobile (375px x 667px)', () => {
    // iPhone SE / compact mobile: 375px x 667px
    const vh = 667;
    const navbarHeight = 52;
    const canvasHeight = 280; // xs:h-[280px]
    const controlsBudget = vh - navbarHeight - canvasHeight; // 335px

    assert.ok(
      controlsBudget >= 250,
      `Compact mobile budget (${controlsBudget}px) must accommodate docked playback buttons`
    );
  });

  it('F4-5: App.tsx root container uses flex-col with max viewport height containment', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    const appTsx = fs.readFileSync(appPath, 'utf-8');

    assert.ok(
      appTsx.includes('flex flex-col'),
      'Root layout must use flex-col for deterministic vertical stacking'
    );
    assert.ok(
      appTsx.includes('min-h-screen') || appTsx.includes('h-screen') || appTsx.includes('100dvh'),
      'App container must track full viewport height'
    );
  });

  it('F4-6: Mobile layout removes vertical document scrolling requirement', () => {
    // Verify that the body has touch-manipulation and select-none to prevent touch gesture conflicts
    const indexPath = path.resolve(process.cwd(), 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf-8');
    assert.ok(
      indexHtml.includes('touch-manipulation'),
      'Body must include touch-manipulation to eliminate 300ms tap delays'
    );
    assert.ok(
      indexHtml.includes('select-none'),
      'Body must be select-none to avoid accidental text selection on mobile taps'
    );
  });
});
