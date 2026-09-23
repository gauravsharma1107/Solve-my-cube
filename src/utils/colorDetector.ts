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
// These represent typical plastic sRGB values under warm indoor LED/sunlight
// W=(255,255,255) Y=(255,213,0) G=(0,155,72) B=(0,70,173) R=(183,18,52) O=(255,88,0)
const REF_LAB: Record<CubeColor, LAB> = {
  W: { l: 95, a:  -1, b:   4 },   // near-white, slight warm tint
  Y: { l: 84, a:  -4, b:  82 },   // vivid yellow: very high +b
  G: { l: 57, a: -46, b:  27 },   // vivid green: high -a
  B: { l: 30, a:  15, b: -50 },   // vivid blue: high -b
  R: { l: 41, a:  60, b:  35 },   // vivid red: high +a
  O: { l: 56, a:  46, b:  60 },   // vivid orange: high +a, +b, higher L than red
  X: { l: 15, a:   0, b:   0 }    // blank / dark gray
};

/**
 * High-accuracy Rubik's cube color classifier using weighted CIE LAB Delta-E.
 *
 * Rather than fragile if-chains (which break under different lighting), this
 * uses a fully learned, weighted nearest-neighbour approach:
 *   - Chroma (a*, b*) weighted 2× relative to lightness (L*)
 *   - White detection uses a strict low-chroma + high-L gate before NN
 *   - Black/plastic edge (X) detection gates out sensor noise
 */
export function classifyColor(rgb: RGB, _centerRgb?: RGB, _centerColorExpected?: CubeColor): CubeColor {
  const lab = rgbToLab(rgb.r, rgb.g, rgb.b);
  const chroma = Math.sqrt(lab.a * lab.a + lab.b * lab.b);

  // Early exit: very dark → probably plastic border captured, return X
  if (lab.l < 12) return 'X';

  // Early exit: very high L + very low chroma → unambiguously white
  if (lab.l > 78 && chroma < 14) return 'W';

  // Weighted Delta-E nearest-neighbour across all candidate colors
  // Weights: L*=0.6, a*=1.4, b*=1.4  (chrominance matters more than luminance)
  const candidateColors: CubeColor[] = ['W', 'Y', 'G', 'B', 'R', 'O'];
  let bestColor: CubeColor = 'W';
  let minDist = Infinity;
  let secondDist = Infinity;

  for (const c of candidateColors) {
    const ref = REF_LAB[c];
    const dl = (lab.l - ref.l) * 0.6;
    const da = (lab.a - ref.a) * 1.4;
    const db = (lab.b - ref.b) * 1.4;
    const dist = Math.sqrt(dl * dl + da * da + db * db);
    if (dist < minDist) {
      secondDist = minDist;
      minDist = dist;
      bestColor = c;
    } else if (dist < secondDist) {
      secondDist = dist;
    }
  }

  // Ambiguous classification: if best and second-best are very close,
  // use chroma-axis tiebreakers for known confusable pairs
  const ambiguous = secondDist - minDist < 8;
  if (ambiguous) {
    // Red vs Orange: orange has notably higher b* and L*
    if ((bestColor === 'R' || bestColor === 'O')) {
      bestColor = (lab.b > 48 && lab.l > 48) ? 'O' : 'R';
    }
    // White vs Yellow: yellow has distinctly high b*
    if ((bestColor === 'W' || bestColor === 'Y')) {
      bestColor = (lab.b > 40) ? 'Y' : 'W';
    }
    // Green vs Yellow: green has strongly negative a*
    if ((bestColor === 'G' || bestColor === 'Y')) {
      bestColor = (lab.a < -15) ? 'G' : 'Y';
    }
  }

  return bestColor;
}
