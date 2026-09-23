import React, { useState, useEffect, useRef } from 'react';
import { Navbar, type AppTab } from './components/Navbar';
import { Cube3DViewer, type Cube3DViewerRef } from './components/Cube3DViewer';
import { StepSolverGuide } from './components/StepSolverGuide';
import { CubeNetEditor } from './components/CubeNetEditor';
import { CameraScanner } from './components/CameraScanner';
import { ScrambleAndTimer, generateWcaScramble } from './components/ScrambleAndTimer';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { getInitialIntensity, applyBlackIntensity } from './utils/themeManager';
import type { CubeColor, CubeState, FaceState, SolutionStep, SolverMode } from './solver/cubeTypes';
import { applyMove, applyMoveSequence, invertMove, isCubeSolved } from './solver/moveParser';
import { solveWithKociemba, initKociembaSolver } from './solver/kociemba';
import { solveWithBeginnerMethod } from './solver/beginnerSolver';
import { validateCubeParity } from './solver/parityValidator';

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

  const [cubeState, setCubeState] = useState<CubeState>(() => createSolvedCube());
  const [initialScrambledState, setInitialScrambledState] = useState<CubeState>(() => createSolvedCube());
  const [solutionSteps, setSolutionSteps] = useState<SolutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [solverMode, setSolverMode] = useState<SolverMode>('optimal');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [activeTurnMove, setActiveTurnMove] = useState<string | null>(null);
  const [parityError, setParityError] = useState<string | null>(null);

  const cube3DRef = useRef<Cube3DViewerRef | null>(null);

  // Apply black intensity to CSS variables
  useEffect(() => {
    applyBlackIntensity(blackIntensity);
  }, [blackIntensity]);

  useEffect(() => {
    try {
      initKociembaSolver();
    } catch {
      // Ignore
    }
  }, []);

  const computeSolution = (state: CubeState, mode: SolverMode) => {
    const parity = validateCubeParity(state);
    if (!parity.isValid) {
      setParityError(parity.errors[0] || 'Parity validation failed.');
      setSolutionSteps([]);
      return;
    }

    setParityError(null);

    try {
      let steps: SolutionStep[] = [];
      if (mode === 'optimal') {
        steps = solveWithKociemba(state);
      } else {
        steps = solveWithBeginnerMethod(state);
      }
      setSolutionSteps(steps);
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
    computeSolution(initialScrambledState, newMode);
    setCubeState(initialScrambledState);
  };

  const handleScramble = (customScramble?: string) => {
    const seq = customScramble || generateWcaScramble(16);
    const scrambled = applyMoveSequence(createSolvedCube(), seq);
    setInitialScrambledState(scrambled);
    setCubeState(scrambled);
    computeSolution(scrambled, solverMode);
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
    computeSolution(scannedState, solverMode);
  };

  useEffect(() => {
    handleScramble("R U R' F' U2 R U2 R'");
  }, []);

  return (
    <div 
      className="min-h-screen text-white flex flex-col font-sans transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-5 pb-24 md:pb-6 flex flex-col gap-4">
        {activeTab === 'solver' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 items-start">
            {/* 3D Visualizer Viewport */}
            <div 
              className="lg:col-span-7 h-[280px] xs:h-[330px] sm:h-[420px] lg:h-[520px] xl:h-[560px] w-full rounded-2xl sm:rounded-3xl border shadow-2xl relative overflow-hidden flex flex-col transition-colors"
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

            {/* Right Instructions & Playback Guide */}
            <div className="lg:col-span-5 flex flex-col gap-3.5">
              {parityError && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex flex-col gap-1.5 shadow-md">
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
              />
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="max-w-4xl mx-auto w-full">
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
          </div>
        )}

        {activeTab === 'timer' && (
          <div className="max-w-3xl mx-auto w-full">
            <ScrambleAndTimer
              onApplyScramble={(scrambleStr) => {
                handleScramble(scrambleStr);
              }}
              onOpen3DSolver={() => setActiveTab('solver')}
            />
          </div>
        )}
      </main>

      {/* Camera Scanner Modal */}
      {isScannerOpen && (
        <CameraScanner
          initialState={cubeState}
          onScanComplete={handleScanComplete}
          onCancel={() => setIsScannerOpen(false)}
        />
      )}

      {/* Theme & Black Intensity Modal */}
      <ThemeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        intensity={blackIntensity}
        onIntensityChange={setBlackIntensity}
      />
    </div>
  );
};

export default App;
