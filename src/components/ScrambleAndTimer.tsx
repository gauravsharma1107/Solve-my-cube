import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Dices, Award, Clock, Flame, ChevronRight } from 'lucide-react';
import type { Face } from '../solver/cubeTypes';

interface ScrambleAndTimerProps {
  onApplyScramble: (scrambleStr: string) => void;
  onOpen3DSolver: () => void;
}

const FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];
const MODIFIERS = ['', "'", '2'];

export function generateWcaScramble(length: number = 21): string {
  const scramble: string[] = [];
  let lastFace: Face | null = null;
  let secondLastFace: Face | null = null;

  for (let i = 0; i < length; i++) {
    let face: Face;
    do {
      face = FACES[Math.floor(Math.random() * FACES.length)];
    } while (
      face === lastFace ||
      (face === secondLastFace && areOpposite(face, lastFace!))
    );

    const mod = MODIFIERS[Math.floor(Math.random() * MODIFIERS.length)];
    scramble.push(`${face}${mod}`);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble.join(' ');
}

function areOpposite(f1: Face, f2: Face): boolean {
  return (
    (f1 === 'U' && f2 === 'D') ||
    (f1 === 'D' && f2 === 'U') ||
    (f1 === 'L' && f2 === 'R') ||
    (f1 === 'R' && f2 === 'L') ||
    (f1 === 'F' && f2 === 'B') ||
    (f1 === 'B' && f2 === 'F')
  );
}

export const ScrambleAndTimer: React.FC<ScrambleAndTimerProps> = ({
  onApplyScramble,
  onOpen3DSolver
}) => {
  const [scramble, setScramble] = useState<string>(() => generateWcaScramble());
  const [timerState, setTimerState] = useState<'idle' | 'holding' | 'ready' | 'timing'>('idle');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [solveTimes, setSolveTimes] = useState<number[]>([]);

  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const timerStateRef = useRef<'idle' | 'holding' | 'ready' | 'timing'>('idle');

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  const newScramble = () => {
    const s = generateWcaScramble();
    setScramble(s);
  };

  const handleApply = () => {
    onApplyScramble(scramble);
    onOpen3DSolver();
  };

  const startTimer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    startTimeRef.current = performance.now();
    setTimerState('timing');

    const update = () => {
      setElapsedTime(performance.now() - startTimeRef.current);
      animationFrameRef.current = requestAnimationFrame(update);
    };
    animationFrameRef.current = requestAnimationFrame(update);
  };

  const stopTimer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    const finalTime = performance.now() - startTimeRef.current;
    setElapsedTime(finalTime);
    setSolveTimes(prev => [finalTime, ...prev]);
    setTimerState('idle');
    newScramble();
  };

  const handleResetTimer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setElapsedTime(0);
    setTimerState('idle');
  };

  // Spacebar and keyboard shortcut handling (no document.body restriction)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (timerStateRef.current === 'timing') {
          stopTimer();
        } else if (timerStateRef.current === 'idle') {
          setTimerState('holding');
          holdTimerRef.current = window.setTimeout(() => {
            setTimerState('ready');
          }, 300);
        }
      } else if (timerStateRef.current === 'timing') {
        // Any key stops the timer when running
        e.preventDefault();
        stopTimer();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (timerStateRef.current === 'ready' || timerStateRef.current === 'holding') {
          if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          startTimer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  // When timer is running, any screen tap / touch instantly stops the timer
  useEffect(() => {
    if (timerState !== 'timing') return;

    const handleGlobalStop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      stopTimer();
    };

    window.addEventListener('pointerdown', handleGlobalStop, { capture: true });
    window.addEventListener('touchstart', handleGlobalStop, { capture: true });

    return () => {
      window.removeEventListener('pointerdown', handleGlobalStop, { capture: true });
      window.removeEventListener('touchstart', handleGlobalStop, { capture: true });
    };
  }, [timerState]);

  const handlePadPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (timerStateRef.current === 'timing') {
      stopTimer();
      return;
    }
    if (timerStateRef.current === 'idle') {
      setTimerState('holding');
      holdTimerRef.current = window.setTimeout(() => {
        setTimerState('ready');
      }, 300);
    }
  };

  const handlePadPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    if (timerStateRef.current === 'ready' || timerStateRef.current === 'holding') {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      startTimer();
    }
  };

  const formatTime = (ms: number): string => {
    const totalSecs = ms / 1000;
    const mins = Math.floor(totalSecs / 60);
    const secs = Math.floor(totalSecs % 60);
    const millis = Math.floor((ms % 1000) / 10);

    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    }
    return `${secs}.${millis.toString().padStart(2, '0')}`;
  };

  const bestTime = solveTimes.length > 0 ? Math.min(...solveTimes) : null;
  const ao5 = solveTimes.length >= 5
    ? solveTimes.slice(0, 5).reduce((a, b) => a + b, 0) / 5
    : null;

  return (
    <div className="w-full flex flex-col gap-4 text-white">
      {/* Scramble Card */}
      <div 
        className="p-4 sm:p-5 rounded-2xl border flex flex-col gap-3 transition-colors shadow-lg"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dices className="w-4 h-4 text-white" />
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              Official WCA Scramble
            </span>
          </div>
          <button
            onClick={newScramble}
            className="p-1.5 px-2.5 rounded-lg border border-white/20 hover:bg-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Scramble</span>
          </button>
        </div>

        <div 
          className="p-4 rounded-xl border font-mono text-sm sm:text-base text-white font-semibold tracking-wider text-center select-all"
          style={{ 
            backgroundColor: 'var(--bg-canvas)', 
            borderColor: 'var(--border-strong)' 
          }}
        >
          {scramble}
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={handleApply}
            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
          >
            <span>Apply to 3D Cube &amp; Solve</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Speedcubing Timer Pad */}
      <div
        onPointerDown={handlePadPointerDown}
        onPointerUp={handlePadPointerUp}
        className={`relative p-6 sm:p-8 rounded-3xl border text-center select-none cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] sm:min-h-[250px] shadow-2xl active:scale-[0.99] ${
          timerState === 'ready'
            ? 'bg-neutral-900 border-emerald-400 ring-4 ring-emerald-500/50'
            : timerState === 'holding'
            ? 'bg-neutral-900 border-amber-400 ring-2 ring-amber-500/40'
            : timerState === 'timing'
            ? 'bg-black border-white ring-2 ring-white/30'
            : 'border-white/20 hover:border-white/40'
        }`}
        style={{ 
          backgroundColor: timerState === 'timing' ? '#000000' : 'var(--bg-card)', 
          borderColor: timerState === 'ready' ? '#10b981' : timerState === 'holding' ? '#f59e0b' : 'var(--border-subtle)' 
        }}
      >
        <div className={`font-mono text-5xl sm:text-7xl font-black tracking-tight mb-2 transition-colors ${
          timerState === 'ready' ? 'text-emerald-400' : timerState === 'holding' ? 'text-amber-400' : 'text-white'
        }`}>
          {formatTime(elapsedTime)}
        </div>

        <div className="text-xs sm:text-sm font-mono text-neutral-400 font-medium">
          {timerState === 'ready' && <span className="text-emerald-400 font-black text-sm sm:text-base animate-pulse">● READY - RELEASE TO START!</span>}
          {timerState === 'holding' && <span className="text-amber-300 font-bold">Hold steady (300ms)...</span>}
          {timerState === 'timing' && <span className="text-white font-bold animate-pulse">TIMING &bull; Tap anywhere or press Space to stop</span>}
          {timerState === 'idle' && <span>Tap pad, click Start, or hold Spacebar</span>}
        </div>
      </div>

      {/* Direct Interactive Control Buttons */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {timerState === 'timing' ? (
          <button
            onClick={stopTimer}
            className="h-12 px-8 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95"
          >
            <span>⏹ Stop Timer</span>
          </button>
        ) : (
          <>
            <button
              onClick={startTimer}
              className="h-12 px-8 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-95"
            >
              <span>▶ Start Timer</span>
            </button>

            {elapsedTime > 0 && (
              <button
                onClick={handleResetTimer}
                className="h-12 px-5 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
                title="Reset time to 0.00"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div 
          className="p-3.5 rounded-2xl border text-center transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-center gap-1 mb-1">
            <Flame className="w-3.5 h-3.5 text-white" />
            Best Time
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-white">
            {bestTime !== null ? formatTime(bestTime) : '--'}
          </div>
        </div>

        <div 
          className="p-3.5 rounded-2xl border text-center transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3.5 h-3.5 text-white" />
            Ao5
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-white">
            {ao5 !== null ? formatTime(ao5) : '--'}
          </div>
        </div>

        <div 
          className="p-3.5 rounded-2xl border text-center transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div className="text-[10px] text-neutral-400 uppercase font-bold flex items-center justify-center gap-1 mb-1">
            <Award className="w-3.5 h-3.5 text-white" />
            Total Solves
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-white">
            {solveTimes.length}
          </div>
        </div>
      </div>
    </div>
  );
};
