import React from 'react';
import { X, Moon, Sparkles, Check, Sliders } from 'lucide-react';
import { PRESETS, type BlackIntensityPreset } from '../utils/themeManager';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  intensity,
  onIntensityChange,
}) => {
  if (!isOpen) return null;

  const currentPreset: BlackIntensityPreset | null = 
    intensity === 100 ? 'oled' :
    intensity === 85 ? 'obsidian' :
    intensity === 70 ? 'charcoal' :
    intensity === 50 ? 'graphite' : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md rounded-2xl border border-white/20 p-5 sm:p-6 shadow-2xl flex flex-col gap-5 text-white"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Theme & Black Depth</h2>
              <p className="text-xs text-neutral-400">Customize the intensity of the black background</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Intensity Gauge */}
        <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-white/10" style={{ backgroundColor: 'var(--bg-canvas)' }}>
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-neutral-300" />
              Black Intensity:
            </span>
            <span className="font-bold text-white text-sm">
              {intensity}% {intensity === 100 && '• OLED Pure'}
            </span>
          </div>

          <input
            type="range"
            min="20"
            max="100"
            step="1"
            value={intensity}
            onChange={(e) => onIntensityChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
          />

          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>Soft Charcoal (20%)</span>
            <span>Mid (60%)</span>
            <span>Pure OLED (100%)</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRESETS) as BlackIntensityPreset[]).map((presetKey) => {
              const preset = PRESETS[presetKey];
              const isSelected = currentPreset === presetKey;

              return (
                <button
                  key={presetKey}
                  onClick={() => onIntensityChange(preset.value)}
                  className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-white text-black border-white shadow-lg'
                      : 'border-white/15 text-neutral-200 hover:border-white/40 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{preset.name}</span>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-black" />
                    ) : (
                      <span className="text-[10px] font-mono text-neutral-400">{preset.value}%</span>
                    )}
                  </div>
                  <p className={`text-[10px] line-clamp-2 leading-relaxed ${
                    isSelected ? 'text-neutral-700 font-medium' : 'text-neutral-400'
                  }`}>
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Swatch Preview */}
        <div className="p-3 rounded-xl border border-white/10 flex items-center justify-between text-xs" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neutral-300" />
            <span className="text-neutral-300">Live Appearance Preview</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="px-2 py-0.5 rounded bg-white text-black font-bold">Contrast A++</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors shadow-sm"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
