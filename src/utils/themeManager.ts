export type BlackIntensityPreset = 'oled' | 'obsidian' | 'charcoal' | 'graphite';

export interface ThemeConfig {
  intensity: number; // 0 to 100
  preset: BlackIntensityPreset;
}

const STORAGE_KEY = 'cubesync_theme_intensity';

export const PRESETS: Record<BlackIntensityPreset, { name: string; value: number; description: string }> = {
  oled: {
    name: 'OLED True Black',
    value: 100,
    description: 'Pure #000000 pitch black for maximum contrast and battery saving on OLED screens.'
  },
  obsidian: {
    name: 'Obsidian',
    value: 85,
    description: 'Modern deep dark tone (#09090b) with subtle separation.'
  },
  charcoal: {
    name: 'Charcoal',
    value: 70,
    description: 'Refined matte dark tone (#141417) with soft contrast.'
  },
  graphite: {
    name: 'Graphite',
    value: 50,
    description: 'Gentle dark gray (#1e1e24) with visible depth.'
  }
};

function lerp(start: number, end: number, t: number): number {
  return Math.round(start + (end - start) * t);
}

export function applyBlackIntensity(intensity: number) {
  const clamped = Math.max(0, Math.min(100, intensity));
  const t = (100 - clamped) / 100; // 0 for OLED (100%), 1 for lowest intensity (0%)

  // Canvas background: from (0,0,0) to (40,40,48)
  const cR = lerp(0, 40, t);
  const cG = lerp(0, 40, t);
  const cB = lerp(0, 48, t);

  // Surface background (header, nav): from (5,5,5) to (50,50,60)
  const sR = lerp(5, 50, t);
  const sG = lerp(5, 50, t);
  const sB = lerp(5, 60, t);

  // Card background: from (12,12,12) to (60,60,72)
  const cdR = lerp(12, 60, t);
  const cdG = lerp(12, 60, t);
  const cdB = lerp(12, 72, t);

  // Elevated card: from (20,20,20) to (72,72,85)
  const eR = lerp(20, 72, t);
  const eG = lerp(20, 72, t);
  const eB = lerp(20, 85, t);

  // Subtle border opacity: from 0.14 down to 0.08
  const borderSubtleAlpha = (0.14 - 0.06 * t).toFixed(3);
  const borderStrongAlpha = (0.28 - 0.10 * t).toFixed(3);

  const root = document.documentElement;
  root.style.setProperty('--bg-canvas', `rgb(${cR}, ${cG}, ${cB})`);
  root.style.setProperty('--bg-surface', `rgb(${sR}, ${sG}, ${sB})`);
  root.style.setProperty('--bg-card', `rgb(${cdR}, ${cdG}, ${cdB})`);
  root.style.setProperty('--bg-elevated', `rgb(${eR}, ${eG}, ${eB})`);
  root.style.setProperty('--border-subtle', `rgba(255, 255, 255, ${borderSubtleAlpha})`);
  root.style.setProperty('--border-strong', `rgba(255, 255, 255, ${borderStrongAlpha})`);
  root.style.setProperty('--text-primary', '#ffffff');
  root.style.setProperty('--text-secondary', '#d4d4d8');
  root.style.setProperty('--text-muted', '#a1a1aa');

  try {
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  } catch {
    // Ignore storage issues
  }
}

export function getInitialIntensity(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return 100; // Default to OLED True Black
}
