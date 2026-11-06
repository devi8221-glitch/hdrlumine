import React from 'react';
import { Sparkles, HelpCircle, Terminal, Smartphone, Download } from 'lucide-react';

interface HeaderProps {
  onOpenFFmpeg?: () => void;
  onOpenWhyWashout?: () => void;
  onOpenExport?: () => void;
  onOpenAPKInstall?: () => void;
  activePresetName: string;
  isCustom?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenFFmpeg,
  onOpenWhyWashout,
  onOpenExport,
  onOpenAPKInstall,
  activePresetName,
  isCustom,
}) => {
  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4 px-3 py-2 sm:px-5 sm:py-3 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800/80 shrink-0 z-30 select-none">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-2 sm:gap-3 whitespace-nowrap shrink-0">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-neutral-950 font-bold shadow-md shadow-amber-500/20 active:scale-95 transition-transform">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-950 stroke-[2.5]" />
        </div>
        <div className="flex items-baseline gap-1.5 sm:gap-2">
          <span className="text-sm sm:text-base font-extrabold tracking-tight text-white">LuminaHDR</span>
          <span className="text-[10px] text-amber-400/90 font-mono hidden xs:inline px-1 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
            PRO
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation / Quick Tools (Desktop & Tablet) */}
      <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-neutral-400">
        <button
          onClick={onOpenWhyWashout}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Solusi Anti-Luntur</span>
        </button>
        <button
          onClick={onOpenFFmpeg}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95"
        >
          <Terminal className="w-3.5 h-3.5 text-neutral-400" />
          <span>FFmpeg CLI</span>
        </button>
        <div className="hidden lg:flex items-center gap-2 text-neutral-400 font-mono text-[11px] whitespace-nowrap">
          <span>Preset:</span>
          <span className="text-amber-400 font-semibold">{activePresetName}</span>
        </div>
      </nav>

      {/* Zone 3: APK Android Download & Studio Mode Badge */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAPKInstall}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/10"
          title="Unduh Aplikasi Android Lengkap (17 MB Offline Standalone APK)"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Unduh APK</span>
          <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
            17 MB
          </span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-[11px] font-mono text-neutral-300">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold text-white">{activePresetName}</span>
        </div>
      </div>
    </header>
  );
};
