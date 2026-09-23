import type { CubeColor, CubeState, Face, FaceState } from '../src/solver/cubeTypes';
import { applyMoveSequence, isCubeSolved as checkSolved } from '../src/solver/moveParser.ts';

export interface MockStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  [key: string]: any;
}

export function createMockStorage(): MockStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

export function createSolvedCube(): CubeState {
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

export function createScrambledCube(scrambleSequence: string): CubeState {
  return applyMoveSequence(createSolvedCube(), scrambleSequence);
}

export { checkSolved as isCubeSolved };

function createStyleObject() {
  const styles: Record<string, string> = {};
  return new Proxy(styles, {
    get(target, prop: string) {
      if (prop === 'setProperty') {
        return (name: string, value: string) => {
          target[name] = String(value);
        };
      }
      if (prop === 'getPropertyValue') {
        return (name: string) => target[name] || '';
      }
      return target[prop] || '';
    },
    set(target, prop: string, value: any) {
      target[prop] = String(value);
      return true;
    }
  });
}

/**
 * Initializes a clean, lightweight mock DOM environment for headless testing
 */
export function setupMockDom(options?: {
  viewportWidth?: number;
  viewportHeight?: number;
  initialStorage?: Record<string, string>;
}) {
  const width = options?.viewportWidth ?? 1024;
  const height = options?.viewportHeight ?? 768;

  const storage = createMockStorage();
  if (options?.initialStorage) {
    for (const [k, v] of Object.entries(options.initialStorage)) {
      storage.setItem(k, v);
    }
  }

  const rootStyles = createStyleObject();
  const rootClassList = new Set<string>();

  const bodyStyles = createStyleObject();
  const bodyClassList = new Set<string>();

  const documentElement = {
    style: rootStyles,
    classList: {
      add: (cls: string) => rootClassList.add(cls),
      remove: (cls: string) => rootClassList.delete(cls),
      contains: (cls: string) => rootClassList.has(cls),
      toggle: (cls: string) => {
        if (rootClassList.has(cls)) {
          rootClassList.delete(cls);
          return false;
        } else {
          rootClassList.add(cls);
          return true;
        }
      },
    },
    clientWidth: width,
    clientHeight: height,
  };

  const body = {
    style: bodyStyles,
    classList: {
      add: (cls: string) => bodyClassList.add(cls),
      remove: (cls: string) => bodyClassList.delete(cls),
      contains: (cls: string) => bodyClassList.has(cls),
    },
    clientWidth: width,
    clientHeight: height,
  };

  const mockDocument = {
    documentElement,
    body,
    createElement: (tag: string) => {
      const elStyles = createStyleObject();
      return {
        tagName: tag.toUpperCase(),
        width: 300,
        height: 150,
        style: elStyles,
        getContext: () => ({
          createRadialGradient: () => ({
            addColorStop: () => {},
          }),
          fillRect: () => {},
          beginPath: () => {},
          arc: () => {},
          fill: () => {},
          stroke: () => {},
          fillText: () => {},
        }),
        getBoundingClientRect: () => ({
          left: 0,
          top: 0,
          width,
          height,
          right: width,
          bottom: height,
        }),
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    },
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  const mockWindow = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: 1,
    localStorage: storage,
    document: mockDocument,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
    requestAnimationFrame: (cb: (t: number) => void) =>
      setTimeout(() => cb(Date.now()), 16),
    cancelAnimationFrame: (id: any) => clearTimeout(id),
  };

  (globalThis as any).window = mockWindow;
  (globalThis as any).document = mockDocument;
  (globalThis as any).localStorage = storage;

  return {
    window: mockWindow,
    document: mockDocument,
    localStorage: storage,
    documentElement,
    body,
    rootClassList,
    bodyClassList,
  };
}

export function teardownMockDom() {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).localStorage;
}
