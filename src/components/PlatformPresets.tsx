import React, { useRef } from 'react';
import { PlatformPresetConfig, PlatformPresetId } from '../types/video';
import { PLATFORM_PRESETS } from '../utils/presets';
import { DEMO_SCENES } from '../utils/demoFootage';
import {
  Smartphone,
  Check,
  Flame,
  MessageSquare,
  Video,
  Upload,
  Film,
  Sparkles,
  RefreshCw,
  FileVideo,
  Sliders,
  ChevronRight,
} from 'lucide-react';

interface PlatformPresetsProps {
  selectedPresetId: PlatformPresetId;
  onSelectPreset: (presetId: PlatformPresetId) => void;
  onFileUpload: (file: File) => void;
  activeVideoName: string;
  isCustomVideo: boolean;
  onSelectDemoScene: (sceneId: string) => void;
  activeDemoScene: string;
  onOpenColorist?: () => void;
  onOpenExport?: () => void;
}

export const PlatformPresets: React.FC<PlatformPresetsProps> = ({
  selectedPresetId,
  onSelectPreset,
  onFileUpload,
  activeVideoName,
  isCustomVideo,
  onSelectDemoScene,
  activeDemoScene,
  onOpenColorist,
  onOpenExport,
}) => {
  const presetList = Object.values(PLATFORM_PRESETS);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'TikTok':
        return <Flame className="w-3.5 h-3.5 text-pink-500" />;
      case 'Instagram':
        return <Video className="w-3.5 h-3.5 text-rose-400" />;
      case 'WhatsApp':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Smartphone className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
          SECTION 1: UNGGAN VIDEO (Unified with Presets for full portrait mode)
         ========================================================================= */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-amber-500/30 shadow-lg shadow-black/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white tracking-tight">
                Menu Unggah Video
              </span>
              <span className="block text-[10px] text-neutral-400">
                HDR10, Dolby Vision, Rec.2020 / HLG
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/30">
            Portrait Ready
          </span>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska,.mov,.mp4"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Upload Trigger Card */}
        {isCustomVideo ? (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <FileVideo className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-emerald-200 truncate">
                  {activeVideoName}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-900/60 px-1.5 py-0.5 rounded shrink-0">
                Aktif
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-1.5 px-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Ganti Video Lain</span>
              </button>
              <button
                onClick={() => onSelectDemoScene('cyberpunk_neon')}
                className="py-1.5 px-2.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Gunakan Demo
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 active:scale-[0.99] text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-amber-400/20 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4 stroke-[2.5]" />
              <span>Unggah Video dari HP / Galeri</span>
            </button>
            <p className="text-[10px] text-neutral-400 text-center">
              Mendukung video 4K/1080p dari iPhone Cinematic, Samsung Galaxy, atau kamera mirrorless.
            </p>

            {/* Demo Scene Chips if no custom video */}
            <div className="pt-1 border-t border-neutral-800/80">
              <div className="text-[10px] text-neutral-400 mb-1.5 flex items-center justify-between">
                <span>Atau coba dengan video demo HDR:</span>
                <span className="text-[9px] font-mono text-amber-400/80">1000 Nits</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_SCENES.map((scene) => {
                  const isCurrent = !isCustomVideo && activeDemoScene === scene.id;
                  return (
                    <button
                      key={scene.id}
                      onClick={() => onSelectDemoScene(scene.id)}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all cursor-pointer truncate text-left border ${
                        isCurrent
                          ? 'bg-amber-400/15 text-amber-300 border-amber-400/50 font-semibold'
                          : 'bg-neutral-900 hover:bg-neutral-800/80 text-neutral-400 border-neutral-800'
                      }`}
                      title={scene.description}
                    >
                      {scene.name.split(' (')[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 2: PRESET TARGET MEDSOS (TikTok, IG Reels, WhatsApp, HDR10)
         ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 px-0.5">
          <span>Target Platform & Standar Preset Medsos</span>
          <span className="text-[10px] font-mono text-neutral-500">Auto Tone-Mapping</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {presetList.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all active:scale-[0.98] cursor-pointer relative ${
                  isSelected
                    ? 'bg-neutral-800/90 border-amber-400 shadow-md shadow-amber-500/10'
                    : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/60 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(preset.platform)}
                      <span className="text-xs font-bold text-white tracking-tight">
                        {preset.name}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed pr-6">
                      {preset.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Check className="w-2.5 h-2.5 text-neutral-950 stroke-[3]" />
                    </div>
                  )}
                </div>

                {/* Metadata Row */}
                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                  <span className="text-amber-400 font-semibold">{preset.badge}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {preset.targetResolution.width}×{preset.targetResolution.height}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{preset.targetFps} FPS</span>
                  <span aria-hidden="true">·</span>
                  <span>{preset.targetBitrateMbps} Mbps</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: QUICK WORKFLOW ACTIONS
         ========================================================================= */}
      <div className="pt-2 flex items-center gap-2">
        {onOpenColorist && (
          <button
            onClick={onOpenColorist}
            className="flex-1 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Kustomisasi Warna & LUT</span>
            <ChevronRight className="w-3 h-3 text-neutral-400" />
          </button>
        )}
      </div>
    </div>
  );
};
