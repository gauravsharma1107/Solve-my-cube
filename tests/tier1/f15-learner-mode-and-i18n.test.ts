import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  SUPPORTED_LANGUAGES, 
  TRANSLATIONS, 
  MOVE_ANALOGIES, 
  getLocalizedAnalogy, 
  t, 
  type AppLanguage 
} from '../../src/utils/i18n.ts';
import { 
  solveWithHumanLBL, 
  solveWithHumanCFOP, 
  solveWithHumanStateMachine 
} from '../../src/solver/humanStateMachineSolver.ts';
import { createScrambledCube, isCubeSolved } from '../test-helpers.ts';
import { applyMove } from '../../src/solver/moveParser.ts';

describe('Tier 1: F15 - Learner Mode & Multi-Language Support', () => {
  const allLanguages: AppLanguage[] = ['en', 'hi', 'hi-hinglish', 'hinglish'];
  const sampleScramble = "R U R' F' U2 R U2 R'";

  it('F15-1: All 4 requested languages are registered and supported', () => {
    assert.strictEqual(SUPPORTED_LANGUAGES.length, 4);
    const ids = SUPPORTED_LANGUAGES.map(l => l.id);
    assert.ok(ids.includes('en'), 'Must support English');
    assert.ok(ids.includes('hi'), 'Must support Hindi');
    assert.ok(ids.includes('hi-hinglish'), 'Must support Hinglish in Devanagari');
    assert.ok(ids.includes('hinglish'), 'Must support Hinglish in Latin');
  });

  it('F15-2: Translation dictionary has parity across all 4 languages', () => {
    const englishKeys = Object.keys(TRANSLATIONS.en);
    assert.ok(englishKeys.length >= 25, 'English dictionary must have comprehensive keys');

    for (const lang of allLanguages) {
      const dict = TRANSLATIONS[lang];
      assert.ok(dict, `Dictionary for ${lang} must exist`);
      for (const key of englishKeys) {
        assert.ok(
          dict[key] && dict[key].length > 0,
          `Key "${key}" must be translated in language "${lang}"`
        );
      }
    }
  });

  it('F15-3: All 18 standard WCA moves have localized steering analogies in all 4 languages', () => {
    const moves = [
      'R', "R'", 'R2',
      'L', "L'", 'L2',
      'U', "U'", 'U2',
      'D', "D'", 'D2',
      'F', "F'", 'F2',
      'B', "B'", 'B2',
    ];

    for (const lang of allLanguages) {
      for (const m of moves) {
        const analogy = getLocalizedAnalogy(m, lang);
        assert.ok(
          analogy && analogy.length > 5,
          `Move ${m} must have descriptive localized analogy in ${lang}`
        );
      }
    }
  });

  it('F15-4: Human LBL State-Machine Solver produces educational steps with reasons and tips', () => {
    const scrambled = createScrambledCube(sampleScramble);
    const steps = solveWithHumanLBL(scrambled, 'en');

    assert.ok(steps.length > 0, 'LBL solver must produce solution steps');
    assert.ok(steps.length > 20, 'LBL solver must produce authentic human move count (> 20 moves)');

    // Verify educational fields
    for (const step of steps) {
      assert.ok(step.reason && step.reason.length > 10, 'Every step must have an educational reason');
      assert.ok(step.tip && step.tip.length > 10, 'Every step must have an educational tip');
      assert.ok(step.phase && step.phase.length > 5, 'Every step must belong to an educational stage');
      assert.ok(step.subStage && step.subStage.length > 3, 'Every step must have a sub-stage');
      assert.ok(step.algorithmName && step.algorithmName.length > 2, 'Every step must name the algorithm');
    }

    // Verify mathematical correctness: applying all steps solves the cube
    let state = scrambled;
    for (const step of steps) {
      state = applyMove(state, step.move);
    }
    assert.strictEqual(isCubeSolved(state), true, 'LBL steps must fully solve the cube');
  });

  it('F15-5: Human CFOP State-Machine Solver generates 4-phase speedcubing progression', () => {
    const scrambled = createScrambledCube(sampleScramble);
    const steps = solveWithHumanCFOP(scrambled, 'en');

    assert.ok(steps.length > 0, 'CFOP solver must produce solution steps');
    assert.ok(steps.length > 20, 'CFOP solver must produce authentic human move count (> 20 moves)');

    const phases = steps.map(s => s.phase || '');
    assert.ok(
      phases.some(p => p.includes('Cross') || p.includes('Phase 1')),
      'Must contain Cross phase'
    );
    assert.ok(
      phases.some(p => p.includes('F2L') || p.includes('Phase 2') || p.includes('OLL') || p.includes('PLL')),
      'Must contain CFOP phases'
    );

    // Verify mathematical correctness
    let state = scrambled;
    for (const step of steps) {
      state = applyMove(state, step.move);
    }
    assert.strictEqual(isCubeSolved(state), true, 'CFOP steps must fully solve the cube');
  });

  it('F15-6: Learner State Machine translates reasons and phases into Hindi and Hinglish', () => {
    const scrambled = createScrambledCube(sampleScramble);

    // Hindi
    const hiSteps = solveWithHumanStateMachine(scrambled, 'lbl', 'hi');
    assert.ok(hiSteps.length > 0);
    assert.ok(hiSteps[0].phase?.includes('चरण'), 'Hindi phase must contain "चरण"');

    // Devanagari Hinglish
    const devHinglishSteps = solveWithHumanStateMachine(scrambled, 'lbl', 'hi-hinglish');
    assert.ok(devHinglishSteps.length > 0);
    assert.ok(devHinglishSteps[0].phase?.includes('स्टेज'), 'Devanagari Hinglish must contain "स्टेज"');

    // Roman Hinglish
    const romanHinglishSteps = solveWithHumanStateMachine(scrambled, 'cfop', 'hinglish');
    assert.ok(romanHinglishSteps.length > 0);
    assert.ok(romanHinglishSteps[0].tip?.toLowerCase().includes('tip') || romanHinglishSteps[0].tip?.includes('karein'));
  });

  it('F15-7: Translation helper fallback works gracefully for unknown keys', () => {
    assert.strictEqual(t('non_existent_key', 'en'), 'non_existent_key');
    assert.strictEqual(t('nav_solver', 'hi'), '3D सॉल्वर');
    assert.strictEqual(t('nav_solver', 'hi-hinglish'), '3D सॉल्वर');
  });

  it('F15-8: Learner LBL strictly aligns with J Perm 3x3 beginner method (7Ron6MN45LY &t=500s)', () => {
    const scrambled = createScrambledCube(sampleScramble);
    const steps = solveWithHumanLBL(scrambled, 'en');

    // Verify J Perm method stages and terminology
    const phases = steps.map(s => s.phase || '');
    assert.ok(phases.some(p => p.includes('J Perm') || p.includes('Step 1')), 'Must mention J Perm steps');
    
    // Check algorithm names for 4-moves
    const algs = steps.map(s => s.algorithmName || '');
    assert.ok(algs.some(a => a.includes('4-Moves') || a.includes('Swing') || a.includes('Sune') || a.includes('Niklas')), 'Must include J Perm 4-moves and beginner algorithms');

    // Check Step 7 (Timestamp 500s / 8:20)
    const step7Steps = steps.filter(s => s.phase?.includes('Step 7') || s.phase?.includes('Orient Corners'));
    if (step7Steps.length > 0) {
      assert.ok(step7Steps[0].phase?.includes('&t=500s') || step7Steps[0].phase?.includes('8:20'), 'Step 7 must reference J Perm 8:20 (&t=500s)');
      assert.ok(step7Steps[0].tip?.includes('yellow on the bottom') || step7Steps[0].tip?.includes('Golden Rule'), 'Step 7 tip must emphasize J Perm golden rule');
    }
  });
});

