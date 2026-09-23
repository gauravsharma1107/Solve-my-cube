import { initKociembaSolver, solveWithKociemba } from './kociemba';
import { solveWithBeginnerMethod } from './beginnerSolver';
import type { CubeState, SolutionStep } from './cubeTypes';

interface WorkerInitMessage {
  type: 'INIT';
}

interface WorkerSolveMessage {
  type: 'SOLVE';
  id: string;
  cubeState: CubeState;
  method: 'optimal' | 'beginner';
}

type WorkerIncomingMessage = WorkerInitMessage | WorkerSolveMessage;

// Listen for messages from solverService
self.onmessage = async (event: MessageEvent<WorkerIncomingMessage>) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'INIT') {
    try {
      initKociembaSolver();
      self.postMessage({ type: 'INIT_DONE', success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn('Worker init error:', message);
      self.postMessage({ type: 'INIT_DONE', success: false, error: message });
    }
    return;
  }

  if (data.type === 'SOLVE') {
    const { id, cubeState, method } = data;
    const t0 = performance.now();

    try {
      // Ensure tables initialized
      initKociembaSolver();

      let steps: SolutionStep[] = [];
      let algorithmName = '';

      if (method === 'optimal') {
        steps = solveWithKociemba(cubeState);
        algorithmName = 'Kociemba Two-Phase Optimal';
      } else {
        steps = solveWithBeginnerMethod(cubeState);
        algorithmName = 'Layer-by-Layer Beginner Method';
      }

      const solveTimeMs = Math.max(0, Math.round(performance.now() - t0));

      const enrichedSteps = steps.map(s => ({
        ...s,
        isDouble: s.turns === 2,
        isCounter: s.turns === -1,
      }));

      self.postMessage({
        type: 'SOLVE_RESULT',
        id,
        success: true,
        steps: enrichedSteps,
        algorithmName,
        solveTimeMs,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const solveTimeMs = Math.max(0, Math.round(performance.now() - t0));
      self.postMessage({
        type: 'SOLVE_RESULT',
        id,
        success: false,
        error: message,
        steps: [],
        algorithmName: method === 'optimal' ? 'Kociemba Two-Phase' : 'Beginner Method',
        solveTimeMs,
      });
    }
  }
};

export {};
