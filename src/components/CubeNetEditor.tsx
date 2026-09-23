import React, { useState, useRef } from 'react';
import { 
  AlertCircle, RefreshCw, Dices, Play, Camera, 
  ChevronLeft, ChevronRight, Box, Wand2, Type, Grid, Check, Sparkles,
  X, Lock, Plus, Trash2
} from 'lucide-react';
import type { CubeColor, CubeState, Face, FaceState } from '../solver/cubeTypes';
import { CUBE_COLORS, FACE_ORDER, FACE_NAMES } from '../solver/cubeTypes';
import { validateCubeParity } from '../solver/parityValidator';
import { applyMoveSequence } from '../solver/moveParser';
import { Cube3DViewer, type Cube3DViewerRef } from './Cube3DViewer';
import { soundManager } from '../utils/soundEffects';

interface CubeNetEditorProps {
  cubeState: CubeState;
  onChange: (newState: CubeState) => void;
  onSolve: () => void;
  onOpenScanner: () => void;
  onScramble: () => void;
  onReset: () => void;
}

type EditorInputMode = 'face-wizard' | '3d-painter' | 'presets' | 'net-view';

const VALID_PALETTE_COLORS: CubeColor[] = ['W', 'Y', 'G', 'B', 'R', 'O'];

const OPPOSITE_COLORS: Record<CubeColor, CubeColor> = {
  W: 'Y',
  Y: 'W',
  G: 'B',
  B: 'G',
  R: 'O',
  O: 'R',
  X: 'X'
};

const FACE_COORDINATES: Record<Face, [number, number, number][]> = {
  U: [
    [-1, 1, -1], [0, 1, -1], [1, 1, -1],
    [-1, 1,  0], [0, 1,  0], [1, 1,  0],
    [-1, 1,  1], [0, 1,  1], [1, 1,  1]
  ],
  D: [
    [-1, -1,  1], [0, -1,  1], [1, -1,  1],
    [-1, -1,  0], [0, -1,  0], [1, -1,  0],
    [-1, -1, -1], [0, -1, -1], [1, -1, -1]
  ],
  F: [
    [-1,  1, 1], [0,  1, 1], [1,  1, 1],
    [-1,  0, 1], [0,  0, 1], [1,  0, 1],
    [-1, -1, 1], [0, -1, 1], [1, -1, 1]
  ],
  B: [
    [ 1,  1, -1], [0,  1, -1], [-1,  1, -1],
    [ 1,  0, -1], [0,  0, -1], [-1,  0, -1],
    [ 1, -1, -1], [0, -1, -1], [-1, -1, -1]
  ],
  L: [
    [-1,  1, -1], [-1,  1, 0], [-1,  1, 1],
    [-1,  0, -1], [-1,  0, 0], [-1,  0, 1],
    [-1, -1, -1], [-1, -1, 0], [-1, -1, 1]
  ],
  R: [
    [1,  1, 1], [1,  1, 0], [1,  1, -1],
    [1,  0, 1], [1,  0, 0], [1,  0, -1],
    [1, -1, 1], [1, -1, 0], [1, -1, -1]
  ]
};

interface AdjacentFaceletInfo {
  face: Face;
  index: number;
  faceName: string;
  color: CubeColor;
}

function getAdjacentFacelets(face: Face, index: number, state: CubeState): AdjacentFaceletInfo[] {
  const coords = FACE_COORDINATES[face][index];
  const tx = coords[0];
  const ty = coords[1];
  const tz = coords[2];
  const results: AdjacentFaceletInfo[] = [];

  for (const f of FACE_ORDER) {
    if (f === face) continue;
    const fCoords = FACE_COORDINATES[f];
    for (let i = 0; i < 9; i++) {
      if (fCoords[i][0] === tx && fCoords[i][1] === ty && fCoords[i][2] === tz) {
        results.push({
          face: f,
          index: i,
          faceName: FACE_NAMES[f],
          color: state[f][i]
        });
      }
    }
  }

  return results;
}

const FAMOUS_PRESETS = [
  { name: 'Checkerboard', moves: "M2 E2 S2", desc: 'Classic alternating pattern' },
  { name: 'Superflip', moves: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2", desc: 'All edges flipped in place' },
  { name: 'T-Perm Scramble', moves: "R U R' U' R' F R2 U' R' U' R U R' F'", desc: 'Common corner & edge swap' },
  { name: 'Easy 6-Move', moves: "R U R' U' R U", desc: 'Quick test scramble' },
];

export const CubeNetEditor: React.FC<CubeNetEditorProps> = ({
  cubeState,
  onChange,
  onSolve,
  onOpenScanner,
  onScramble,
  onReset
}) => {
  const [inputMode, setInputMode] = useState<EditorInputMode>('face-wizard');
  const [wizardFaceIdx, setWizardFaceIdx] = useState<number>(2); // Start with 'F' (Green front)
  const [customMovesInput, setCustomMovesInput] = useState<string>('');

  // Active sticker targeted for color selection modal
  const [modalSticker, setModalSticker] = useState<{ face: Face; index: number } | null>(null);

  const cube3DRef = useRef<Cube3DViewerRef | null>(null);

  const parity = validateCubeParity(cubeState);

  // Count stickers per color (W, Y, G, B, R, O)
  const colorCounts: Record<CubeColor, number> = { W: 0, Y: 0, G: 0, B: 0, R: 0, O: 0, X: 0 };
  Object.values(cubeState).forEach(face => {
    face.forEach(col => {
      colorCounts[col] = (colorCounts[col] || 0) + 1;
    });
  });

  const totalAssigned = 54 - colorCounts.X;
  const hasDeficitColors = VALID_PALETTE_COLORS.some(c => colorCounts[c] < 9);

  // Click handler when user taps any sticker
  const handleStickerClick = (face: Face, index: number) => {
    if (index === 4) return; // Center sticker is fixed
    setModalSticker({ face, index });
  };

  // Assign color from modal
  const handleAssignColor = (color: CubeColor) => {
    if (!modalSticker) return;
    const { face, index } = modalSticker;

    const nextStickers = [...cubeState[face]] as FaceState;
    nextStickers[index] = color;

    onChange({
      ...cubeState,
      [face]: nextStickers
    });

    soundManager.playClick();
    setModalSticker(null);
  };

  // Clear single sticker to Blank (X)
  const handleClearSticker = () => {
    if (!modalSticker) return;
    handleAssignColor('X');
  };

  // Clear entire face to Blank (X)
  const handleClearFace = (face: Face) => {
    const nextStickers = [...cubeState[face]] as FaceState;
    for (let i = 0; i < 9; i++) {
      if (i !== 4) {
        nextStickers[i] = 'X';
      }
    }
    onChange({
      ...cubeState,
      [face]: nextStickers
    });
    soundManager.playClick();
  };

  // Clear all 48 outer stickers to Blank (X)
  const handleClearAllToBlank = () => {
    const nextState: CubeState = { ...cubeState };
    for (const f of FACE_ORDER) {
      const faceStickers = [...nextState[f]] as FaceState;
      for (let i = 0; i < 9; i++) {
        if (i !== 4) {
          faceStickers[i] = 'X';
        }
      }
      nextState[f] = faceStickers;
    }
    onChange(nextState);
    soundManager.playClick();
  };

  const handleFillFace = (face: Face, color: CubeColor) => {
    const nextStickers = [...cubeState[face]] as FaceState;
    for (let i = 0; i < 9; i++) {
      if (i !== 4) {
        nextStickers[i] = color;
      }
    }
    onChange({
      ...cubeState,
      [face]: nextStickers
    });
    soundManager.playClick();
  };

  const handleApplyPreset = (moves: string) => {
    try {
      const next = applyMoveSequence(cubeState, moves);
      onChange(next);
    } catch {
      // Ignore
    }
  };

  const handleCustomMovesApply = () => {
    if (!customMovesInput.trim()) return;
    try {
      const next = applyMoveSequence(cubeState, customMovesInput.trim());
      onChange(next);
      setCustomMovesInput('');
    } catch (e) {
      console.error(e);
    }
  };

  const wizardFace = FACE_ORDER[wizardFaceIdx];

  // Compute color validity for modal sticker
  const computeModalOptions = () => {
    if (!modalSticker) return [];
    const { face, index } = modalSticker;
    const currentColor = cubeState[face][index];
    const adjFacelets = getAdjacentFacelets(face, index, cubeState);

    return VALID_PALETTE_COLORS.map(color => {
      const count = colorCounts[color];
      const isCurrent = currentColor === color;

      // Rule 1: Capacity Limit (9 per color)
      // If color already has 9 or more stickers, and there are deficit colors:
      if (!isCurrent && count >= 9 && hasDeficitColors) {
        return {
          color,
          isValid: false,
          reason: `All 9 stickers already placed on cube`,
          count,
          isCurrent
        };
      }

      // Rule 2: Duplicate on same piece
      const dup = adjFacelets.find(adj => adj.color === color && adj.color !== 'X');
      if (dup) {
        return {
          color,
          isValid: false,
          reason: `Same piece already has this color on ${dup.faceName}`,
          count,
          isCurrent
        };
      }

      // Rule 3: Opposite colors on same piece
      const opp = adjFacelets.find(adj => adj.color !== 'X' && OPPOSITE_COLORS[adj.color] === color);
      if (opp) {
        return {
          color,
          isValid: false,
          reason: `Conflicts with ${CUBE_COLORS[opp.color].name} on ${opp.faceName} (opposite colors cannot share a piece)`,
          count,
          isCurrent
        };
      }

      return {
        color,
        isValid: true,
        reason: isCurrent ? 'Current Color' : `${9 - count} available`,
        count,
        isCurrent
      };
    });
  };

  const modalOptions = computeModalOptions();
  const modalAdjInfo = modalSticker 
    ? getAdjacentFacelets(modalSticker.face, modalSticker.index, cubeState).filter(a => a.color !== 'X')
    : [];

  const isCorner = modalSticker && [0, 2, 6, 8].includes(modalSticker.index);
  const pieceTypeName = isCorner ? 'Corner Piece' : 'Edge Piece';

  return (
    <div className="w-full flex flex-col gap-4 text-white">
      {/* Input Mode Selector Bar */}
      <div 
        className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl border transition-colors"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <button
            onClick={() => setInputMode('face-wizard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === 'face-wizard'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Face Wizard</span>
          </button>

          <button
            onClick={() => setInputMode('3d-painter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === '3d-painter'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Cube Painter</span>
          </button>

          <button
            onClick={() => setInputMode('presets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === 'presets'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Scramble / Text</span>
          </button>

          <button
            onClick={() => setInputMode('net-view')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              inputMode === 'net-view'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>2D Cross Net</span>
          </button>
        </div>

        {/* Global actions: Clear to Blank, Camera, Scramble, Reset */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button
            onClick={handleClearAllToBlank}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/20 text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear all outer stickers to start entering cube from scratch"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Start Empty</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold text-white hover:bg-white/10 transition-colors"
            title="Scan with Camera"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Camera</span>
          </button>

          <button
            onClick={onScramble}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/20 text-xs font-bold text-white hover:bg-white/10 transition-colors"
            title="Random WCA Scramble"
          >
            <Dices className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Scramble</span>
          </button>

          <button
            onClick={onReset}
            className="p-1.5 rounded-xl border border-white/20 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Reset to Solved"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Color Balance & Parity Tracker */}
      <div 
        className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md transition-colors"
        style={{ 
          backgroundColor: 'var(--bg-card)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-neutral-400 uppercase font-bold mr-1">
            Sticker Balance ({totalAssigned}/54):
          </span>
          {VALID_PALETTE_COLORS.map((c) => {
            const count = colorCounts[c];
            const isPerfect = count === 9;
            return (
              <div 
                key={c}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-mono font-bold transition-all ${
                  isPerfect 
                    ? 'border-white/20 text-white bg-white/5' 
                    : count > 9
                    ? 'border-red-500/50 text-red-300 bg-red-500/10'
                    : 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full border border-black/40 shadow-sm"
                  style={{ backgroundColor: CUBE_COLORS[c].hex }}
                />
                <span>{count}/9</span>
                {isPerfect && <Check className="w-3 h-3 text-white" />}
              </div>
            );
          })}
        </div>

        {/* Solve Cube Button */}
        <button
          onClick={onSolve}
          disabled={!parity.isValid}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg ${
            parity.isValid
              ? 'bg-white text-black hover:bg-neutral-200'
              : 'bg-neutral-800 text-neutral-500 border border-white/10 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Solve Cube</span>
        </button>
      </div>

      {/* Parity Error Banner */}
      {!parity.isValid && (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-300">Cube Validation Status: </span>
            <span>{parity.errors[0] || 'Please assign exactly 9 stickers of each color.'}</span>
          </div>
        </div>
      )}

      {/* ---------------- MODE 1: STEP-BY-STEP FACE WIZARD ---------------- */}
      {inputMode === 'face-wizard' && (
        <div 
          className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col gap-5 max-w-xl mx-auto w-full shadow-2xl"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          {/* Face Navigation Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <button
              onClick={() => setWizardFaceIdx((wizardFaceIdx - 1 + FACE_ORDER.length) % FACE_ORDER.length)}
              className="p-2 rounded-xl border border-white/20 hover:bg-white/10 text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                Step {wizardFaceIdx + 1} of 6
              </span>
              <h3 className="text-lg font-black text-white flex items-center gap-2 font-mono">
                {FACE_NAMES[wizardFace]} Face
                <span 
                  className="w-3.5 h-3.5 rounded-full inline-block border border-black/40"
                  style={{ backgroundColor: CUBE_COLORS[cubeState[wizardFace][4]].hex }}
                />
              </h3>
            </div>

            <button
              onClick={() => setWizardFaceIdx((wizardFaceIdx + 1) % FACE_ORDER.length)}
              className="p-2 rounded-xl border border-white/20 hover:bg-white/10 text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Orientation Prompt */}
          <div className="px-3.5 py-2 rounded-xl border border-white/10 text-xs text-neutral-300 flex items-center justify-center gap-2" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <Sparkles className="w-4 h-4 text-white" />
            <span>Click any sticker to choose from <strong>valid colors only</strong> (invalid ones are blocked).</span>
          </div>

          {/* Big Touch-Friendly 3x3 Face Grid */}
          <div className="flex justify-center py-2">
            <div 
              className="grid grid-cols-3 grid-rows-3 gap-2.5 p-3.5 rounded-2xl border shadow-2xl w-64 h-64 sm:w-72 sm:h-72"
              style={{ 
                backgroundColor: 'var(--bg-canvas)', 
                borderColor: 'var(--border-strong)' 
              }}
            >
              {cubeState[wizardFace].map((col, idx) => {
                const isCenter = idx === 4;
                const isBlank = col === 'X';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleStickerClick(wizardFace, idx)}
                    className={`rounded-xl border-2 transition-transform flex items-center justify-center relative touch-manipulation ${
                      isCenter
                        ? 'border-white/80 cursor-default ring-2 ring-white/30'
                        : isBlank
                        ? 'border-dashed border-white/30 hover:border-white/60 bg-neutral-900/60 active:scale-95'
                        : 'border-black/40 hover:scale-105 active:scale-95 shadow-md'
                    }`}
                    style={{ backgroundColor: CUBE_COLORS[col].hex }}
                  >
                    {isCenter ? (
                      <span className="text-[9px] font-black text-black px-1.5 py-0.5 rounded bg-white/90 font-mono">
                        FIXED
                      </span>
                    ) : isBlank ? (
                      <div className="flex flex-col items-center justify-center gap-0.5 text-neutral-400">
                        <Plus className="w-5 h-5" />
                        <span className="text-[9px] font-mono">Set</span>
                      </div>
                    ) : (
                      <span className="opacity-0 hover:opacity-100 text-[10px] font-bold text-black bg-white/80 px-1 py-0.5 rounded">
                        Change
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10 gap-2">
            <button
              onClick={() => handleClearFace(wizardFace)}
              className="px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            >
              Clear Face
            </button>

            <button
              onClick={() => handleFillFace(wizardFace, cubeState[wizardFace][4])}
              className="px-3 py-1.5 rounded-xl border border-white/20 text-xs font-semibold hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            >
              Fill with Center Color
            </button>

            <button
              onClick={() => setWizardFaceIdx((wizardFaceIdx + 1) % FACE_ORDER.length)}
              className="px-4 py-1.5 rounded-xl bg-white text-black text-xs font-black hover:bg-neutral-200 transition-colors ml-auto"
            >
              Next Face &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ---------------- MODE 2: 3D DIRECT CUBE PAINTER ---------------- */}
      {inputMode === '3d-painter' && (
        <div className="flex flex-col gap-3">
          <div 
            className="p-3 rounded-2xl border text-xs text-neutral-300 flex items-center justify-between"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span>Click any sticker on the 3D cube to open its <strong>valid color options</strong>.</span>
            <button
              onClick={handleClearAllToBlank}
              className="px-2.5 py-1 rounded-lg border border-white/20 hover:bg-white/10 text-xs font-medium text-white"
            >
              Clear to Blank
            </button>
          </div>

          <div 
            className="h-[360px] sm:h-[460px] w-full rounded-2xl sm:rounded-3xl border relative overflow-hidden shadow-2xl"
            style={{ 
              backgroundColor: 'var(--bg-canvas)', 
              borderColor: 'var(--border-subtle)' 
            }}
          >
            <Cube3DViewer
              ref={cube3DRef}
              cubeState={cubeState}
              interactivePainting={true}
              onStickerClick={handleStickerClick}
            />
          </div>
        </div>
      )}

      {/* ---------------- MODE 3: SCRAMBLE TEXT & PRESETS ---------------- */}
      {inputMode === 'presets' && (
        <div 
          className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col gap-5 max-w-xl mx-auto w-full shadow-2xl"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div>
            <h3 className="text-base font-bold text-white mb-1 font-mono">Apply Move Sequence / Scramble</h3>
            <p className="text-xs text-neutral-400">Type or paste standard WCA move sequences (e.g. R U R' U' ...)</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customMovesInput}
              onChange={(e) => setCustomMovesInput(e.target.value)}
              placeholder="e.g. R U R' F' U2 R U2 R'"
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/20 text-sm font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-white"
              style={{ backgroundColor: 'var(--bg-canvas)' }}
            />
            <button
              onClick={handleCustomMovesApply}
              className="px-4 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
            >
              Apply
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Famous Patterns & Benchmarks
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FAMOUS_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleApplyPreset(p.moves)}
                  className="p-3 rounded-xl border border-white/15 hover:border-white/40 text-left hover:bg-white/5 transition-all flex flex-col gap-1"
                >
                  <span className="text-xs font-bold text-white">{p.name}</span>
                  <span className="text-[10px] text-neutral-400 line-clamp-1">{p.desc}</span>
                  <span className="text-[10px] font-mono text-neutral-500 truncate mt-1">{p.moves}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODE 4: 2D CROSS NET VIEW ---------------- */}
      {inputMode === 'net-view' && (
        <div 
          className="p-5 rounded-2xl border flex flex-col items-center gap-4 overflow-x-auto"
          style={{ 
            backgroundColor: 'var(--bg-card)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div className="text-xs text-neutral-400 font-mono">
            Unfolded 2D Cube Cross Net &bull; Click any sticker to choose valid colors
          </div>

          <div className="inline-grid grid-cols-4 gap-2">
            <div className="w-24 h-24" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-neutral-400 mb-1">U (Top)</span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-white/20 w-24 h-24" style={{ backgroundColor: 'var(--bg-canvas)' }}>
                {cubeState.U.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStickerClick('U', idx)}
                    className="rounded border border-black/30"
                    style={{ backgroundColor: CUBE_COLORS[col].hex }}
                  />
                ))}
              </div>
            </div>
            <div className="w-24 h-24" />
            <div className="w-24 h-24" />

            {(['L', 'F', 'R', 'B'] as Face[]).map((f) => (
              <div key={f} className="flex flex-col items-center">
                <span className="text-[10px] font-mono text-neutral-400 mb-1">{f}</span>
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-white/20 w-24 h-24" style={{ backgroundColor: 'var(--bg-canvas)' }}>
                  {cubeState[f].map((col, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleStickerClick(f, idx)}
                      className="rounded border border-black/30"
                      style={{ backgroundColor: CUBE_COLORS[col].hex }}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="w-24 h-24" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-mono text-neutral-400 mb-1">D (Down)</span>
              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg border border-white/20 w-24 h-24" style={{ backgroundColor: 'var(--bg-canvas)' }}>
                {cubeState.D.map((col, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleStickerClick('D', idx)}
                    className="rounded border border-black/30"
                    style={{ backgroundColor: CUBE_COLORS[col].hex }}
                  />
                ))}
              </div>
            </div>
            <div className="w-24 h-24" />
            <div className="w-24 h-24" />
          </div>
        </div>
      )}

      {/* ---------------- COLOR SELECTOR POPUP MODAL ---------------- */}
      {modalSticker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div 
            className="w-full max-w-md rounded-2xl border border-white/20 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2 font-mono">
                  <span>Select Color for Sticker</span>
                  <span 
                    className="w-3.5 h-3.5 rounded-full border border-black/40" 
                    style={{ backgroundColor: CUBE_COLORS[cubeState[modalSticker.face][modalSticker.index]].hex }} 
                  />
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {FACE_NAMES[modalSticker.face]} Face &bull; {pieceTypeName} #{modalSticker.index + 1}
                </p>
              </div>
              <button 
                onClick={() => setModalSticker(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Adjacent Piece Context */}
            {modalAdjInfo.length > 0 && (
              <div 
                className="p-2.5 rounded-xl border border-white/10 text-xs text-neutral-300 flex items-center gap-2"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              >
                <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
                <span className="leading-snug">
                  Shares piece with:{' '}
                  {modalAdjInfo.map(a => `${a.faceName} (${CUBE_COLORS[a.color].name})`).join(', ')}
                </span>
              </div>
            )}

            {/* 6 Selectable / Prohibited Color Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {modalOptions.map(({ color, isValid, reason, count, isCurrent }) => {
                const meta = CUBE_COLORS[color];

                if (isValid) {
                  return (
                    <button
                      key={color}
                      onClick={() => handleAssignColor(color)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 ${
                        isCurrent
                          ? 'border-white bg-white/15 shadow-md'
                          : 'border-white/20 hover:border-white hover:bg-white/10 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="w-8 h-8 rounded-xl border border-black/30 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: meta.hex }}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">{meta.name}</span>
                          <span className="text-[10px] text-neutral-400 font-mono truncate">
                            {count}/9 placed {isCurrent && '(Current)'}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px] flex-shrink-0">
                        Select
                      </span>
                    </button>
                  );
                }

                // Prohibited color
                return (
                  <div
                    key={color}
                    className="p-3 rounded-xl border border-red-500/20 bg-red-950/15 opacity-55 flex flex-col justify-between gap-1.5 cursor-not-allowed"
                    title={reason}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-7 h-7 rounded-lg border border-red-500/40 opacity-40 flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: meta.hex }}
                        >
                          <Lock className="w-3.5 h-3.5 text-black" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-400 line-through truncate">{meta.name}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-mono text-[9px] font-bold uppercase flex-shrink-0">
                        Prohibited
                      </span>
                    </div>
                    <span className="text-[10px] text-red-300/80 leading-tight">
                      {reason}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={handleClearSticker}
                className="px-3 py-1.5 rounded-xl border border-white/20 text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Clear (Set Blank)
              </button>

              <button
                onClick={() => setModalSticker(null)}
                className="px-4 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
