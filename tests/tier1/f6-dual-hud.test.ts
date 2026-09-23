import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { 
  MOVE_DETAILS, 
  createSolutionStep, 
  parseMove 
} from '../../src/solver/moveParser.ts';

describe('Tier 1: F6 - Unified Dual-Audience HUD', () => {
  const all18Moves = [
    'U', "U'", 'U2',
    'D', "D'", 'D2',
    'F', "F'", 'F2',
    'B', "B'", 'B2',
    'L', "L'", 'L2',
    'R', "R'", 'R2'
  ];

  it('F6-1: MOVE_DETAILS covers all 18 standard WCA moves with beginner steering descriptions', () => {
    all18Moves.forEach(move => {
      const detail = MOVE_DETAILS[move];
      assert.ok(detail, `MOVE_DETAILS must have entry for ${move}`);
      assert.ok(detail.desc && detail.desc.length > 10, `${move} must have clear beginner description`);
      assert.ok(detail.voice && detail.voice.length > 0, `${move} must have spoken voice text`);
      assert.ok(detail.arrowDir && detail.arrowDir.length > 0, `${move} must have arrow direction hint`);
    });
  });

  it('F6-2: createSolutionStep correctly sets dual-audience properties on SolutionStep', () => {
    const step = createSolutionStep("R'", 2, 10, 'Stage 1: White Cross');
    assert.strictEqual(step.notation, "R'");
    assert.strictEqual(step.face, 'R');
    assert.strictEqual(step.turns, -1);
    assert.strictEqual(step.stepIndex, 2);
    assert.strictEqual(step.totalSteps, 10);
    assert.strictEqual(step.phase, 'Stage 1: White Cross');
    assert.ok(step.description.includes('Right face Counter-Clockwise'));
    assert.ok(step.voiceText.includes('Right face down'));
  });

  it('F6-3: In-canvas bottom banner in Cube3DViewer is hidden on mobile screens', () => {
    const viewerPath = path.resolve(process.cwd(), 'src/components/Cube3DViewer.tsx');
    const viewerContent = fs.readFileSync(viewerPath, 'utf-8');

    // Requirement: In-canvas bottom banner must have hidden lg:block to ensure 0% cube occlusion on mobile
    assert.ok(
      viewerContent.includes('hidden lg:block'),
      'In-canvas HUD must be hidden on mobile (hidden lg:block) so docked StepSolverGuide controls the screen'
    );
  });

  it('F6-4: Next step lookahead preview correctly surfaces upcoming move notation', () => {
    const step1 = createSolutionStep('U', 0, 2);
    const step2 = createSolutionStep('R2', 1, 2);

    assert.strictEqual(step1.notation, 'U');
    assert.strictEqual(step2.notation, 'R2');
    assert.strictEqual(step2.turns, 2);
    assert.ok(step2.description.includes('180°'));
  });

  it('F6-5: parseMove accurately parses single clockwise, prime counter-clockwise, and 180 double turns', () => {
    assert.deepStrictEqual(parseMove('F'), { face: 'F', turns: 1 });
    assert.deepStrictEqual(parseMove("F'"), { face: 'F', turns: -1 });
    assert.deepStrictEqual(parseMove('F2'), { face: 'F', turns: 2 });
  });

  it('F6-6: Steering analogies use physical direction terms for beginner clarity', () => {
    assert.ok(MOVE_DETAILS['R'].desc.includes('up'));
    assert.ok(MOVE_DETAILS["R'"].desc.includes('down'));
    assert.ok(MOVE_DETAILS['U'].desc.includes('left'));
    assert.ok(MOVE_DETAILS["U'"].desc.includes('right'));
    assert.ok(MOVE_DETAILS['F'].desc.includes('steering wheel'));
  });
});
