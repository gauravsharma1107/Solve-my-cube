import React, { useEffect, useState } from 'react';
import { Box, Camera, Edit3, Timer, Download, Sliders } from 'lucide-react';

export type AppTab = 'solver' | 'editor' | 'timer';

interface NavbarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenScanner: () => void;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenScanner,
  onOpenSettings
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Top Header Bar */}
      <header 
        className="w-full sticky top-0 z-40 px-2.5 sm:px-6 py-2 sm:py-2.5 backdrop-blur-md border-b transition-colors flex-shrink-0"
        style={{ 
          backgroundColor: 'var(--bg-surface)', 
          borderColor: 'var(--border-subtle)' 
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-sm flex-shrink-0">
              <Box className="w-4 h-4 sm:w-5 sm:h-5 text-black stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xs sm:text-base font-black text-white tracking-wider flex items-center gap-1 sm:gap-1.5 m-0 font-mono">
                CUBESYNC <span className="text-[9px] sm:text-[10px] font-mono px-1 py-0.2 rounded bg-white/10 text-white border border-white/20">3D</span>
              </h1>
              <p className="text-[10px] text-neutral-400 hidden sm:block">
                Precision Rubik's Cube Solver & Scanner
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav 
            className="hidden md:flex items-center p-1 rounded-xl border"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-subtle)' 
            }}
          >
            <button
              onClick={() => onSelectTab('solver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'solver'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Solver</span>
            </button>

            <button
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white hover:bg-white/10 border border-white/20 transition-all mx-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scan</span>
            </button>

            <button
              onClick={() => onSelectTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'editor'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Cube Input</span>
            </button>

            <button
              onClick={() => onSelectTab('timer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'timer'
                  ? 'bg-white text-black shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Timer</span>
            </button>
          </nav>

          {/* Mobile Header Navigation Tabs */}
          <nav 
            aria-label="Mobile Navigation"
            className="flex md:hidden items-center p-0.5 rounded-xl border gap-0.5"
            style={{ 
              backgroundColor: 'var(--bg-card)', 
              borderColor: 'var(--border-subtle)' 
            }}
          >
            <button
              onClick={() => onSelectTab('solver')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'solver'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="3D Solver"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Solve</span>
            </button>

            <button
              onClick={onOpenScanner}
              className="px-1.5 py-1 rounded-lg text-[11px] font-bold text-white hover:bg-white/10 transition-all flex items-center gap-1"
              title="Camera Scan"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Scan</span>
            </button>

            <button
              onClick={() => onSelectTab('editor')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'editor'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Cube Input"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Input</span>
            </button>

            <button
              onClick={() => onSelectTab('timer')}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                activeTab === 'timer'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Timer"
            >
              <Timer className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Timer</span>
            </button>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Black Intensity / Theme Settings */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-white/15 text-neutral-300 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
              title="Adjust Black Theme Intensity"
            >
              <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="hidden sm:inline text-[11px] font-mono">Theme</span>
            </button>

            {isInstallable && (
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-black font-bold text-[11px] hover:bg-neutral-200 transition-colors shadow-sm"
                title="Install PWA App"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Install</span>
              </button>
            )}

            <div
              className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                isOnline
                  ? 'bg-white/5 border-white/20 text-neutral-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-white' : 'bg-amber-400'}`} />
              <span>{isOnline ? 'Ready' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar: active only when NOT on solver tab to prevent bottom dock obstruction */}
      {activeTab !== 'solver' && (
        <nav 
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl flex items-center justify-around transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-surface)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <button
            onClick={() => onSelectTab('solver')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              (activeTab as string) === 'solver'
                ? 'text-white font-black bg-white/15'
                : 'text-neutral-400 hover:text-white font-medium'
            }`}
          >
            <Box className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-mono tracking-tight">Solver</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="flex-1 flex flex-col items-center justify-center py-1 px-2 mx-1 rounded-2xl bg-white text-black font-bold shadow-md transition-transform active:scale-95"
          >
            <div className="w-7 h-7 rounded-xl bg-black flex items-center justify-center text-white shadow-md -mt-3.5">
              <Camera className="w-4 h-4 text-white stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-bold font-mono text-black mt-0.5">Scan</span>
          </button>

          <button
            onClick={() => onSelectTab('editor')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'editor'
                ? 'text-white font-black bg-white/15'
                : 'text-neutral-400 hover:text-white font-medium'
            }`}
          >
            <Edit3 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-mono tracking-tight">Input</span>
          </button>

          <button
            onClick={() => onSelectTab('timer')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              activeTab === 'timer'
                ? 'text-white font-black bg-white/15'
                : 'text-neutral-400 hover:text-white font-medium'
            }`}
          >
            <Timer className="w-5 h-5 mb-0.5" />
            <span className="text-[10px] font-mono tracking-tight">Timer</span>
          </button>
        </nav>
      )}
    </>
  );
};
