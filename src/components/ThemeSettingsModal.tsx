import React, { useState } from 'react';
import { X, Moon, Sparkles, Check, Sliders, Globe, GraduationCap, CheckCircle2 } from 'lucide-react';
import { PRESETS, type BlackIntensityPreset } from '../utils/themeManager';
import { SUPPORTED_LANGUAGES, type AppLanguage, t, setStoredLanguage } from '../utils/i18n';
import type { LearnerMethod } from '../solver/cubeTypes';

export interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
  language?: AppLanguage;
  onLanguageChange?: (lang: AppLanguage) => void;
  learnerMethod?: LearnerMethod;
  onLearnerMethodChange?: (method: LearnerMethod) => void;
  showReasons?: boolean;
  onToggleShowReasons?: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  intensity,
  onIntensityChange,
  language = 'en',
  onLanguageChange,
  learnerMethod = 'lbl',
  onLearnerMethodChange,
  showReasons = true,
  onToggleShowReasons,
}) => {
  const [activeTab, setActiveTab] = useState<'language' | 'theme' | 'learner'>('language');

  if (!isOpen) return null;

  const currentPreset: BlackIntensityPreset | null = 
    intensity === 100 ? 'oled' :
    intensity === 85 ? 'obsidian' :
    intensity === 70 ? 'charcoal' :
    intensity === 50 ? 'graphite' : null;

  const handleSelectLanguage = (lang: AppLanguage) => {
    setStoredLanguage(lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-white/20 p-4 sm:p-6 shadow-2xl flex flex-col gap-4 text-white max-h-[92vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md">
              <Sliders className="w-4 h-4 text-black stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                {t('settings_title', language)}
              </h2>
              <p className="text-xs text-neutral-400">
                {t('settings_subtitle', language)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div 
          className="flex items-center p-1 rounded-xl border border-white/15 gap-1 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-canvas)' }}
        >
          <button
            onClick={() => setActiveTab('language')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'language'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{t('tab_language', language)}</span>
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'theme'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{t('tab_appearance', language)}</span>
          </button>

          <button
            onClick={() => setActiveTab('learner')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'learner'
                ? 'bg-white text-black shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>{t('tab_learner', language)}</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'language' && (
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                {t('lang_section_title', language)}
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {t('lang_section_desc', language)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SUPPORTED_LANGUAGES.map((item) => {
                const isSelected = language === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectLanguage(item.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-white text-black border-white shadow-xl scale-[1.01]'
                        : 'border-white/15 text-neutral-200 hover:border-white/40 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black tracking-tight">{item.label}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-black fill-white" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-neutral-600 inline-block" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={isSelected ? 'text-neutral-700 font-medium' : 'text-neutral-400'}>
                        {item.subLabel}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        isSelected ? 'bg-black/10 text-black' : 'bg-white/10 text-neutral-300'
                      }`}>
                        {item.id}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl border border-white/10 text-[11px] text-neutral-400 leading-relaxed" style={{ backgroundColor: 'var(--bg-canvas)' }}>
              🔒 <strong>Settings Exclusive:</strong> Multi-language preferences can be modified only within this Settings menu, as requested.
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="flex flex-col gap-4 py-1">
            {/* Live Intensity Gauge */}
            <div className="flex flex-col gap-2 p-3.5 rounded-xl border border-white/10" style={{ backgroundColor: 'var(--bg-canvas)' }}>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-neutral-300" />
                  {t('theme_section_title', language)}:
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
                {t('quick_presets', language)}
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
          </div>
        )}

        {activeTab === 'learner' && (
          <div className="flex flex-col gap-3.5 py-1">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                {t('learner_method_title', language)}
              </h3>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                {t('learner_method_desc', language)}
              </p>
            </div>

            {/* Method Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => onLearnerMethodChange && onLearnerMethodChange('lbl')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  learnerMethod === 'lbl'
                    ? 'bg-white text-black border-white shadow-xl'
                    : 'border-white/15 text-neutral-200 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Beginner Layer-by-Layer</span>
                  {learnerMethod === 'lbl' && <CheckCircle2 className="w-4 h-4 text-black fill-white" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${
                  learnerMethod === 'lbl' ? 'text-neutral-700 font-medium' : 'text-neutral-400'
                }`}>
                  {t('learner_lbl_desc', language)}
                </p>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded self-start ${
                  learnerMethod === 'lbl' ? 'bg-black/10 text-black' : 'bg-white/10 text-neutral-300'
                }`}>
                  7 Stages • Human Logic
                </span>
              </button>

              <button
                onClick={() => onLearnerMethodChange && onLearnerMethodChange('cfop')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  learnerMethod === 'cfop'
                    ? 'bg-white text-black border-white shadow-xl'
                    : 'border-white/15 text-neutral-200 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black">Advanced CFOP (Fridrich)</span>
                  {learnerMethod === 'cfop' && <CheckCircle2 className="w-4 h-4 text-black fill-white" />}
                </div>
                <p className={`text-[11px] leading-relaxed ${
                  learnerMethod === 'cfop' ? 'text-neutral-700 font-medium' : 'text-neutral-400'
                }`}>
                  {t('learner_cfop_desc', language)}
                </p>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded self-start ${
                  learnerMethod === 'cfop' ? 'bg-black/10 text-black' : 'bg-white/10 text-neutral-300'
                }`}>
                  4 Phases • Cross F2L OLL PLL
                </span>
              </button>
            </div>

            {/* Toggle Reasons */}
            <div className="p-3 rounded-xl border border-white/15 flex items-center justify-between gap-3" style={{ backgroundColor: 'var(--bg-canvas)' }}>
              <div>
                <h4 className="text-xs font-bold text-white">{t('reasons_toggle_title', language)}</h4>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  {t('reasons_toggle_desc', language)}
                </p>
              </div>
              <button
                onClick={onToggleShowReasons}
                className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  showReasons ? 'bg-white' : 'bg-neutral-800 border border-white/20'
                }`}
              >
                <span className={`w-5 h-5 rounded-full transition-transform transform ${
                  showReasons ? 'translate-x-6 bg-black' : 'translate-x-0 bg-neutral-400'
                }`} />
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end pt-2 border-t border-white/10 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors shadow-md"
          >
            {t('btn_apply_close', language)}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SettingsModal = ThemeSettingsModal;
