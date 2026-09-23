import type { CubeState, SolutionStep, Face, SolverMode, LearnerMethod } from './cubeTypes';
import type { AppLanguage } from '../utils/i18n';

export interface SolveStepItem extends SolutionStep {
  notation: string;
  description: string;
  face: Face;
  isDouble?: boolean;
  isCounter?: boolean;
}

export interface SolveResult {
  steps: SolveStepItem[];
  algorithmName: string;
  solveTimeMs: number;
}

interface WorkerSolveResponse {
  type: 'SOLVE_RESULT';
  id: string;
  success: boolean;
  steps: SolveStepItem[];
  algorithmName: string;
  solveTimeMs: number;
  error?: string;
}

interface WorkerInitResponse {
  type: 'INIT_DONE';
  success: boolean;
  error?: string;
}

type WorkerResponse = WorkerSolveResponse | WorkerInitResponse;

let workerInstance: Worker | null = null;
let isWorkerReady = false;
let initPromise: Promise<void> | null = null;

const pendingRequests = new Map<
  string,
  {
    resolve: (res: SolveResult) => void;
    reject: (err: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }
>();

/**
 * Main-thread fallback solver in case Web Worker is unsupported or throws in specific environments.
 */
async function solveFallback(
  cubeState: CubeState,
  method: SolverMode,
  learnerMethod: LearnerMethod = 'lbl',
  language: AppLanguage = 'en'
): Promise<SolveResult> {
  const t0 = performance.now();
  const { solveWithKociemba, initKociembaSolver } = await import('./kociemba');
  initKociembaSolver();

  let steps: SolutionStep[] = [];
  let algorithmName = '';

  if (method === 'optimal') {
    steps = solveWithKociemba(cubeState);
    algorithmName = 'Kociemba Two-Phase Optimal (Fallback)';
  } else if (method === 'learner') {
    const { solveWithHumanStateMachine } = await import('./humanStateMachineSolver');
    steps = solveWithHumanStateMachine(cubeState, learnerMethod, language);
    algorithmName = learnerMethod === 'cfop'
      ? 'Human State-Machine (Fridrich CFOP - Fallback)'
      : 'Human State-Machine (Layer-by-Layer - Fallback)';
  } else {
    const { solveWithBeginnerMethod } = await import('./beginnerSolver');
    steps = solveWithBeginnerMethod(cubeState);
    algorithmName = 'Layer-by-Layer Beginner Method (Fallback)';
  }

  const solveTimeMs = Math.max(0, Math.round(performance.now() - t0));
  const enrichedSteps: SolveStepItem[] = steps.map(s => ({
    ...s,
    isDouble: s.turns === 2,
    isCounter: s.turns === -1,
  }));

  return {
    steps: enrichedSteps,
    algorithmName,
    solveTimeMs,
  };
}

/**
 * Retrieves or lazily creates the Web Worker singleton.
 */
function getSolverWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }

  if (!workerInstance) {
    try {
      workerInstance = new Worker(new URL('./solver.worker.ts', import.meta.url), {
        type: 'module',
      });

      workerInstance.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'INIT_DONE') {
          isWorkerReady = true;
          return;
        }

        if (data.type === 'SOLVE_RESULT') {
          const req = pendingRequests.get(data.id);
          if (req) {
            clearTimeout(req.timer);
            pendingRequests.delete(data.id);
            if (data.success) {
              req.resolve({
                steps: data.steps,
                algorithmName: data.algorithmName,
                solveTimeMs: data.solveTimeMs,
              });
            } else {
              req.reject(new Error(data.error || 'Solver Worker returned an error'));
            }
          }
        }
      };

      workerInstance.onerror = (err) => {
        console.warn('Solver Worker runtime error event:', err);
      };
    } catch (e) {
      console.warn('Web Worker creation failed; will use fallback:', e);
      workerInstance = null;
    }
  }

  return workerInstance;
}

/**
 * Pre-warms the solver tables in the background Web Worker off the main UI thread.
 */
export function initSolverService(): Promise<void> {
  if (isWorkerReady) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<void>((resolve) => {
    const worker = getSolverWorker();
    if (!worker) {
      // Fallback environment: mark ready immediately
      isWorkerReady = true;
      resolve();
      return;
    }

    const onMessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data?.type === 'INIT_DONE') {
        worker.removeEventListener('message', onMessage);
        isWorkerReady = true;
        resolve();
      }
    };

    worker.addEventListener('message', onMessage);
    worker.postMessage({ type: 'INIT' });

    // Fallback safety timeout (12s)
    setTimeout(() => {
      isWorkerReady = true;
      resolve();
    }, 12000);
  });

  return initPromise;
}

/**
 * Asynchronously solves a Rubik's Cube state using optimal, beginner, or learner method.
 */
export function solveCube(
  cubeState: CubeState,
  method: SolverMode = 'optimal',
  learnerMethod: LearnerMethod = 'lbl',
  language: AppLanguage = 'en'
): Promise<SolveResult> {
  const worker = getSolverWorker();
  if (!worker) {
    return solveFallback(cubeState, method, learnerMethod, language);
  }

  return new Promise<SolveResult>((resolve, reject) => {
    const id = `solve_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        console.warn(`Worker solve timed out for ID ${id}; falling back to main thread`);
        solveFallback(cubeState, method, learnerMethod, language).then(resolve).catch(reject);
      }
    }, 15000);

    pendingRequests.set(id, { resolve, reject, timer });

    worker.postMessage({
      type: 'SOLVE',
      id,
      cubeState,
      method,
      learnerMethod,
      language,
    });
  });
}
