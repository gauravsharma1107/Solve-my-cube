import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Navbar, type AppTab } from './components/Navbar';
import { Cube3DViewer, type Cube3DViewerRef } from './components/Cube3DViewer';
import { StepSolverGuide } from './components/StepSolverGuide';
import { getInitialIntensity, applyBlackIntensity } from './utils/themeManager';
import { getStoredLanguage, setStoredLanguage, type AppLanguage } from './utils/i18n';
import type { CubeColor, CubeState, Face, FaceState, SolutionStep, SolverMode, LearnerMethod } from './solver/cubeTypes';
import { applyMove, applyMoveSequence, invertMove, isCubeSolved } from './solver/moveParser';
import { initSolverService, solveCube } from './solver/solverService';
import { validateCubeParity } from './solver/parityValidator';

// Lazy-loaded modal and tab views to optimize critical initial bundle size
const CameraScanner = lazy(() =>
  import('./components/CameraScanner').then(m => ({ default: m.CameraScanner }))
);
const CubeNetEditor = lazy(() =>
  import('./components/CubeNetEditor').then(m => ({ default: m.CubeNetEditor }))
);
const ScrambleAndTimer = lazy(() =>
  import('./components/ScrambleAndTimer').then(m => ({ default: m.ScrambleAndTimer }))
);
const ThemeSettingsModal = lazy(() =>
  import('./components/ThemeSettingsModal').then(m => ({ default: m.ThemeSettingsModal }))
);

const SCRAMBLE_FACES: Face[] = ['U', 'D', 'L', 'R', 'F', 'B'];
const SCRAMBLE_MODIFIERS = ['', "'", '2'];

function areOppositeFaces(f1: Face, f2: Face): boolean {
  return (
    (f1 === 'U' && f2 === 'D') ||
    (f1 === 'D' && f2 === 'U') ||
    (f1 === 'L' && f2 === 'R') ||
    (f1 === 'R' && f2 === 'L') ||
    (f1 === 'F' && f2 === 'B') ||
    (f1 === 'B' && f2 === 'F')
  );
}

function generateDefaultScramble(length: number = 16): string {
  const scramble: string[] = [];
  let lastFace: Face | null = null;
  let secondLastFace: Face | null = null;

  for (let i = 0; i < length; i++) {
    let face: Face;
    do {
      face = SCRAMBLE_FACES[Math.floor(Math.random() * SCRAMBLE_FACES.length)];
    } while (
      face === lastFace ||
      (face === secondLastFace && areOppositeFaces(face, lastFace!))
    );

    const mod = SCRAMBLE_MODIFIERS[Math.floor(Math.random() * SCRAMBLE_MODIFIERS.length)];
    scramble.push(`${face}${mod}`);

    secondLastFace = lastFace;
    lastFace = face;
  }

  return scramble.join(' ');
}

function createSolvedCube(): CubeState {
  const makeFace = (c: CubeColor): FaceState => [c, c, c, c, c, c, c, c, c];
  return {
    U: makeFace('W'),
    R: makeFace('R'),
    F: makeFace('G'),
    D: makeFace('Y'),
    L: makeFace('O'),
    B: makeFace('B'),
  };
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('solver');
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [blackIntensity, setBlackIntensity] = useState<number>(() => getInitialIntensity());
  const [language, setLanguage] = useState<AppLanguage>(() => getStoredLanguage());
  const [learnerMethod, setLearnerMethod] = useState<LearnerMethod>('lbl');
  const [showReasons, setShowReasons] = useState<boolean>(true);

  const [cubeState, setCubeState] = useState<CubeState>(() => createSolvedCube());
  const [initialScrambledState, setInitialScrambledState] = useState<CubeState>(() => createSolvedCube());
  const [solutionSteps, setSolutionSteps] = useState<SolutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [solverMode, setSolverMode] = useState<SolverMode>('optimal');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [activeTurnMove, setActiveTurnMove] = useState<string | null>(null);
  const [parityError, setParityError] = useState<string | null>(null);

  const cube3DRef = useRef<Cube3DViewerRef | null>(null);
  const isInitialMount = useRef(true);
  const activePillRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll active move badge into view on mobile top letter navigation strip
  useEffect(() => {
    if (activePillRef.current) {
      activePillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [currentStepIndex]);

  // Apply black intensity to CSS variables (instant on initial mount, smooth during user slider interaction)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      applyBlackIntensity(blackIntensity, false);
    } else {
      applyBlackIntensity(blackIntensity, true);
    }
  }, [blackIntensity]);

  // Pre-warm solver in background Web Worker without freezing UI
  useEffect(() => {
    initSolverService().catch(err => {
      console.warn('Background solver service initialization notice:', err);
    });
  }, []);

  const computeSolution = async (
    state: CubeState,
    mode: SolverMode = solverMode,
    subMethod: LearnerMethod = learnerMethod,
    lang: AppLanguage = language
  ) => {
    const parity = validateCubeParity(state);
    if (!parity.isValid) {
      setParityError(parity.errors[0] || 'Parity validation failed.');
      setSolutionSteps([]);
      return;
    }

    setParityError(null);

    try {
      const result = await solveCube(state, mode, subMethod, lang);
      setSolutionSteps(result.steps);
      setCurrentStepIndex(0);
    } catch (e) {
      console.error('Solver error:', e);
      setSolutionSteps([]);
    }
  };

  const handlePerformMove = async (move: string, isForward: boolean) => {
    const targetMove = isForward ? move : invertMove(move);
    setActiveTurnMove(targetMove);
    setIsAnimating(true);

    if (cube3DRef.current) {
      await cube3DRef.current.animateMove(targetMove);
    }

    setCubeState(prev => applyMove(prev, targetMove));
    setIsAnimating(false);
    setActiveTurnMove(null);
  };

  const handleStepJump = (targetIndex: number) => {
    if (targetIndex === currentStepIndex) return;

    let next = initialScrambledState;
    for (let i = 0; i < targetIndex; i++) {
      next = applyMove(next, solutionSteps[i].move);
    }
    setCubeState(next);
    setCurrentStepIndex(targetIndex);
  };

  const handleModeChange = (newMode: SolverMode) => {
    setSolverMode(newMode);
    computeSolution(initialScrambledState, newMode, learnerMethod, language);
    setCubeState(initialScrambledState);
  };

  const handleLearnerMethodChange = (newMethod: LearnerMethod) => {
    setLearnerMethod(newMethod);
    if (solverMode === 'learner') {
      computeSolution(initialScrambledState, 'learner', newMethod, language);
      setCubeState(initialScrambledState);
    }
  };

  const handleLanguageChange = (newLang: AppLanguage) => {
    setLanguage(newLang);
    setStoredLanguage(newLang);
    computeSolution(initialScrambledState, solverMode, learnerMethod, newLang);
  };

  const handleScramble = (customScramble?: string) => {
    const seq = customScramble || generateDefaultScramble(16);
    const scrambled = applyMoveSequence(createSolvedCube(), seq);
    setInitialScrambledState(scrambled);
    setCubeState(scrambled);
    computeSolution(scrambled, solverMode, learnerMethod, language);
  };

  const handleReset = () => {
    const solved = createSolvedCube();
    setInitialScrambledState(solved);
    setCubeState(solved);
    setSolutionSteps([]);
    setCurrentStepIndex(0);
    if (cube3DRef.current) {
      cube3DRef.current.resetCamera();
    }
  };

  const handleScanComplete = (scannedState: CubeState) => {
    setInitialScrambledState(scannedState);
    setCubeState(scannedState);
    setIsScannerOpen(false);
    setActiveTab('solver');
    computeSolution(scannedState, solverMode, learnerMethod, language);
  };

  useEffect(() => {
    handleScramble("R U R' F' U2 R U2 R'");
  }, []);

  return (
    <div 
      className="h-[100dvh] max-h-[100dvh] overflow-hidden text-white flex flex-col font-sans select-none"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        language={language}
      />

      {/* Mobile Top Letter Navigation Strip (Elevated to top per user request, replacing top navbar on mobile) */}
      {activeTab === 'solver' && solutionSteps.length > 0 && (
        <div 
          className="md:hidden w-full px-2 py-1.5 backdrop-blur-md border-b flex items-center gap-1.5 overflow-x-auto scrollbar-none z-30 flex-shrink-0 transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-surface)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div className="flex-shrink-0 px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-mono font-bold text-neutral-300 border border-white/15">
            {currentStepIndex + 1}/{solutionSteps.length}
          </div>
          {solutionSteps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <button
                key={step.id}
                ref={isCurrent ? activePillRef : null}
                onClick={() => handleStepJump(idx)}
                className={`flex-shrink-0 min-w-[34px] h-7 px-2 rounded-lg text-xs font-mono font-black transition-all flex items-center justify-center ${
                  isCurrent
                    ? 'bg-white text-black shadow-md scale-105 border-2 border-white'
                    : isDone
                    ? 'bg-neutral-800 text-neutral-300 border border-white/20'
                    : 'bg-black/60 text-neutral-400 border border-white/10 hover:text-white'
                }`}
                title={`Jump to step ${idx + 1}: ${step.notation}`}
              >
                {step.notation}
              </button>
            );
          })}
        </div>
      )}

      <main className={`flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 min-h-0 flex flex-col ${activeTab === 'solver' ? 'overflow-hidden pb-16 md:pb-4' : 'overflow-y-auto pb-24 md:pb-6'}`}>
        {activeTab === 'solver' && (
          <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-2 sm:gap-4 overflow-hidden">
            {/* 3D Visualizer Viewport: flexible flex-1 on mobile, min-h-[220px] */}
            <div 
              className="flex-1 min-h-[220px] lg:h-full lg:col-span-7 w-full rounded-2xl sm:rounded-3xl border shadow-2xl relative overflow-hidden flex flex-col transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-card)', 
                borderColor: 'var(--border-subtle)' 
              }}
            >
              <Cube3DViewer
                ref={cube3DRef}
                cubeState={cubeState}
                activeMove={activeTurnMove || (solutionSteps[currentStepIndex]?.move ?? null)}
                activeStep={solutionSteps[currentStepIndex] || null}
                nextStep={solutionSteps[currentStepIndex + 1] || null}
                currentStepIndex={currentStepIndex}
                totalSteps={solutionSteps.length}
                isSolved={isCubeSolved(cubeState)}
                animationSpeed={320}
              />
            </div>

            {/* Solver Controls: docked at bottom on mobile, scrollable sidebar on desktop */}
            <div className="lg:col-span-5 flex flex-col overflow-hidden lg:overflow-y-auto flex-shrink-0">
              {parityError && (
                <div className="mb-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex flex-col gap-1 shadow-md">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Cube State Validation Warning
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    {parityError}
                  </p>
                  <button
                    onClick={() => setActiveTab('editor')}
                    className="self-start mt-1 px-3 py-1 rounded-lg bg-white text-black text-[11px] font-bold transition-colors hover:bg-neutral-200"
                  >
                    Adjust in Cube Input &rarr;
                  </button>
                </div>
              )}

              <StepSolverGuide
                steps={solutionSteps}
                currentStepIndex={currentStepIndex}
                cubeState={cubeState}
                solverMode={solverMode}
                onSelectMode={handleModeChange}
                onStepChange={handleStepJump}
                onPerformMove={handlePerformMove}
                isAnimating={isAnimating}
                onOpenEditor={() => setActiveTab('editor')}
                language={language}
                learnerMethod={learnerMethod}
                onSelectLearnerMethod={handleLearnerMethodChange}
              />
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="max-w-4xl mx-auto w-full">
            <Suspense fallback={<div className="p-8 text-center text-neutral-400">Loading editor...</div>}>
              <CubeNetEditor
                cubeState={cubeState}
                onChange={(newState) => {
                  setCubeState(newState);
                  setInitialScrambledState(newState);
                }}
                onSolve={() => {
                  computeSolution(cubeState, solverMode);
                  setActiveTab('solver');
                }}
                onOpenScanner={() => setIsScannerOpen(true)}
                onScramble={() => handleScramble()}
                onReset={handleReset}
              />
            </Suspense>
          </div>
        )}

        {activeTab === 'timer' && (
          <div className="max-w-3xl mx-auto w-full">
            <Suspense fallback={<div className="p-8 text-center text-neutral-400">Loading timer...</div>}>
              <ScrambleAndTimer
                onApplyScramble={(scrambleStr) => {
                  handleScramble(scrambleStr);
                }}
                onOpen3DSolver={() => setActiveTab('solver')}
              />
            </Suspense>
          </div>
        )}
      </main>

      {/* Camera Scanner Modal */}
      {isScannerOpen && (
        <Suspense fallback={null}>
          <CameraScanner
            initialState={cubeState}
            onScanComplete={handleScanComplete}
            onCancel={() => setIsScannerOpen(false)}
          />
        </Suspense>
      )}

      {/* Theme & Settings Modal */}
      <Suspense fallback={null}>
        <ThemeSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          intensity={blackIntensity}
          onIntensityChange={setBlackIntensity}
          language={language}
          onLanguageChange={handleLanguageChange}
          learnerMethod={learnerMethod}
          onLearnerMethodChange={handleLearnerMethodChange}
          showReasons={showReasons}
          onToggleShowReasons={() => setShowReasons(prev => !prev)}
        />
      </Suspense>
    </div>
  );
};

export default App;
