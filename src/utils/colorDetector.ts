import type { CubeColor } from '../solver/cubeTypes';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number; // 0 - 360
  s: number; // 0 - 1
  v: number; // 0 - 1
}

export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;

  if (diff !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / diff) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / diff + 2);
    } else {
      h = 60 * ((r - g) / diff + 4);
    }
  }

  if (h < 0) h += 360;

  return { h, s, v };
}

// Sample average RGB in a square box from an ImageData or CanvasRenderingContext2D
export function sampleRegionAverageRGB(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
): RGB {
  const x = Math.max(0, Math.floor(centerX - radius));
  const y = Math.max(0, Math.floor(centerY - radius));
  const width = Math.min(ctx.canvas.width - x, radius * 2);
  const height = Math.min(ctx.canvas.height - y, radius * 2);

  if (width <= 0 || height <= 0) {
    return { r: 128, g: 128, b: 128 };
  }

  const imgData = ctx.getImageData(x, y, width, height);
  const data = imgData.data;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 8) {
    sumR += data[i];
    sumG += data[i + 1];
    sumB += data[i + 2];
    count++;
  }

  if (count === 0) return { r: 128, g: 128, b: 128 };

  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count),
  };
}

/**
 * Classify a sampled RGB/HSV pixel into one of the 6 cube colors.
 */
export function classifyColor(rgb: RGB, _centerColorExpected?: CubeColor): CubeColor {
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  const colorDiff = Math.max(
    Math.abs(rgb.r - rgb.g),
    Math.abs(rgb.g - rgb.b),
    Math.abs(rgb.r - rgb.b)
  );

  if (hsv.s < 0.22 && hsv.v > 0.40) {
    return 'W';
  }

  if (colorDiff < 32 && hsv.v > 0.45) {
    return 'W';
  }

  const h = hsv.h;

  if (h >= 350 || h < 14) {
    return 'R';
  }

  if (h >= 14 && h < 42) {
    return 'O';
  }

  if (h >= 42 && h < 75) {
    return 'Y';
  }

  if (h >= 75 && h < 165) {
    return 'G';
  }

  if (h >= 165 && h < 265) {
    return 'B';
  }

  if (h >= 265 && h < 350) {
    return 'R';
  }

  return 'W';
}
