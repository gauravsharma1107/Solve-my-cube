import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, RefreshCw, CheckCircle2, ChevronRight, ChevronLeft, 
  AlertTriangle, RotateCw, Upload, Compass, Play
} from 'lucide-react';
import type { CubeColor, CubeState, Face, FaceState } from '../solver/cubeTypes';
import { CUBE_COLORS, FACE_NAMES } from '../solver/cubeTypes';
import { classifyColor, sampleRegionAverageRGB } from '../utils/colorDetector';
import { validateCubeParity } from '../solver/parityValidator';

interface CameraScannerProps {
  onScanComplete: (state: CubeState) => void;
  onCancel: () => void;
  initialState?: CubeState;
}

// Standard carousel scan flow: Front -> Right -> Back -> Left -> Top -> Bottom
export const SCAN_ORDER: Face[] = ['F', 'R', 'B', 'L', 'U', 'D'];

interface FaceScanGuidance {
  face: Face;
  title: string;
  centerColor: CubeColor;
  actionBanner: string;
  actionSub: string;
  topBadge: { color: CubeColor; text: string };
  centerBadge: { color: CubeColor; text: string };
  sideBadge: { color: CubeColor; text: string };
  rotationPrompt: string;
}

const SCAN_GUIDANCE: Record<Face, FaceScanGuidance> = {
  F: {
    face: 'F',
    title: 'Front Face (Green Center)',
    centerColor: 'G',
    actionBanner: 'Step 1: Hold GREEN Face Facing Camera',
    actionSub: 'Keep WHITE on top, GREEN facing directly at the camera',
    topBadge: { color: 'W', text: 'Top: White' },
    centerBadge: { color: 'G', text: 'Center: Green' },
    sideBadge: { color: 'R', text: 'Right: Red' },
    rotationPrompt: 'Starting Position'
  },
  R: {
    face: 'R',
    title: 'Right Face (Red Center)',
    centerColor: 'R',
    actionBanner: '↻ Rotate Cube 90° to the RIGHT',
    actionSub: 'Keep WHITE on top • GREEN is now on your left side',
    topBadge: { color: 'W', text: 'Top: White' },
    centerBadge: { color: 'R', text: 'Center: Red' },
    sideBadge: { color: 'G', text: 'Left: Green' },
    rotationPrompt: 'Turn 90° Right'
  },
  B: {
    face: 'B',
    title: 'Back Face (Blue Center)',
    centerColor: 'B',
    actionBanner: '↻ Rotate Cube 90° to the RIGHT again',
    actionSub: 'Keep WHITE on top • RED is now on your left side',
    topBadge: { color: 'W', text: 'Top: White' },
    centerBadge: { color: 'B', text: 'Center: Blue' },
    sideBadge: { color: 'R', text: 'Left: Red' },
    rotationPrompt: 'Turn 90° Right'
  },
  L: {
    face: 'L',
    title: 'Left Face (Orange Center)',
    centerColor: 'O',
    actionBanner: '↻ Rotate Cube 90° to the RIGHT again',
    actionSub: 'Keep WHITE on top • BLUE is now on your left side',
    topBadge: { color: 'W', text: 'Top: White' },
    centerBadge: { color: 'O', text: 'Center: Orange' },
    sideBadge: { color: 'B', text: 'Left: Blue' },
    rotationPrompt: 'Turn 90° Right'
  },
  U: {
    face: 'U',
    title: 'Top Face (White Center)',
    centerColor: 'W',
    actionBanner: '⤓ Tilt Cube 90° DOWN Towards You',
    actionSub: 'WHITE now faces camera • GREEN is now at the bottom edge',
    topBadge: { color: 'B', text: 'Top Edge: Blue' },
    centerBadge: { color: 'W', text: 'Center: White' },
    sideBadge: { color: 'G', text: 'Bottom: Green' },
    rotationPrompt: 'Tilt 90° Down'
  },
  D: {
    face: 'D',
    title: 'Bottom Face (Yellow Center)',
    centerColor: 'Y',
    actionBanner: '⤒ Tilt Cube 180° UP Away from You',
    actionSub: 'YELLOW now faces camera • GREEN is now at the top edge',
    topBadge: { color: 'G', text: 'Top Edge: Green' },
    centerBadge: { color: 'Y', text: 'Center: Yellow' },
    sideBadge: { color: 'B', text: 'Bottom: Blue' },
    rotationPrompt: 'Tilt 180° Up'
  }
};

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScanComplete,
  onCancel,
  initialState
}) => {
  const [currentScanStep, setCurrentScanStep] = useState<number>(0);
  const currentFace = SCAN_ORDER[currentScanStep];
  const guidance = SCAN_GUIDANCE[currentFace];

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

  const [capturedSteps, setCapturedSteps] = useState<boolean[]>([false, false, false, false, false, false]);
  const [liveColors, setLiveColors] = useState<CubeColor[]>(['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W']);
  const [editingStickerIndex, setEditingStickerIndex] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFaceCaptured, setIsFaceCaptured] = useState<boolean>(false);
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [showFinalReview, setShowFinalReview] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reticleRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-tier camera initialization
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      let stream: MediaStream;
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        console.warn('High resolution failed, attempting basic video constraint:', err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Unable to access camera. Please allow camera permissions in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in your browser or OS settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      }
      setCameraError(msg);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
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

  // EXACT MATHEMATICAL VIEWPORT-TO-VIDEO PIXEL SAMPLING
  // Resolves the CSS object-cover cropping parallax error completely
  const sampleAccurateReticleGrid = (
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    reticle: HTMLDivElement
  ): CubeColor[] => {
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    if (!vWidth || !vHeight) return Array(9).fill('W');

    const vRect = video.getBoundingClientRect();
    const rRect = reticle.getBoundingClientRect();

    const videoAspect = vWidth / vHeight;
    const containerAspect = vRect.width / vRect.height;

    let renderW = vRect.width;
    let renderH = vRect.height;
    let offX = 0;
    let offY = 0;

    if (containerAspect > videoAspect) {
      // Container is wider than video: cropped top & bottom
      renderW = vRect.width;
      renderH = vRect.width / videoAspect;
      offY = (vRect.height - renderH) / 2;
    } else {
      // Container is taller than video: cropped left & right
      renderH = vRect.height;
      renderW = vRect.height * videoAspect;
      offX = (vRect.width - renderW) / 2;
    }

    const scaleX = vWidth / renderW;
    const scaleY = vHeight / renderH;

    // Reticle coordinates projected into video pixel space
    const reticleVideoX = (rRect.left - vRect.left - offX) * scaleX;
    const reticleVideoY = (rRect.top - vRect.top - offY) * scaleY;
    const reticleVideoW = rRect.width * scaleX;
    const reticleVideoH = rRect.height * scaleY;

    const cellW = reticleVideoW / 3;
    const cellH = reticleVideoH / 3;

    // Sample center sticker first for ambient lighting calibration
    const centerSampleX = reticleVideoX + 1.5 * cellW;
    const centerSampleY = reticleVideoY + 1.5 * cellH;
    const sampleRadius = Math.max(6, Math.floor(Math.min(cellW, cellH) * 0.28));
    const centerRgb = sampleRegionAverageRGB(ctx, centerSampleX, centerSampleY, sampleRadius);

    const sampled: CubeColor[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (row === 1 && col === 1) {
          sampled.push(guidance.centerColor); // Center is fixed
        } else {
          const cellCenterX = reticleVideoX + col * cellW + cellW / 2;
          const cellCenterY = reticleVideoY + row * cellH + cellH / 2;
          const avgRgb = sampleRegionAverageRGB(ctx, cellCenterX, cellCenterY, sampleRadius);
          const color = classifyColor(avgRgb, centerRgb, guidance.centerColor);
          sampled.push(color);
        }
      }
    }

    return sampled;
  };

  // Live video frame analysis loop
  useEffect(() => {
    const processFrame = () => {
      const video = videoRef.current;
      const reticle = reticleRef.current;
      const canvas = canvasRef.current;

      if (video && reticle && canvas && video.readyState >= 2 && !isFaceCaptured && !uploadedImageSrc) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const sampled = sampleAccurateReticleGrid(ctx, video, reticle);
          setLiveColors(sampled);
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
  }, [currentScanStep, isFaceCaptured, uploadedImageSrc, guidance.centerColor]);

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
            
            // For photo upload: sample center region directly
            const minDim = Math.min(canvas.width, canvas.height);
            const boxSize = minDim * 0.65;
            const cellSize = boxSize / 3;
            const startX = (canvas.width - boxSize) / 2;
            const startY = (canvas.height - boxSize) / 2;
            const sampleR = Math.max(8, Math.floor(cellSize * 0.25));

            const centerRgb = sampleRegionAverageRGB(ctx, startX + 1.5 * cellSize, startY + 1.5 * cellSize, sampleR);
            const sampled: CubeColor[] = [];

            for (let r = 0; r < 3; r++) {
              for (let c = 0; c < 3; c++) {
                if (r === 1 && c === 1) {
                  sampled.push(guidance.centerColor);
                } else {
                  const cx = startX + c * cellSize + cellSize / 2;
                  const cy = startY + r * cellSize + cellSize / 2;
                  const rgb = sampleRegionAverageRGB(ctx, cx, cy, sampleR);
                  sampled.push(classifyColor(rgb, centerRgb, guidance.centerColor));
                }
              }
            }

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

    const nextCaptured = [...capturedSteps];
    nextCaptured[currentScanStep] = true;
    setCapturedSteps(nextCaptured);
    setIsFaceCaptured(true);
  };

  const handleRetakeFace = () => {
    setIsFaceCaptured(false);
    setUploadedImageSrc(null);
    setEditingStickerIndex(null);

    const nextCaptured = [...capturedSteps];
    nextCaptured[currentScanStep] = false;
    setCapturedSteps(nextCaptured);
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

  const handleNextStep = () => {
    if (currentScanStep < SCAN_ORDER.length - 1) {
      setCurrentScanStep(prev => prev + 1);
      setIsFaceCaptured(false);
      setUploadedImageSrc(null);
      setEditingStickerIndex(null);
    } else {
      setShowFinalReview(true);
    }
  };

  const handlePrevStep = () => {
    if (currentScanStep > 0) {
      setCurrentScanStep(prev => prev - 1);
      setIsFaceCaptured(capturedSteps[currentScanStep - 1] || false);
      setUploadedImageSrc(null);
      setEditingStickerIndex(null);
    }
  };

  const handleFinishAndSolve = () => {
    onScanComplete(scannedFaces as CubeState);
  };

  const parity = validateCubeParity(scannedFaces as CubeState);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden animate-in fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Top Header */}
      <div 
        className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 backdrop-blur border-b z-20 transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div 
            className="w-4 h-4 rounded-full border border-white/40 shadow-sm flex-shrink-0"
            style={{ backgroundColor: CUBE_COLORS[guidance.centerColor].hex }}
          />
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-white tracking-wide truncate font-mono">
              {guidance.title} ({currentScanStep + 1}/6)
            </h2>
            <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate hidden xs:block">
              {guidance.actionSub}
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
      <div className="relative flex-1 flex flex-col items-center justify-center bg-black overflow-hidden">
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
            className="absolute inset-0 w-full h-full object-contain bg-black"
          />
        )}

        <canvas ref={canvasRef} className="hidden" />

        {/* PROMINENT ON-SCREEN ORIENTATION & TURN BANNER */}
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-4 sm:right-4 z-20 flex flex-col items-center gap-1 pointer-events-none">
          {/* Main Action Pill */}
          <div className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl bg-black/90 backdrop-blur-md border border-white/30 text-white shadow-2xl flex items-center gap-2 max-w-md text-center">
            <Compass className="w-4 h-4 text-white flex-shrink-0 animate-pulse" />
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-black font-mono tracking-tight leading-none text-white">
                {guidance.actionBanner}
              </span>
              <span className="text-[10px] sm:text-[11px] text-neutral-300 mt-0.5 leading-snug line-clamp-1">
                {guidance.actionSub}
              </span>
            </div>
          </div>

          {/* Tri-Color Reference Compass Badges */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur border border-white/20 text-[10px] font-mono shadow-md">
            <span className="flex items-center gap-1 font-bold text-white">
              <span className="w-2 h-2 rounded-full border border-black/40" style={{ backgroundColor: CUBE_COLORS[guidance.topBadge.color].hex }} />
              {guidance.topBadge.text}
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="flex items-center gap-1 font-bold text-white">
              <span className="w-2 h-2 rounded-full border border-black/40" style={{ backgroundColor: CUBE_COLORS[guidance.centerBadge.color].hex }} />
              {guidance.centerBadge.text}
            </span>
            <span className="text-neutral-500">&bull;</span>
            <span className="flex items-center gap-1 text-neutral-300">
              <span className="w-2 h-2 rounded-full border border-black/40" style={{ backgroundColor: CUBE_COLORS[guidance.sideBadge.color].hex }} />
              {guidance.sideBadge.text}
            </span>
          </div>
        </div>

        {/* 3x3 Reticle Overlay (Matched with exact canvas pixel projection) */}
        <div className="relative z-10 flex flex-col items-center mt-12 sm:mt-14">
          <div 
            ref={reticleRef}
            className="relative w-[min(74vw,280px)] h-[min(74vw,280px)] border-2 border-white/80 rounded-2xl p-2 sm:p-2.5 backdrop-blur-xs shadow-2xl grid grid-cols-3 grid-rows-3 gap-1.5 sm:gap-2 bg-black/40"
          >
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
                  className={`relative rounded-xl flex items-center justify-center border-2 transition-all duration-150 ${
                    isCenter 
                      ? 'border-white shadow-lg ring-2 ring-white/40' 
                      : 'border-black/50 shadow-md'
                  } ${isFaceCaptured && !isCenter ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
                  style={{
                    backgroundColor: CUBE_COLORS[displayColor]?.hex || '#222226',
                  }}
                >
                  {isCenter && (
                    <span className="text-[9px] font-black text-black px-1.5 py-0.5 rounded bg-white font-mono">
                      CENTER
                    </span>
                  )}
                  {isFaceCaptured && !isCenter && (
                    <span className="text-[9px] font-mono font-bold text-black px-1 rounded bg-white/90">
                      {CUBE_COLORS[displayColor]?.code}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 px-3 py-1 rounded-full bg-black/85 backdrop-blur border border-white/25 text-xs text-neutral-200 shadow-md">
            {isFaceCaptured 
              ? 'Tap any sticker to adjust if needed, then Confirm' 
              : 'Fit cube inside the 3x3 grid'}
          </div>
        </div>

        {/* Camera Permission / System Denied Dialog */}
        {cameraError && !uploadedImageSrc && (
          <div className="absolute inset-0 z-30 bg-black/95 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-white/30 flex items-center justify-center text-white mb-3 shadow-xl">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 font-mono">
              Camera Access Blocked or Denied
            </h3>

            <p className="text-xs text-neutral-300 max-w-md mb-5 leading-relaxed">
              {cameraError}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md w-full">
              <button
                onClick={startCamera}
                className="flex-1 min-w-[130px] px-4 py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-neutral-200 transition-colors"
              >
                Retry Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-w-[130px] px-4 py-2.5 border border-white/20 hover:bg-white/10 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
              </button>
              <button
                onClick={onCancel}
                className="w-full sm:w-auto px-4 py-2.5 border border-white/20 hover:bg-white/10 text-neutral-300 rounded-xl text-xs transition-colors"
              >
                Use Cube Input
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Color Correction Popover Modal */}
      {editingStickerIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="border border-white/20 rounded-2xl p-5 max-w-xs w-full shadow-2xl text-white"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <h4 className="text-sm font-bold text-white mb-2 text-center font-mono">
              Adjust Sticker #{editingStickerIndex + 1}
            </h4>
            <div className="grid grid-cols-3 gap-2.5 my-4">
              {(['W', 'Y', 'G', 'B', 'R', 'O'] as CubeColor[]).map(c => (
                <button
                  key={c}
                  onClick={() => handleSelectColor(c)}
                  className="flex flex-col items-center gap-1 p-2 rounded-xl border border-white/20 hover:border-white hover:bg-white/10 active:scale-95 transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-lg shadow-sm border border-black/30"
                    style={{ backgroundColor: CUBE_COLORS[c].hex }}
                  />
                  <span className="text-[11px] text-white font-bold">
                    {CUBE_COLORS[c].name}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setEditingStickerIndex(null)}
              className="w-full py-2 border border-white/20 hover:bg-white/10 rounded-xl text-xs text-neutral-300 font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* FINAL 6-FACE REVIEW MODAL */}
      {showFinalReview && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="w-full max-w-xl rounded-2xl border border-white/20 p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-white my-auto"
            style={{ backgroundColor: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black font-mono">Review Scanned Cube Faces</h3>
                <p className="text-xs text-neutral-400">Verify all 6 faces before solving</p>
              </div>
              <button 
                onClick={() => setShowFinalReview(false)}
                className="p-1.5 rounded-lg border border-white/20 text-neutral-400 hover:text-white"
              >
                &larr; Back
              </button>
            </div>

            {/* Validation Banner */}
            {parity.isValid ? (
              <div className="p-3 rounded-xl bg-white/10 border border-white/30 text-white text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
                <span className="font-bold">All 54 stickers verified and solvable!</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>{parity.errors[0] || 'Some stickers need adjustment.'}</span>
              </div>
            )}

            {/* Unfolded preview */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 py-2">
              {SCAN_ORDER.map(f => (
                <div key={f} className="flex flex-col items-center gap-1 p-2 rounded-xl border border-white/10" style={{ backgroundColor: 'var(--bg-canvas)' }}>
                  <span className="text-[10px] font-mono font-bold text-neutral-300">{FACE_NAMES[f].split(' ')[0]}</span>
                  <div className="grid grid-cols-3 gap-0.5 w-14 h-14 p-0.5 rounded border border-white/20">
                    {scannedFaces[f].map((c, i) => (
                      <div 
                        key={i} 
                        className="rounded-xs" 
                        style={{ backgroundColor: CUBE_COLORS[c].hex }} 
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <button
                onClick={() => setShowFinalReview(false)}
                className="px-4 py-2 rounded-xl border border-white/20 text-xs font-semibold text-neutral-300 hover:text-white"
              >
                Retake Any Face
              </button>
              <button
                onClick={handleFinishAndSolve}
                className="px-6 py-2.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 shadow-xl transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Solve in 3D &rarr;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Controls */}
      <div 
        className="p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md border-t z-20 transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        {/* Step dots */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-3 mb-2.5 overflow-x-auto pb-0.5 scrollbar-none">
          {SCAN_ORDER.map((f, idx) => {
            const active = idx === currentScanStep;
            const completed = capturedSteps[idx];
            return (
              <button
                key={f}
                onClick={() => {
                  setCurrentScanStep(idx);
                  setIsFaceCaptured(capturedSteps[idx]);
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
                  style={{ backgroundColor: CUBE_COLORS[SCAN_GUIDANCE[f].centerColor].hex }}
                />
                <span>{f}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2.5">
          <button
            onClick={handlePrevStep}
            disabled={currentScanStep === 0}
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
                onClick={handleNextStep}
                className="flex-[1.4] h-11 sm:h-12 px-3 sm:px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-black text-xs sm:text-sm shadow-xl flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                <span>{currentScanStep === 5 ? 'Review & Solve' : 'Confirm & Next'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
