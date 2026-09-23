import type { CubeColor } from '../solver/cubeTypes';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  l: number; // 0 - 100
  a: number; // -128 to 127 (green -> red)
  b: number; // -128 to 127 (blue -> yellow)
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

// Convert sRGB to CIE LAB (D65 standard illuminant)
export function rgbToLab(r: number, g: number, b: number): LAB {
  // sRGB to linear RGB
  let lr = r / 255;
  let lg = g / 255;
  let lb = b / 255;

  lr = lr > 0.04045 ? Math.pow((lr + 0.055) / 1.055, 2.4) : lr / 12.92;
  lg = lg > 0.04045 ? Math.pow((lg + 0.055) / 1.055, 2.4) : lg / 12.92;
  lb = lb > 0.04045 ? Math.pow((lb + 0.055) / 1.055, 2.4) : lb / 12.92;

  // Linear RGB to XYZ (D65)
  const x = (lr * 0.4124 + lg * 0.3576 + lb * 0.1805) / 0.95047;
  const y = (lr * 0.2126 + lg * 0.7152 + lb * 0.0722) / 1.00000;
  const z = (lr * 0.0193 + lg * 0.1192 + lb * 0.9505) / 1.08883;

  const fx = x > 0.008856 ? Math.cbrt(x) : (7.787 * x) + (16 / 116);
  const fy = y > 0.008856 ? Math.cbrt(y) : (7.787 * y) + (16 / 116);
  const fz = z > 0.008856 ? Math.cbrt(z) : (7.787 * z) + (16 / 116);

  const l = Math.max(0, Math.min(100, (116 * fy) - 16));
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { l, a, b: bVal };
}

// Robust trimmed-mean region sampling: ignores black plastic edges, shadows, and specular glare
export function sampleRegionAverageRGB(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
): RGB {
  // Sample inner core (central 40% of cell) to avoid borders
  const coreRadius = Math.max(4, Math.floor(radius * 0.65));
  const x = Math.max(0, Math.floor(centerX - coreRadius));
  const y = Math.max(0, Math.floor(centerY - coreRadius));
  const width = Math.min(ctx.canvas.width - x, coreRadius * 2);
  const height = Math.min(ctx.canvas.height - y, coreRadius * 2);

  if (width <= 0 || height <= 0) {
    return { r: 128, g: 128, b: 128 };
  }

  const imgData = ctx.getImageData(x, y, width, height);
  const data = imgData.data;

  interface Pixel {
    r: number;
    g: number;
    b: number;
    lum: number;
  }

  const pixels: Pixel[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i];
    const pg = data[i + 1];
    const pb = data[i + 2];
    const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
    pixels.push({ r: pr, g: pg, b: pb, lum });
  }

  if (pixels.length === 0) return { r: 128, g: 128, b: 128 };

  // Sort by luminance to trim top 15% (glare) and bottom 15% (shadows/creases)
  pixels.sort((p1, p2) => p1.lum - p2.lum);
  const trimStart = Math.floor(pixels.length * 0.15);
  const trimEnd = Math.max(trimStart + 1, Math.floor(pixels.length * 0.85));

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = trimStart; i < trimEnd; i++) {
    sumR += pixels[i].r;
    sumG += pixels[i].g;
    sumB += pixels[i].b;
    count++;
  }

  if (count === 0) return { r: 128, g: 128, b: 128 };

  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count)
  };
}

// Reference LAB centroids for standard Rubik's cube sticker colors
const REF_LAB: Record<CubeColor, LAB> = {
  W: { l: 92, a: 0, b: 2 },        // Neutral white, low chroma
  Y: { l: 85, a: -6, b: 78 },      // Bright yellow, high positive b
  G: { l: 52, a: -48, b: 28 },     // Strong negative a (green)
  B: { l: 38, a: 12, b: -58 },     // Strong negative b (blue)
  R: { l: 44, a: 56, b: 32 },      // High positive a (red)
  O: { l: 62, a: 45, b: 65 },      // High positive a and b, higher L than red
  X: { l: 15, a: 0, b: 0 }         // Blank dark gray
};

/**
 * High-accuracy Rubik's cube color classifier.
 * Uses CIE LAB color distance + HSV hue & saturation verification.
 */
export function classifyColor(rgb: RGB, _centerRgb?: RGB, _centerColorExpected?: CubeColor): CubeColor {
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);

  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);

  // 1. WHITE DETECTION:
  // Under typical indoor lighting, white stickers have high lightness and low chroma
  const maxDiff = Math.max(
    Math.abs(rgb.r - rgb.g),
    Math.abs(rgb.g - rgb.b),
    Math.abs(rgb.r - rgb.b)
  );

  if (hsv.v > 0.45 && (chroma < 18 || (hsv.s < 0.22 && maxDiff < 38))) {
    return 'W';
  }

  // If very desaturated, it's white
  if (hsv.s < 0.18 && hsv.v > 0.40) {
    return 'W';
  }

  // 2. BLUE DETECTION:
  // Strong blue component: b is significantly higher than green, and LAB b is negative
  if (rgb.b > rgb.r + 15 && rgb.b > rgb.g - 10 && (hsv.h >= 170 && hsv.h <= 265)) {
    return 'B';
  }
  if (lab.b < -15 && lab.a < 25) {
    return 'B';
  }

  // 3. GREEN DETECTION:
  // Green channel dominates, LAB a is strongly negative
  if (rgb.g > rgb.r + 10 && rgb.g > rgb.b + 10 && (hsv.h >= 75 && hsv.h <= 170)) {
    return 'G';
  }
  if (lab.a < -20 && lab.b > -10) {
    return 'G';
  }

  // 4. YELLOW DETECTION:
  // High red + high green, low blue, LAB b is strongly positive, hue between 40 and 75
  if (hsv.h >= 40 && hsv.h < 75 && hsv.s > 0.35 && hsv.v > 0.50) {
    return 'Y';
  }
  if (lab.b > 50 && lab.a < 15 && lab.l > 60) {
    return 'Y';
  }

  // 5. RED vs ORANGE DISCRIMINATION:
  // Both have high red and low blue.
  // Orange has significantly more green (g > 70 and g/r > 0.35) and higher lightness.
  // Red has low green and lower lightness.
  if (hsv.h >= 14 && hsv.h < 42) {
    if (rgb.g > rgb.r * 0.38 && lab.l > 48 && lab.b > 38) {
      return 'O';
    }
    return 'R';
  }

  if (hsv.h >= 345 || hsv.h < 14) {
    return 'R';
  }

  // 6. DELTA-E FALLBACK (CIE LAB Nearest Neighbor):
  let bestColor: CubeColor = 'W';
  let minDistance = Infinity;

  const candidateColors: CubeColor[] = ['W', 'Y', 'G', 'B', 'R', 'O'];
  for (const c of candidateColors) {
    const ref = REF_LAB[c];
    // Weighted Delta-E: higher weight on a and b (chromaticity) than L (luminance)
    const dl = (lab.l - ref.l) * 0.7;
    const da = (lab.a - ref.a) * 1.2;
    const db = (lab.b - ref.b) * 1.2;
    const dist = Math.sqrt(dl * dl + da * da + db * db);

    if (dist < minDistance) {
      minDistance = dist;
      bestColor = c;
    }
  }

  return bestColor;
}
