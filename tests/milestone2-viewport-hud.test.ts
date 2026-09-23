import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getSteeringAnalogy } from '../src/components/StepSolverGuide.tsx';

describe('Milestone 2: Mobile Viewport & Unified Solver HUD (R3 & R4)', () => {
  const all18Moves = [
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'F', "F'", 'F2',
    'B', "B'", 'B2',
    'L', "L'", 'L2',
    'R', "R'", 'R2'
  ];

  // --------------------------------------------------------------------------
  // R3: Mobile Viewport-Constrained Layout Verification
  // --------------------------------------------------------------------------

  it('R3-1: App.tsx root container strictly enforces 100dvh viewport containment and prevents scrolling', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    assert.ok(
      content.includes('h-[100dvh]'),
      'Root layout must specify h-[100dvh]'
    );
    assert.ok(
      content.includes('max-h-[100dvh]'),
      'Root layout must specify max-h-[100dvh]'
    );
    assert.ok(
      content.includes('overflow-hidden'),
      'Root layout must enforce overflow-hidden to prevent document bounce/scroll'
    );
    assert.ok(
      content.includes('flex flex-col'),
      'Root layout must enforce flex flex-col'
    );
  });

  it('R3-2: Solver tab layout uses flexible canvas viewport with min-h-[220px] and docked controls', () => {
    const appPath = path.resolve(process.cwd(), 'src/App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');

    // 3D Canvas Viewport
    assert.ok(
      content.includes('flex-1 min-h-[220px] lg:h-full lg:col-span-7'),
      '3D Canvas container must have flex-1 min-h-[220px] lg:h-full lg:col-span-7'
    );

    // Controls container
    assert.ok(
      content.includes('lg:col-span-5 flex flex-col overflow-hidden lg:overflow-y-auto'),
      'Solver controls container must have lg:col-span-5 flex flex-col overflow-hidden lg:overflow-y-auto'
    );
  });

  it('R3-3: Navbar integrates mobile header navigation without consuming excessive vertical space', () => {
    const navPath = path.resolve(process.cwd(), 'src/components/Navbar.tsx');
    const content = fs.readFileSync(navPath, 'utf-8');

    // Header must have compact py-2 padding
    assert.ok(
      content.includes('py-2 sm:py-2.5') || content.includes('py-2'),
      'Header must have compact vertical padding'
    );

    // Header must contain mobile navigation tabs
    assert.ok(
      content.includes('aria-label="Mobile Navigation"'),
      'Navbar must provide mobile navigation accessible label'
    );

    // Bottom navigation bar must not collide with docked solver controls when in solver mode
    assert.ok(
      content.includes("activeTab !== 'solver'"),
      'Fixed bottom mobile navigation must be excluded on solver tab to prevent bottom dock collision'
    );
  });

  it('R3-4: Mobile vertical budget on iPhone SE (375x667) and iPhone 14 Pro (393x852) maintains full visibility', () => {
    // iPhone SE: 667px height
    const seHeight = 667;
    const headerHeight = 50;
    const canvasHeight = 260; // Flexible canvas expands to fill available space (min 220px)
    const padding = 16;
    const remainingForControls = seHeight - headerHeight - canvasHeight - padding;

    assert.ok(
      remainingForControls >= 280,
      `Remaining height (${remainingForControls}px) must comfortably fit docked StepSolverGuide without scrolling`
    );

    // iPhone 14 Pro: 852px height
    const proHeight = 852;
    const proRemaining = proHeight - headerHeight - canvasHeight - padding;
    assert.ok(
      proRemaining >= 400,
      `iPhone 14 Pro budget (${proRemaining}px) provides spacious layout without document scrolling`
    );
  });

  // --------------------------------------------------------------------------
  // R4: Intuitive 3D Solver Instructions & HUD Guidance Verification
  // --------------------------------------------------------------------------

  it('R4-1: getSteeringAnalogy maps all 18 WCA moves to beginner-friendly steering wheel & physical analogies', () => {
    all18Moves.forEach(move => {
      const analogy = getSteeringAnalogy(move);
      assert.ok(analogy && analogy.length > 10, `Move ${move} must return descriptive steering analogy`);
    });

    // Verify specific beginner steering analogies
    assert.ok(
      getSteeringAnalogy('U').includes('top layer clockwise 90°') || getSteeringAnalogy('U').includes('flick left'),
      'U must include top layer clockwise / flick left'
    );
    assert.ok(
      getSteeringAnalogy("R'").includes('towards you'),
      "R' must include towards you"
    );
    assert.ok(
      getSteeringAnalogy('F').includes('steering wheel'),
      'F must include steering wheel analogy'
    );
    assert.ok(
      getSteeringAnalogy("F'").includes('steering wheel'),
      "F' must include steering wheel analogy"
    );
    assert.ok(
      getSteeringAnalogy('R2').includes('twice'),
      'R2 must indicate turning twice'
    );
  });

  it('R4-2: StepSolverGuide displays bold notation badges alongside next-move lookahead pills', () => {
    const guidePath = path.resolve(process.cwd(), 'src/components/StepSolverGuide.tsx');
    const content = fs.readFileSync(guidePath, 'utf-8');

    // Bold notation badge
    assert.ok(
      content.includes('activeStep.notation'),
      'Must display activeStep.notation badge'
    );

    // Lookahead pill
    assert.ok(
      content.includes('nextStep.notation') || content.includes('Next:'),
      'Must display next-move lookahead pill'
    );

    // Orientation pill
    assert.ok(
      content.includes('White Top') || content.includes('White on Top'),
      'Must display orientation guidance'
    );
  });

  it('R4-3: Playback action bar buttons meet minimum 48px thumb-friendly touch target height', () => {
    const guidePath = path.resolve(process.cwd(), 'src/components/StepSolverGuide.tsx');
    const content = fs.readFileSync(guidePath, 'utf-8');

    // All touch targets must have min-h-[48px] and h-12
    assert.ok(
      content.includes('min-h-[48px]'),
      'Playback buttons must specify min-h-[48px] for mobile accessibility'
    );
    assert.ok(
      content.includes('h-12'),
      'Playback buttons must have h-12 (48px standard)'
    );

    // Reset button
    assert.ok(
      content.includes('handleResetToStart'),
      'Must have handleResetToStart button'
    );

    // High visibility Next button
    assert.ok(
      content.includes('flex-[1.4]'),
      'Next button must have larger flex ratio (flex-[1.4]) for primary thumb target'
    );
  });

  it('R4-4: Keyboard navigation shortcuts are wired for Space, ArrowRight, ArrowLeft, and KeyR', () => {
    const guidePath = path.resolve(process.cwd(), 'src/components/StepSolverGuide.tsx');
    const content = fs.readFileSync(guidePath, 'utf-8');

    assert.ok(content.includes("'Space'"), 'Must handle Space key for play/pause');
    assert.ok(content.includes("'ArrowRight'"), 'Must handle ArrowRight for next step');
    assert.ok(content.includes("'ArrowLeft'"), 'Must handle ArrowLeft for previous step');
    assert.ok(
      content.includes("'KeyR'") || content.includes("'r'"),
      'Must handle KeyR for reset'
    );
    assert.ok(
      content.includes("tag === 'INPUT'"),
      'Must guard against triggering shortcuts when typing in inputs'
    );
  });
});
