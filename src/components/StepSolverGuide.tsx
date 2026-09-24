import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, 
  Volume2, VolumeX, Mic, MicOff,
  Sparkles, Award, AlertTriangle, Compass, CheckCircle2, RotateCw, RefreshCw,
  GraduationCap, Lightbulb, BookOpen, Video, ExternalLink
} from 'lucide-react';
import type { CubeState, SolutionStep, SolverMode, Face, LearnerMethod } from '../solver/cubeTypes';
import { FACE_NAMES } from '../solver/cubeTypes';
import { isCubeSolved } from '../solver/moveParser';
import { soundManager } from '../utils/soundEffects';
import { speechGuide } from '../utils/speechGuide';
import { t, getLocalizedAnalogy, type AppLanguage } from '../utils/i18n';

export function getSteeringAnalogy(notation: string): string {
  if (!notation) return '';
  const m = notation.trim();
  switch (m) {
    case 'R':
      return 'Turn right side away from you (push up 90°)';
    case "R'":
      return 'Turn right side towards you (pull down 90°)';
    case 'R2':
      return 'Turn right side twice (180° rotation)';
    case 'L':
      return 'Turn left side towards you (pull down 90°)';
    case "L'":
      return 'Turn left side away from you (push up 90°)';
    case 'L2':
      return 'Turn left side twice (180° rotation)';
    case 'U':
      return 'Turn top layer clockwise 90° (flick left like steering wheel)';
    case "U'":
      return 'Turn top layer counter-clockwise 90° (flick right like steering wheel)';
    case 'U2':
      return 'Turn top layer twice (180° rotation)';
    case 'D':
      return 'Turn bottom layer clockwise 90° (flick right)';
    case "D'":
      return 'Turn bottom layer counter-clockwise 90° (flick left)';
    case 'D2':
      return 'Turn bottom layer twice (180° rotation)';
    case 'F':
      return 'Turn front face right like a steering wheel (clockwise 90°)';
    case "F'":
      return 'Turn front face left like a steering wheel (counter-clockwise 90°)';
    case 'F2':
      return 'Turn front face twice like a steering wheel (180° rotation)';
    case 'B':
      return 'Turn back face clockwise 90° (looking from behind)';
    case "B'":
      return 'Turn back face counter-clockwise 90° (looking from behind)';
    case 'B2':
      return 'Turn back face twice (180° rotation)';
    default:
      return '';
  }
}

interface StepSolverGuideProps {
  steps: SolutionStep[];
  currentStepIndex: number;
  cubeState: CubeState;
  solverMode: SolverMode;
  onSelectMode: (mode: SolverMode) => void;
  onStepChange: (index: number) => void;
  onPerformMove: (move: string, isForward: boolean) => Promise<void>;
  isAnimating: boolean;
  onOpenEditor?: () => void;
  language?: AppLanguage;
  learnerMethod?: LearnerMethod;
  onSelectLearnerMethod?: (method: LearnerMethod) => void;
}

export const StepSolverGuide: React.FC<StepSolverGuideProps> = ({
  steps,
  currentStepIndex,
  cubeState,
  solverMode,
  onSelectMode,
  onStepChange,
  onPerformMove,
  isAnimating,
  onOpenEditor,
  language = 'en',
  learnerMethod = 'lbl',
  onSelectLearnerMethod,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(false);
  const playTimerRef = useRef<number | null>(null);

  const totalSteps = steps.length;
  const isSequenceFinished = totalSteps > 0 && currentStepIndex >= totalSteps;
  const isSolved = isCubeSolved(cubeState);
  const activeStep = steps[Math.min(currentStepIndex, Math.max(0, totalSteps - 1))];
  const prevStep = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  const nextStep = currentStepIndex + 1 < totalSteps ? steps[currentStepIndex + 1] : null;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
  };

  const toggleVoice = () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    speechGuide.enabled = next;
    if (next && activeStep) {
      speechGuide.speak(activeStep.voiceText);
    }
  };

  // ONLY celebrate when cube is genuinely solved in reality
  useEffect(() => {
    if (isSequenceFinished && isSolved) {
      soundManager.playVictoryFanfare();
      speechGuide.speak('Congratulations! The Rubik\'s Cube is solved!');
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // Ignore
      }
    }
  }, [isSequenceFinished, isSolved]);

  useEffect(() => {
    if (voiceEnabled && activeStep && !isSequenceFinished) {
      speechGuide.speak(activeStep.voiceText);
    }
  }, [currentStepIndex, voiceEnabled, isSequenceFinished]);

  const handleStepForward = async () => {
    if (currentStepIndex >= totalSteps || isAnimating) return;
    const step = steps[currentStepIndex];
    await onPerformMove(step.move, true);
    onStepChange(currentStepIndex + 1);
  };

  const handleStepBack = async () => {
    if (currentStepIndex <= 0 || isAnimating) return;
    const prev = steps[currentStepIndex - 1];
    await onPerformMove(prev.move, false);
    onStepChange(currentStepIndex - 1);
  };

  useEffect(() => {
    if (isPlaying) {
      if (currentStepIndex >= totalSteps) {
        setIsPlaying(false);
        return;
      }

      const delay = Math.max(500, 1400 / speedMultiplier);
      playTimerRef.current = window.setTimeout(async () => {
        if (!isAnimating && currentStepIndex < totalSteps) {
          const step = steps[currentStepIndex];
          await onPerformMove(step.move, true);
          onStepChange(currentStepIndex + 1);
        }
      }, delay);
    }

    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, totalSteps, speedMultiplier, isAnimating]);

  const togglePlay = () => {
    if (currentStepIndex >= totalSteps) {
      onStepChange(0);
    }
    setIsPlaying(prev => !prev);
  };

  const handleResetToStart = () => {
    setIsPlaying(false);
    onStepChange(0);
  };

  const stepForwardRef = useRef(handleStepForward);
  stepForwardRef.current = handleStepForward;

  const stepBackRef = useRef(handleStepBack);
  stepBackRef.current = handleStepBack;

  const togglePlayRef = useRef(togglePlay);
  togglePlayRef.current = togglePlay;

  const resetRef = useRef(handleResetToStart);
  resetRef.current = handleResetToStart;

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayRef.current();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepForwardRef.current();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepBackRef.current();
      } else if (e.code === 'KeyR' || (e.key && e.key.toLowerCase() === 'r')) {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          resetRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeFace = activeStep?.move ? (activeStep.move[0] as Face) : null;
  const isPrime = activeStep?.move.includes("'");
  const isDouble = activeStep?.move.includes('2');

  const currentAnalogy = activeStep
    ? getLocalizedAnalogy(activeStep.notation, language) || getSteeringAnalogy(activeStep.notation) || activeStep.description
    : '';

  return (
    <div className="w-full flex flex-col gap-2 sm:gap-3 text-white">
      {/* Solver Mode & Quick Controls Bar */}
      <div 
        className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-colors flex-shrink-0"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        {/* Mode Selector Pill (Optimal, Beginner, Learner) */}
        <div className="flex items-center p-0.5 rounded-lg sm:rounded-xl border border-white/15" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <button
            onClick={() => onSelectMode('optimal')}
            className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md sm:rounded-lg transition-all ${
              solverMode === 'optimal'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('mode_optimal', language)}
          </button>
          <button
            onClick={() => onSelectMode('beginner')}
            className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md sm:rounded-lg transition-all ${
              solverMode === 'beginner'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('mode_beginner', language)}
          </button>
          <button
            onClick={() => onSelectMode('learner')}
            className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-md sm:rounded-lg transition-all flex items-center gap-1 ${
              solverMode === 'learner'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3 h-3" />
            <span>{t('mode_learner', language)}</span>
          </button>
        </div>

        {/* Orientation Guidance Pill */}
        <div 
          className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-mono transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-canvas)', 
            borderColor: 'var(--border-subtle)' 
          }}
          title="Orientation: White on Top, Green in Front"
        >
          <Compass className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <span className="flex items-center gap-1 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-white border border-neutral-600 inline-block shadow-sm" />
            <span className="hidden xs:inline">{t('orient_white_top', language)}</span>
            <span className="xs:hidden">W</span>
          </span>
          <span className="text-neutral-500">&bull;</span>
          <span className="flex items-center gap-1 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm" />
            <span className="hidden xs:inline">{t('orient_green_front', language)}</span>
            <span className="xs:hidden">G</span>
          </span>
        </div>

        {/* Speed & Audio Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => {
              const speeds = [0.5, 1.0, 1.5, 2.0];
              const nextIdx = (speeds.indexOf(speedMultiplier) + 1) % speeds.length;
              setSpeedMultiplier(speeds[nextIdx]);
            }}
            className="px-2 py-1 rounded-lg border border-white/20 text-xs font-mono font-bold text-white hover:bg-white/10 transition-colors"
            title="Click to cycle playback speed (0.5x, 1x, 1.5x, 2x)"
          >
            {speedMultiplier}x
          </button>

          <button
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundEnabled 
                ? 'bg-white/15 border-white/30 text-white' 
                : 'bg-white/5 border-white/10 text-neutral-500'
            }`}
            title={soundEnabled ? 'Mute rotation clicks' : 'Enable rotation clicks'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          <button
            onClick={toggleVoice}
            className={`p-1.5 rounded-lg border transition-colors ${
              voiceEnabled 
                ? 'bg-white text-black border-white' 
                : 'bg-white/5 border-white/10 text-neutral-500'
            }`}
            title={voiceEnabled ? 'Disable voice cues' : 'Enable voice cues'}
          >
            {voiceEnabled ? <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[2.2]" /> : <MicOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>
        </div>
      </div>

      {/* Sub-method switch if in Learner mode */}
      {solverMode === 'learner' && (
        <div 
          className="flex items-center justify-between gap-2 p-1.5 rounded-xl border border-white/15 animate-in fade-in transition-all flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-canvas)' }}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold text-white pl-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">Method:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => onSelectLearnerMethod && onSelectLearnerMethod('lbl')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                learnerMethod === 'lbl'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('submethod_lbl', language)}
            </button>
            <button
              onClick={() => onSelectLearnerMethod && onSelectLearnerMethod('cfop')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                learnerMethod === 'cfop'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('submethod_cfop', language)}
            </button>

            {learnerMethod === 'lbl' && (
              <a
                href={activeStep?.phase?.includes('Step 7') || activeStep?.phase?.includes('चरण 7') || activeStep?.phase?.includes('स्टेज 7')
                  ? 'https://www.youtube.com/watch?v=7Ron6MN45LY&t=500s'
                  : 'https://www.youtube.com/watch?v=7Ron6MN45LY'}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 transition-colors ml-1"
                title={t('watch_jperm_tutorial', language)}
              >
                <Video className="w-3 h-3 text-red-400" />
                <span>{activeStep?.phase?.includes('Step 7') || activeStep?.phase?.includes('चरण 7') || activeStep?.phase?.includes('स्टेज 7') ? 'J Perm (8:20)' : 'J Perm Tutorial'}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Instruction Card (High-Contrast Hero & Dual-Audience Guidance) */}
      <div 
        className="relative p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border backdrop-blur shadow-2xl overflow-hidden transition-colors flex-shrink-0"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        {isSequenceFinished ? (
          isSolved ? (
            /* GENUINELY SOLVED */
            <div className="flex flex-col items-center justify-center py-2.5 sm:py-4 text-center">
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white text-black flex items-center justify-center mb-2 sm:mb-3 shadow-xl">
                <Award className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.2]" />
              </div>
              <h3 className="text-base sm:text-xl font-black text-white mb-1 flex items-center gap-2 font-mono">
                {t('solved_title', language)} <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-300 max-w-sm leading-relaxed">
                {t('solved_desc', language)}
              </p>
              <button
                onClick={handleResetToStart}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-1.5 transition-colors hover:bg-neutral-200 shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('replay_solution', language)}
              </button>
            </div>
          ) : (
            /* FINISHED MOVES BUT CUBE NOT SOLVED (DIAGNOSTIC) */
            <div className="flex flex-col items-center justify-center py-2.5 sm:py-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-neutral-800 border border-white/30 flex items-center justify-center text-white mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-1.5 font-mono">
                {t('incomplete_title', language)}
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-300 max-w-md leading-relaxed">
                {t('incomplete_desc', language)}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={handleResetToStart}
                  className="px-3 py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('replay_solution', language)}
                </button>
                {onOpenEditor && (
                  <button
                    onClick={onOpenEditor}
                    className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors"
                  >
                    {t('btn_adjust_input', language)}
                  </button>
                )}
              </div>
            </div>
          )
        ) : activeStep ? (
          <>
            {/* Mobile Compact Move Card (Ultra-compact dock to maximize 3D canvas) */}
            <div className="md:hidden flex flex-col gap-1.5 p-1.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white text-black font-mono text-xl font-black flex items-center justify-center flex-shrink-0 shadow-md">
                    {activeStep.notation}
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-white">
                      <span>{activeFace ? `${FACE_NAMES[activeFace]} Face` : 'Turn Face'}</span>
                      <span className="text-neutral-400">•</span>
                      <span className="text-neutral-200">{isDouble ? '180°' : isPrime ? '90° CCW' : '90° CW'}</span>
                      {nextStep && (
                        <span className="text-neutral-400 text-[9px] ml-1">Next: <strong className="text-white">{nextStep.notation}</strong></span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-white truncate max-w-[210px]">
                      {currentAnalogy}
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono font-bold text-neutral-300 border border-white/15">
                  {currentStepIndex + 1}/{totalSteps}
                </div>
              </div>

              {/* Mobile Educational Reason Snippet in Learner Mode */}
              {activeStep.reason && (
                <div className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-neutral-200 flex flex-col gap-1 leading-snug">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 font-bold text-white text-[10px] truncate">
                      <Lightbulb className="w-3 h-3 text-amber-300 flex-shrink-0" />
                      <span className="truncate">{activeStep.algorithmName || t('why_this_move', language)}</span>
                    </div>
                    {solverMode === 'learner' && learnerMethod === 'lbl' && (
                      <a
                        href={activeStep.phase?.includes('Step 7') || activeStep.phase?.includes('चरण 7') || activeStep.phase?.includes('स्टेज 7')
                          ? 'https://www.youtube.com/watch?v=7Ron6MN45LY&t=500s'
                          : 'https://www.youtube.com/watch?v=7Ron6MN45LY'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-0.5 text-[9px] font-bold text-red-400 flex-shrink-0 bg-red-950/30 border border-red-500/20 px-1.5 py-0.5 rounded"
                        title={t('watch_jperm_tutorial', language)}
                      >
                        <Video className="w-2.5 h-2.5" />
                        <span>{activeStep.phase?.includes('Step 7') || activeStep.phase?.includes('चरण 7') || activeStep.phase?.includes('स्टेज 7') ? '8:20' : 'J Perm'}</span>
                        <ExternalLink className="w-2 h-2" />
                      </a>
                    )}
                  </div>
                  <span className="line-clamp-2">
                    {activeStep.reason}
                  </span>
                </div>
              )}
            </div>

            {/* Desktop & Tablet Rich Guidance */}
            <div className="hidden md:flex flex-col gap-2 sm:gap-3">
              {/* Step header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
                  <span className="px-2 py-0.5 rounded-md bg-white text-black font-black text-[11px] sm:text-xs tracking-wider">
                    {t('step_counter', language)} {currentStepIndex + 1} {t('step_of', language)} {totalSteps}
                  </span>
                  {activeStep.phase && (
                    <span className="px-2 py-0.5 rounded-full border border-white/20 text-[10px] text-neutral-300 font-semibold truncate max-w-[160px] sm:max-w-[280px]">
                      {activeStep.phase}
                    </span>
                  )}
                </div>
                <span className="text-[11px] sm:text-xs font-mono text-neutral-400 font-bold">
                  {Math.round(((currentStepIndex) / totalSteps) * 100)}% {t('done', language)}
                </span>
              </div>

              {/* Current Move Hero Box */}
              <div 
                className="flex items-center gap-2.5 sm:gap-3.5 p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-colors"
                style={{ 
                  backgroundColor: 'var(--bg-elevated)', 
                  borderColor: 'var(--border-strong)' 
                }}
              >
                {/* Massive High-Contrast Move Notation Pill */}
                <div 
                  className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white text-black font-mono text-2xl sm:text-3xl font-black flex items-center justify-center flex-shrink-0 shadow-xl border border-neutral-300"
                  aria-label={`Current move notation: ${activeStep.notation}`}
                >
                  {activeStep.notation}
                </div>

                {/* Step Directions: Dual-Audience Beginner Analogy + Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">
                      {activeFace ? `${FACE_NAMES[activeFace]} Face` : 'Turn Face'}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-neutral-200 border border-white/20 font-bold">
                      {isDouble ? '⟳ 180° Turn' : isPrime ? '↺ 90° CCW' : '↻ 90° CW'}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-mono text-neutral-300 border border-white/15 font-semibold flex items-center gap-1">
                      <span className="text-neutral-500">{t('next_move', language)}:</span>
                      <strong className="text-white">{nextStep ? nextStep.notation : 'Done'}</strong>
                    </span>
                  </div>

                  {/* Steering Analogy */}
                  <div className="text-xs sm:text-sm font-bold text-white leading-snug mt-0.5 truncate sm:whitespace-normal">
                    {currentAnalogy}
                  </div>

                  <div className="text-[10px] sm:text-[11px] text-neutral-400 font-mono mt-0.5 flex items-center gap-1.5 truncate">
                    {isDouble ? (
                      <RefreshCw className="w-3 h-3 text-white stroke-[2.5] flex-shrink-0" />
                    ) : isPrime ? (
                      <RotateCcw className="w-3 h-3 text-white stroke-[2.5] flex-shrink-0" />
                    ) : (
                      <RotateCw className="w-3 h-3 text-white stroke-[2.5] flex-shrink-0" />
                    )}
                    <span className="truncate">
                      {t('follow_arrow', language)} ({isDouble ? '180°' : isPrime ? '↺' : '↻'})
                    </span>
                  </div>
                </div>
              </div>

              {/* Educational Why This Move Box (Present when in Learner Mode) */}
              {activeStep.reason && (
                <div 
                  className="p-3 rounded-xl sm:rounded-2xl border border-white/15 flex flex-col gap-1.5 transition-all shadow-md"
                  style={{ backgroundColor: 'var(--bg-canvas)' }}
                >
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                      <span>{t('why_this_move', language)}</span>
                      {activeStep.algorithmName && (
                        <span className="ml-1 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono font-bold text-neutral-300 border border-white/15">
                          {activeStep.algorithmName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeStep.subStage && (
                        <span className="text-[10px] font-mono text-neutral-400">
                          {activeStep.subStage}
                        </span>
                      )}
                      {solverMode === 'learner' && learnerMethod === 'lbl' && (
                        <a
                          href={activeStep.phase?.includes('Step 7') || activeStep.phase?.includes('चरण 7') || activeStep.phase?.includes('स्टेज 7')
                            ? 'https://www.youtube.com/watch?v=7Ron6MN45LY&t=500s'
                            : 'https://www.youtube.com/watch?v=7Ron6MN45LY'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded-md transition-colors"
                          title={t('watch_jperm_tutorial', language)}
                        >
                          <Video className="w-3 h-3 text-red-400" />
                          <span>{activeStep.phase?.includes('Step 7') || activeStep.phase?.includes('चरण 7') || activeStep.phase?.includes('स्टेज 7') ? 'J Perm (8:20)' : 'J Perm Video'}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-200 leading-relaxed font-sans">
                    {activeStep.reason}
                  </p>
                  {(activeStep.phase?.includes('Step 7') || activeStep.phase?.includes('चरण 7') || activeStep.phase?.includes('स्टेज 7')) && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] font-medium text-amber-200 flex items-center gap-1.5 leading-snug">
                      <span className="font-bold text-amber-400">⚡ {t('step7_final_warning', language)}</span>
                    </div>
                  )}
                  {activeStep.tip && (
                    <div className="mt-1 pt-1.5 border-t border-white/10 text-[11px] text-neutral-400 flex items-start gap-1 leading-snug">
                      <span className="text-amber-300 flex-shrink-0">★</span>
                      <span>{activeStep.tip}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Move Context Flow: Prev -> Current -> Next */}
              <div 
                className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono"
                style={{ 
                  backgroundColor: 'var(--bg-canvas)', 
                  borderColor: 'var(--border-subtle)' 
                }}
              >
                <div className="flex items-center gap-1 text-neutral-400 truncate">
                  <span className="text-[10px] uppercase text-neutral-500">{t('prev_move', language)}:</span>
                  <span className="font-bold text-white">
                    {prevStep ? prevStep.notation : 'Start'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-black font-black bg-white px-2 py-0.5 rounded-md text-[11px]">
                  <span>{t('active_move', language)}: {activeStep.notation}</span>
                </div>
                <div className="flex items-center gap-1 text-neutral-400 truncate">
                  <span className="text-[10px] uppercase text-neutral-500">{t('next_move', language)}:</span>
                  <span className="font-bold text-white">
                    {nextStep ? nextStep.notation : 'Done'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 sm:h-2 rounded-full overflow-hidden border border-white/20" style={{ backgroundColor: 'var(--bg-canvas)' }}>
                <div
                  className="h-full bg-white transition-all duration-300 shadow-sm"
                  style={{ width: `${((currentStepIndex) / totalSteps) * 100}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4 text-xs text-neutral-400">
            {isSolved ? (
              <span className="text-white font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-white" />
                {t('already_solved', language)}
              </span>
            ) : (
              t('no_solution_prompt', language)
            )}
          </div>
        )}
      </div>

      {/* Thumb-Friendly Playback Action Bar */}
      <div 
        className="flex items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border shadow-xl transition-colors flex-shrink-0"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        <button
          onClick={handleResetToStart}
          disabled={isAnimating || currentStepIndex === 0}
          className="h-12 min-h-[48px] w-12 min-w-[48px] flex items-center justify-center rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-25 text-white transition-colors flex-shrink-0 active:scale-95"
          title={`${t('btn_reset', language)} (R)`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={handleStepBack}
          disabled={isAnimating || currentStepIndex === 0}
          className="h-12 min-h-[48px] flex-1 rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-25 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          title={`${t('btn_prev', language)} (Left Arrow)`}
        >
          <SkipBack className="w-4 h-4" />
          <span>{t('btn_prev', language)}</span>
        </button>

        <button
          onClick={togglePlay}
          disabled={isAnimating || totalSteps === 0}
          className={`h-12 min-h-[48px] flex-1 rounded-xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 border ${
            isPlaying 
              ? 'bg-neutral-800 text-white border-white/50' 
              : 'border-white/20 hover:bg-white/10 text-white'
          }`}
          title={`${isPlaying ? t('btn_pause', language) : t('btn_play', language)} (Space)`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-white text-white" />
              <span>{t('btn_pause', language)}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white text-white" />
              <span>{currentStepIndex >= totalSteps ? t('btn_replay', language) : t('btn_play', language)}</span>
            </>
          )}
        </button>

        <button
          onClick={handleStepForward}
          disabled={isAnimating || currentStepIndex >= totalSteps}
          className="h-12 min-h-[48px] flex-[1.4] rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-25 text-black text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
          title={`${t('btn_next', language)} (Right Arrow)`}
        >
          <span>{t('btn_next', language)}</span>
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Step pills timeline (Desktop only: hidden on mobile per user request since elevated to top of mobile screen) */}
      {totalSteps > 0 && (
        <div 
          className="hidden md:flex items-center gap-1 sm:gap-1.5 overflow-x-auto p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border scrollbar-none touch-pan-x transition-colors flex-shrink-0"
          style={{ 
            backgroundColor: 'var(--bg-canvas)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          {steps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                onClick={() => onStepChange(idx)}
                className={`flex-shrink-0 min-w-[36px] sm:min-w-[40px] h-8 sm:h-9 px-2 sm:px-2.5 rounded-lg sm:rounded-xl text-xs font-mono font-black transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'bg-white text-black shadow-lg scale-105 border-2 border-white'
                    : isDone
                    ? 'bg-neutral-800 text-white border border-white/20'
                    : 'bg-black/60 text-neutral-400 border border-white/10 hover:text-white'
                }`}
              >
                {step.notation}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
