import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, Pause, SkipBack, SkipForward, RotateCcw, 
  Volume2, VolumeX, Mic, MicOff,
  Sparkles, Award, AlertTriangle, Compass, CheckCircle2, RotateCw, RefreshCw
} from 'lucide-react';
import type { CubeState, SolutionStep, SolverMode, Face } from '../solver/cubeTypes';
import { FACE_NAMES } from '../solver/cubeTypes';
import { isCubeSolved } from '../solver/moveParser';
import { soundManager } from '../utils/soundEffects';
import { speechGuide } from '../utils/speechGuide';

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
  onOpenEditor
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

  // Keyboard navigation shortcuts: Space (Play/Pause), ArrowRight (Next), ArrowLeft (Prev), KeyR (Reset)
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

  return (
    <div className="w-full flex flex-col gap-2 sm:gap-3 text-white">
      {/* Solver Mode & Quick Controls Bar */}
      <div 
        className="flex items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-colors flex-shrink-0"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        {/* Mode Selector Pill */}
        <div className="flex items-center p-0.5 rounded-lg sm:rounded-xl border border-white/15" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <button
            onClick={() => onSelectMode('optimal')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-md sm:rounded-lg transition-all ${
              solverMode === 'optimal'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Optimal <span className="hidden xs:inline">(~20)</span>
          </button>
          <button
            onClick={() => onSelectMode('beginner')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-bold rounded-md sm:rounded-lg transition-all ${
              solverMode === 'beginner'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Beginner <span className="hidden xs:inline">(CFOP)</span>
          </button>
        </div>

        {/* Orientation Guidance Pill (Compact on mobile, descriptive on tablet/desktop) */}
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
            <span className="hidden xs:inline">White Top</span>
            <span className="xs:hidden">W</span>
          </span>
          <span className="text-neutral-500">&bull;</span>
          <span className="flex items-center gap-1 font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm" />
            <span className="hidden xs:inline">Green Front</span>
            <span className="xs:hidden">G</span>
          </span>
        </div>

        {/* Speed & Audio Icons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Quick cycle speed button */}
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
                CUBE SOLVED! <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-300 max-w-sm leading-relaxed">
                All {totalSteps} moves were performed cleanly. Every face has returned to its solved configuration!
              </p>
              <button
                onClick={handleResetToStart}
                className="mt-3 px-3.5 py-1.5 rounded-xl bg-white text-black text-xs font-bold flex items-center gap-1.5 transition-colors hover:bg-neutral-200 shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Replay Solution From Beginning
              </button>
            </div>
          ) : (
            /* FINISHED MOVES BUT CUBE NOT SOLVED (DIAGNOSTIC) */
            <div className="flex flex-col items-center justify-center py-2.5 sm:py-4 text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-neutral-800 border border-white/30 flex items-center justify-center text-white mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mb-1 flex items-center gap-1.5 font-mono">
                Sequence Finished &bull; Cube Incomplete
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-300 max-w-md leading-relaxed">
                All {totalSteps} moves were executed, but some stickers still differ.
                Ensure you kept <strong className="text-white">White on Top</strong> and <strong className="text-white">Green in Front</strong> on every rotation.
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  onClick={handleResetToStart}
                  className="px-3 py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Replay Steps
                </button>
                {onOpenEditor && (
                  <button
                    onClick={onOpenEditor}
                    className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs flex items-center gap-1.5 hover:bg-neutral-200 transition-colors"
                  >
                    Adjust in Cube Input
                  </button>
                )}
              </div>
            </div>
          )
        ) : activeStep ? (
          /* ACTIVE STEP PRESENTATION (CRYSTAL CLEAR DUAL-AUDIENCE INSTRUCTION) */
          <div className="flex flex-col gap-2 sm:gap-3">
            {/* Step header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2 font-mono">
                <span className="px-2 py-0.5 rounded-md bg-white text-black font-black text-[11px] sm:text-xs tracking-wider">
                  STEP {currentStepIndex + 1} OF {totalSteps}
                </span>
                {activeStep.phase && (
                  <span className="px-2 py-0.5 rounded-full border border-white/20 text-[10px] text-neutral-300 font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                    {activeStep.phase}
                  </span>
                )}
              </div>
              <span className="text-[11px] sm:text-xs font-mono text-neutral-400 font-bold">
                {Math.round(((currentStepIndex) / totalSteps) * 100)}% done
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
                  {/* Next Move Lookahead Pill for Experienced Cubers */}
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-mono text-neutral-300 border border-white/15 font-semibold flex items-center gap-1">
                    <span className="text-neutral-500">Next:</span>
                    <strong className="text-white">{nextStep ? nextStep.notation : 'Done'}</strong>
                  </span>
                </div>

                {/* Beginner Steering Wheel Analogy */}
                <div className="text-xs sm:text-sm font-bold text-white leading-snug mt-0.5 truncate sm:whitespace-normal">
                  {getSteeringAnalogy(activeStep.notation) || activeStep.description}
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
                    Follow {isDouble ? '180°' : isPrime ? 'counter-clockwise ↺' : 'clockwise ↻'} 3D arrow
                  </span>
                </div>
              </div>
            </div>

            {/* Move Context Flow: Prev -> Current -> Next */}
            <div 
              className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono"
              style={{ 
                backgroundColor: 'var(--bg-canvas)', 
                borderColor: 'var(--border-subtle)' 
              }}
            >
              <div className="flex items-center gap-1 text-neutral-400 truncate">
                <span className="text-[10px] uppercase text-neutral-500">Prev:</span>
                <span className="font-bold text-white">
                  {prevStep ? prevStep.notation : 'Start'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-black font-black bg-white px-2 py-0.5 rounded-md text-[11px]">
                <span>Active: {activeStep.notation}</span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 truncate">
                <span className="text-[10px] uppercase text-neutral-500">Next:</span>
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
        ) : (
          <div className="text-center py-4 text-xs text-neutral-400">
            {isSolved ? (
              <span className="text-white font-bold flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-white" />
                Cube is already in solved state! Scramble or load new cube to solve.
              </span>
            ) : (
              'No solution loaded yet. Scramble or scan your cube to generate step-by-step instructions!'
            )}
          </div>
        )}
      </div>

      {/* Thumb-Friendly Playback Action Bar (min 48px height) */}
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
          title="Reset to Step 1 (Shortcut: R)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={handleStepBack}
          disabled={isAnimating || currentStepIndex === 0}
          className="h-12 min-h-[48px] flex-1 rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-25 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-95"
          title="Previous Step (Shortcut: Left Arrow)"
        >
          <SkipBack className="w-4 h-4" />
          <span>Prev</span>
        </button>

        <button
          onClick={togglePlay}
          disabled={isAnimating || totalSteps === 0}
          className={`h-12 min-h-[48px] flex-1 rounded-xl font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 border ${
            isPlaying 
              ? 'bg-neutral-800 text-white border-white/50' 
              : 'border-white/20 hover:bg-white/10 text-white'
          }`}
          title="Play / Pause (Shortcut: Space)"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-white text-white" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white text-white" />
              <span>{currentStepIndex >= totalSteps ? 'Replay' : 'Play'}</span>
            </>
          )}
        </button>

        <button
          onClick={handleStepForward}
          disabled={isAnimating || currentStepIndex >= totalSteps}
          className="h-12 min-h-[48px] flex-[1.4] rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-25 text-black text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-lg transition-transform active:scale-95"
          title="Next Step (Shortcut: Right Arrow)"
        >
          <span>Next</span>
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Step pills timeline */}
      {totalSteps > 0 && (
        <div 
          className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border scrollbar-none touch-pan-x transition-colors flex-shrink-0"
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
