import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle, RotateCw, Upload, Smartphone } from 'lucide-react';
import type { CubeColor, CubeState, Face, FaceState } from '../solver/cubeTypes';
import { FACE_ORDER, CUBE_COLORS } from '../solver/cubeTypes';
import { classifyColor, sampleRegionAverageRGB } from '../utils/colorDetector';

interface CameraScannerProps {
  onScanComplete: (state: CubeState) => void;
  onCancel: () => void;
  initialState?: CubeState;
}

const FACE_GUIDANCE: Record<Face, { title: string; centerColor: CubeColor; instruction: string; hint: string }> = {
  U: {
    title: 'Top Face (White Center)',
    centerColor: 'W',
    instruction: 'Hold the cube with WHITE center facing the camera.',
    hint: 'Keep GREEN face facing down (towards you).'
  },
  R: {
    title: 'Right Face (Red Center)',
    centerColor: 'R',
    instruction: 'Turn cube to show RED center.',
    hint: 'Keep WHITE on top, GREEN to your left.'
  },
  F: {
    title: 'Front Face (Green Center)',
    centerColor: 'G',
    instruction: 'Turn cube to show GREEN center.',
    hint: 'Keep WHITE on top, RED to your right.'
  },
  D: {
    title: 'Bottom Face (Yellow Center)',
    centerColor: 'Y',
    instruction: 'Turn cube to show YELLOW center.',
    hint: 'Keep GREEN facing up (towards the top).'
  },
  L: {
    title: 'Left Face (Orange Center)',
    centerColor: 'O',
    instruction: 'Turn cube to show ORANGE center.',
    hint: 'Keep WHITE on top, GREEN to your right.'
  },
  B: {
    title: 'Back Face (Blue Center)',
    centerColor: 'B',
    instruction: 'Turn cube to show BLUE center.',
    hint: 'Keep WHITE on top, ORANGE to your right.'
  },
};

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanComplete,
  onCancel,
  initialState
}) => {
  const [currentFaceIndex, setCurrentFaceIndex] = useState<number>(0);
  const currentFace = FACE_ORDER[currentFaceIndex];
  const guidance = FACE_GUIDANCE[currentFace];

  const [scannedFaces, setScannedFaces] = useState<Record<Face, FaceState>>(() => {
    if (initialState) return initialState;
    const defaultFace = (c: CubeColor): FaceState => [c, c, c, c, c, c, c, c, c];
    return {
      U: defaultFace('W'),
      R: defaultFace('R'),
      F: defaultFace('G'),
      D: defaultFace('Y'),
      L: defaultFace('O'),
      B: defaultFace('B'),
    };
  });

  const [liveColors, setLiveColors] = useState<CubeColor[]>(['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W']);
  const [editingStickerIndex, setEditingStickerIndex] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFaceCaptured, setIsFaceCaptured] = useState<boolean>(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Robust multi-tier camera initialization
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      let stream: MediaStream;
      try {
        // Attempt preferred resolution and camera lens
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Initial camera constraints failed, attempting fallback to basic video...', firstErr);
        // Fallback without constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: unknown) {
      console.error('Camera error:', err);
      const e = err as Error;
      setCameraError(e.message || 'Unable to access camera.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [facingMode]);

  // Sample colors from canvas given width and height
  const sampleCanvasGrid = (ctx: CanvasRenderingContext2D, width: number, height: number): CubeColor[] => {
    const minDim = Math.min(width, height);
    const gridBoxSize = minDim * 0.60;
    const cellSize = gridBoxSize / 3;
    const startX = (width - gridBoxSize) / 2;
    const startY = (height - gridBoxSize) / 2;

    const sampledColors: CubeColor[] = [];

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cellCenterX = startX + col * cellSize + cellSize / 2;
        const cellCenterY = startY + row * cellSize + cellSize / 2;
        const sampleRadius = Math.max(6, Math.floor(cellSize * 0.15));

        const avgRgb = sampleRegionAverageRGB(ctx, cellCenterX, cellCenterY, sampleRadius);
        
        let color: CubeColor;
        if (row === 1 && col === 1) {
          color = guidance.centerColor;
        } else {
          color = classifyColor(avgRgb, guidance.centerColor);
        }
        sampledColors.push(color);
      }
    }
    return sampledColors;
  };

  // Live video frame analysis loop
  useEffect(() => {
    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2 && !isFaceCaptured && !uploadedImageSrc) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const sampledColors = sampleCanvasGrid(ctx, canvas.width, canvas.height);
          setLiveColors(sampledColors);
        }
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [currentFaceIndex, isFaceCaptured, uploadedImageSrc, guidance.centerColor]);

  // Handle local photo upload fallback
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const sampled = sampleCanvasGrid(ctx, canvas.width, canvas.height);
            setLiveColors(sampled);
            const updatedStickers = [...sampled] as FaceState;
            updatedStickers[4] = guidance.centerColor;
            setScannedFaces(prev => ({
              ...prev,
              [currentFace]: updatedStickers
            }));
            setIsFaceCaptured(true);
            setUploadedImageSrc(event.target?.result as string);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureFace = () => {
    const updatedStickers = [...liveColors] as FaceState;
    updatedStickers[4] = guidance.centerColor;

    setScannedFaces(prev => ({
      ...prev,
      [currentFace]: updatedStickers
    }));
    setIsFaceCaptured(true);
  };

  const handleRetakeFace = () => {
    setIsFaceCaptured(false);
    setUploadedImageSrc(null);
    setEditingStickerIndex(null);
  };

  const handleSelectColor = (color: CubeColor) => {
    if (editingStickerIndex === null) return;
    const currentStickers = [...(scannedFaces[currentFace] || liveColors)] as FaceState;
    currentStickers[editingStickerIndex] = color;
    setScannedFaces(prev => ({
      ...prev,
      [currentFace]: currentStickers
    }));
    setEditingStickerIndex(null);
  };

  const handleNextFace = () => {
    if (currentFaceIndex < 5) {
      setCurrentFaceIndex(prev => prev + 1);
      setIsFaceCaptured(false);
      setUploadedImageSrc(null);
      setEditingStickerIndex(null);
    } else {
      onScanComplete(scannedFaces);
    }
  };

  const handlePrevFace = () => {
    if (currentFaceIndex > 0) {
      setCurrentFaceIndex(prev => prev - 1);
      setIsFaceCaptured(false);
      setUploadedImageSrc(null);
      setEditingStickerIndex(null);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const isSystemDenied = cameraError?.toLowerCase().includes('system') || cameraError?.toLowerCase().includes('denied');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between overflow-hidden">
      {/* Hidden file input for uploading photo */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* Top Header */}
      <div 
        className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 backdrop-blur border-b z-10"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div 
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-white/40 shadow-sm flex-shrink-0"
            style={{ backgroundColor: CUBE_COLORS[guidance.centerColor].hex }}
          />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-white tracking-wide truncate font-mono">
              {guidance.title} ({currentFaceIndex + 1}/6)
            </h2>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate hidden xs:block">
              {guidance.hint}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs flex items-center gap-1.5 transition-colors"
            title="Upload Photo of this face"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Photo</span>
          </button>
          <button
            onClick={toggleCamera}
            className="p-1.5 sm:p-2 rounded-xl border border-white/20 hover:bg-white/10 text-white transition-colors"
            title="Switch Camera (Front / Back)"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={onCancel}
            className="px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl border border-white/20 hover:bg-white/10 text-neutral-300 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative flex-1 flex items-center justify-center bg-black overflow-hidden">
        {/* Hidden video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover ${uploadedImageSrc ? 'hidden' : ''}`}
        />

        {/* Uploaded image preview if any */}
        {uploadedImageSrc && (
          <img
            src={uploadedImageSrc}
            alt="Uploaded face"
            className="absolute inset-0 w-full h-full object-contain bg-slate-950"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* 3x3 Reticle Overlay */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative w-[min(76vw,280px)] h-[min(76vw,280px)] border-2 border-sky-400/80 rounded-2xl p-2 sm:p-2.5 backdrop-blur-xs shadow-glow grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2 bg-slate-950/30">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(idx => {
              const displayColor = isFaceCaptured 
                ? scannedFaces[currentFace][idx] 
                : liveColors[idx];
              const isCenter = idx === 4;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (isFaceCaptured && !isCenter) {
                      setEditingStickerIndex(idx);
                    }
                  }}
                  className={`relative rounded-lg flex items-center justify-center border-2 transition-transform duration-150 ${
                    isCenter ? 'border-amber-400 shadow-neon-amber' : 'border-white/50'
                  } ${isFaceCaptured && !isCenter ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
                  style={{
                    backgroundColor: CUBE_COLORS[displayColor]?.hex || '#ffffff',
                  }}
                >
                  {isCenter && (
                    <span className="text-[10px] font-bold text-black/80 px-1 py-0.5 rounded bg-white/75 font-mono">
                      CENTER
                    </span>
                  )}
                  {isFaceCaptured && !isCenter && (
                    <span className="absolute bottom-1 right-1 text-[9px] bg-black/60 text-white px-1 rounded font-mono">
                      edit
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur border border-slate-700/80 text-xs text-slate-200 shadow-md">
            {isFaceCaptured 
              ? 'Tap any sticker to adjust color if needed' 
              : 'Align cube inside grid boxes'}
          </div>
        </div>

        {/* Camera Permission / System Denied Dialog */}
        {cameraError && !uploadedImageSrc && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-neon-amber">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
              {isSystemDenied ? 'Windows OS Camera Access Blocked' : 'Camera Access Needed'}
            </h3>

            {isSystemDenied ? (
              <div className="text-xs text-slate-300 max-w-md bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 mb-5 text-left flex flex-col gap-2">
                <p className="font-semibold text-amber-300">
                  Windows blocked camera access for desktop browsers:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-300 text-[11px]">
                  <li>Open Windows <strong>Settings</strong> (press <kbd className="bg-slate-800 px-1 rounded">Win + I</kbd>).</li>
                  <li>Click <strong>Privacy &amp; security</strong> &rarr; <strong>Camera</strong>.</li>
                  <li>Turn <strong>ON</strong> <span className="text-white">"Let desktop apps access your camera"</span> (and ensure Google Chrome is allowed).</li>
                  <li>Click <strong>Retry Camera</strong> below.</li>
                </ol>
              </div>
            ) : (
              <p className="text-xs text-slate-300 max-w-md mb-5">{cameraError}</p>
            )}

            {/* Alternative options: Photo upload or Wi-Fi mobile */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md w-full">
              <button
                onClick={startCamera}
                className="flex-1 min-w-[130px] px-3.5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-xs shadow-neon-cyan transition-colors"
              >
                Retry Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-w-[130px] px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
              </button>
              <button
                onClick={onCancel}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
              >
                Use Manual 2D Net
              </button>
            </div>

            {/* Mobile Wi-Fi prompt */}
            <div className="mt-5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 max-w-sm text-left flex items-start gap-2.5">
              <Smartphone className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-300">
                <span className="font-semibold text-emerald-400">Scan using your phone:</span> Open <code className="text-sky-300 font-mono">http://172.17.33.184:5173</code> in your phone's browser over Wi-Fi to use your smartphone camera directly!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Color Correction Popover Modal */}
      {editingStickerIndex !== null && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-xs w-full shadow-2xl">
            <h4 className="text-sm font-semibold text-white mb-2 text-center">
              Select Correct Color for Sticker #{editingStickerIndex + 1}
            </h4>
            <div className="grid grid-cols-3 gap-3 my-4">
              {(Object.keys(CUBE_COLORS) as CubeColor[]).map(c => (
                <button
                  key={c}
                  onClick={() => handleSelectColor(c)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border border-slate-700 hover:scale-105 active:scale-95 transition-transform"
                >
                  <div
                    className="w-10 h-10 rounded-lg shadow border border-black/20"
                    style={{ backgroundColor: CUBE_COLORS[c].hex }}
                  />
                  <span className="text-[11px] text-slate-300 font-medium">
                    {CUBE_COLORS[c].name}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditingStickerIndex(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div 
        className="p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md border-t z-10 transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 mb-2.5 overflow-x-auto pb-0.5 scrollbar-none">
          {FACE_ORDER.map((f, idx) => {
            const active = idx === currentFaceIndex;
            const completed = idx < currentFaceIndex || (idx === currentFaceIndex && isFaceCaptured);
            return (
              <button
                key={f}
                onClick={() => {
                  setCurrentFaceIndex(idx);
                  setIsFaceCaptured(false);
                  setUploadedImageSrc(null);
                }}
                className={`flex-1 min-w-[42px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  active 
                    ? 'bg-white text-black border-2 border-white shadow-md' 
                    : completed
                    ? 'bg-neutral-800 text-white border border-white/20'
                    : 'bg-black/50 text-neutral-500 border border-white/10'
                }`}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/30"
                  style={{ backgroundColor: CUBE_COLORS[FACE_GUIDANCE[f].centerColor].hex }}
                />
                <span>{f}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={handlePrevFace}
            disabled={currentFaceIndex === 0}
            className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-white/20 hover:bg-white/10 disabled:opacity-25 text-white text-xs sm:text-sm font-bold flex items-center gap-1 transition-colors active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Prev</span>
          </button>

          {!isFaceCaptured ? (
            <button
              onClick={handleCaptureFace}
              className="flex-1 h-11 sm:h-12 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
              <span>Capture {guidance.centerColor} Face</span>
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              <button
                onClick={handleRetakeFace}
                className="flex-1 h-11 sm:h-12 px-2.5 sm:px-3 rounded-xl border border-white/20 hover:bg-white/10 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                onClick={handleNextFace}
                className="flex-[1.4] h-11 sm:h-12 px-3 sm:px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                <span>{currentFaceIndex === 5 ? 'Finish & Solve' : 'Confirm & Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
