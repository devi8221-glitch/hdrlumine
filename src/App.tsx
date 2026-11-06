import React, { useState } from 'react';
import {
  ColorGradingSettings,
  SplitViewMode,
} from './types/video';
import { TIKTOK_PRESET, INSTAGRAM_PRESET, WHATSAPP_PRESET } from './utils/presets';
import { HDROutputMode } from './utils/hdrShader';
import { BUILTIN_LUTS, ParsedLUT, parseCubeLUT } from './utils/lutParser';
import { Header } from './components/Header';
import { VideoPlayer, PlatformTarget } from './components/VideoPlayer';
import { ExportModal } from './components/ExportModal';
import { VideoReviewModal } from './components/VideoReviewModal';
import { APKInstallModal } from './components/APKInstallModal';
import {
  Sparkles,
  Flame,
  Video as VideoIcon,
  MessageSquare,
  Download,
  RotateCcw,
  Check,
  Palette,
  Plus,
} from 'lucide-react';

export default function App() {
  // Simplified Platform Target: TikTok, Instagram, WhatsApp
  const [activePlatform, setActivePlatform] = useState<PlatformTarget>('tiktok');
  const [outputMode, setOutputMode] = useState<HDROutputMode>('hdr10');
  const [splitMode, setSplitMode] = useState<SplitViewMode>('split_wipe');
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [sourceVideoRef, setSourceVideoRef] = useState<HTMLVideoElement | null>(null);

  // Preset LUTs state
  const [activeLUT, setActiveLUT] = useState<ParsedLUT | null>(null);
  const [customLuts, setCustomLuts] = useState<ParsedLUT[]>([]);

  // Simple HDR Tuning Settings
  const [settings, setSettings] = useState<ColorGradingSettings>({
    ...TIKTOK_PRESET.settings,
    lutId: 'none',
    lutIntensity: 1.0,
  });

  const [videoMeta, setVideoMeta] = useState<{
    duration: number;
    width: number;
    height: number;
    name: string;
  }>({
    duration: 15,
    width: 1080,
    height: 1920,
    name: 'Sunset_Golden_Hour_HDR.mp4',
  });

  // Modals & Export Flow
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [savedSplitMode, setSavedSplitMode] = useState<SplitViewMode>('split_wipe');
  const [isAPKModalOpen, setIsAPKModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<{
    blobUrl: string;
    fileName: string;
    sizeBytes: number;
    durationSeconds: number;
  } | null>(null);

  const handleOpenExport = () => {
    setSavedSplitMode(splitMode);
    setSplitMode('off'); // Force 100% full-frame mastered HDR render during export
    setIsExportOpen(true);
  };

  const handleCloseExport = () => {
    setSplitMode(savedSplitMode);
    setIsExportOpen(false);
  };

  // Video File Management
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [activeDemoScene, setActiveDemoScene] = useState<string>('coastal_sunset');
  const [activeVideoName, setActiveVideoName] = useState<string>('Sunset_Golden_Hour_HDR.mp4');
  const [isCustomVideo, setIsCustomVideo] = useState<boolean>(false);

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    setIsCustomVideo(true);
    setActiveVideoName(file.name);
  };

  const handleSelectDemoScene = (sceneId: string) => {
    setUploadedFile(null);
    setIsCustomVideo(false);
    setActiveDemoScene(sceneId);
    setActiveVideoName(sceneId === 'cinematic_night' ? 'Dusk_City_Skyline.mp4' : 'Sunset_Golden_Hour_HDR.mp4');
  };

  const allAvailableLUTs = [...BUILTIN_LUTS, ...customLuts];

  const handleSelectLUT = (lut: ParsedLUT | null) => {
    setActiveLUT(lut);
    setSettings((s) => ({
      ...s,
      lutId: lut ? lut.id : 'none',
    }));
  };

  const handleLUTUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseCubeLUT(text, file.name);
      setCustomLuts((prev) => [parsed, ...prev.filter((l) => l.name !== parsed.name)]);
      setActiveLUT(parsed);
      setSettings((s) => ({ ...s, lutId: parsed.id }));
    } catch (err: any) {
      console.warn('LUT upload error:', err);
    }
  };

  const handleSelectPlatform = (platform: PlatformTarget) => {
    setActivePlatform(platform);
    const base =
      platform === 'tiktok'
        ? TIKTOK_PRESET.settings
        : platform === 'instagram'
        ? INSTAGRAM_PRESET.settings
        : WHATSAPP_PRESET.settings;

    if (platform === 'tiktok') {
      setOutputMode('hdr10');
    } else if (platform === 'instagram') {
      setOutputMode('dolby_vision');
    } else if (platform === 'whatsapp') {
      setOutputMode('hdr10');
    }

    setSettings((prev) => ({
      ...base,
      lutId: prev.lutId,
      lutIntensity: prev.lutIntensity,
    }));
  };

  const activePresetConfig =
    activePlatform === 'tiktok'
      ? TIKTOK_PRESET
      : activePlatform === 'instagram'
      ? INSTAGRAM_PRESET
      : WHATSAPP_PRESET;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-neutral-950 text-neutral-100 font-sans select-none">
      {/* Top Header Bar */}
      {!isFullscreen && (
        <Header
          activePresetName={`${activePresetConfig.name} (${activePresetConfig.badge})${
            activeLUT ? ` • ${activeLUT.name.split(' ')[0]}` : ''
          }`}
          isCustom={false}
          onOpenAPKInstall={() => setIsAPKModalOpen(true)}
        />
      )}

      {/* Main Studio Viewport (Spacious Hero Preview) */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0 relative">
        <main
          className={`flex flex-col overflow-hidden relative transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-0 z-50 p-0 bg-black'
              : 'flex-1 p-1.5 sm:p-2.5 min-h-0'
          }`}
        >
          <div className="flex-1 relative min-h-0 w-full h-full flex flex-col">
            <VideoPlayer
              outputMode={outputMode}
              onOutputModeChange={setOutputMode}
              activePlatform={activePlatform}
              onSelectPlatform={handleSelectPlatform}
              activeLUT={activeLUT}
              settings={settings}
              splitMode={splitMode}
              onSplitModeChange={setSplitMode}
              onCanvasReady={setCanvasRef}
              onSourceVideoReady={setSourceVideoRef}
              onVideoMetaLoaded={setVideoMeta}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              uploadedFile={uploadedFile}
              onFileUpload={handleFileUpload}
              activeDemoScene={activeDemoScene}
              onSelectDemoScene={handleSelectDemoScene}
            />
          </div>
        </main>

        {/* BOTTOM: Simplified Platform Presets & Quick Controls */}
        {!isFullscreen && (
          <aside className="bg-neutral-900/95 border-t border-neutral-800 p-2.5 sm:p-3 shrink-0 z-10 backdrop-blur-md">
            <div className="max-w-5xl mx-auto space-y-2.5">
              {/* Row 1: Simplified Preset Cards (TikTok, Instagram, WhatsApp) */}
              <div className="grid grid-cols-3 gap-2">
                {/* TikTok Preset Card */}
                <button
                  onClick={() => handleSelectPlatform('tiktok')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between gap-1.5 relative ${
                    activePlatform === 'tiktok'
                      ? 'bg-neutral-800/90 border-pink-500 shadow-md shadow-pink-500/15'
                      : 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-pink-500/15 border border-pink-500/30 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">TikTok</span>
                        <span className="text-[9px] font-mono text-pink-300 bg-pink-950/60 px-1 rounded hidden sm:inline">
                          HDR10
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        1080p · Punchy 1000 Nits
                      </span>
                    </div>
                  </div>
                  {activePlatform === 'tiktok' && (
                    <div className="w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* Instagram Reels Preset Card */}
                <button
                  onClick={() => handleSelectPlatform('instagram')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between gap-1.5 relative ${
                    activePlatform === 'instagram'
                      ? 'bg-neutral-800/90 border-amber-400 shadow-md shadow-amber-400/15'
                      : 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-rose-500/15 to-amber-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                      <VideoIcon className="w-4 h-4 text-rose-300" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">Instagram</span>
                        <span className="text-[9px] font-mono text-amber-300 bg-amber-950/60 px-1 rounded hidden sm:inline">
                          Reels
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        Dolby Vision · HLG
                      </span>
                    </div>
                  </div>
                  {activePlatform === 'instagram' && (
                    <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-neutral-950 stroke-[3]" />
                    </div>
                  )}
                </button>

                {/* WhatsApp HD Preset Card */}
                <button
                  onClick={() => handleSelectPlatform('whatsapp')}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between gap-1.5 relative ${
                    activePlatform === 'whatsapp'
                      ? 'bg-neutral-800/90 border-emerald-500 shadow-md shadow-emerald-500/15'
                      : 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">WhatsApp</span>
                        <span className="text-[9px] font-mono text-emerald-300 bg-emerald-950/60 px-1 rounded hidden sm:inline">
                          HD
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        Anti-Luntur · Bebas Pucat
                      </span>
                    </div>
                  </div>
                  {activePlatform === 'whatsapp' && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </div>
                  )}
                </button>
              </div>

              {/* Row 2: Menu Preset Gaya & 3D LUT (Look-Up Tables) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 scrollbar-none text-xs">
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 shrink-0 pr-1 border-r border-neutral-800">
                  <Palette className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Preset LUT:</span>
                </div>

                {/* Natural HDR (Tanpa LUT) */}
                <button
                  onClick={() => handleSelectLUT(null)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                    !activeLUT || settings.lutId === 'none'
                      ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300 shadow-sm'
                      : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Natural HDR</span>
                </button>

                {/* Procedural & Custom Presets */}
                {allAvailableLUTs.map((lut) => {
                  const isSelected = activeLUT?.id === lut.id && settings.lutId !== 'none';
                  const dotColor =
                    lut.id.includes('teal_orange')
                      ? 'bg-cyan-400'
                      : lut.id.includes('kodak_500t')
                      ? 'bg-amber-500'
                      : lut.id.includes('golden_hour')
                      ? 'bg-orange-400'
                      : lut.id.includes('cyberpunk')
                      ? 'bg-fuchsia-400'
                      : lut.id.includes('emerald_matrix')
                      ? 'bg-emerald-400'
                      : lut.id.includes('fuji_film')
                      ? 'bg-rose-300'
                      : lut.id.includes('vintage_vibe')
                      ? 'bg-yellow-500'
                      : lut.id.includes('noir')
                      ? 'bg-neutral-300'
                      : 'bg-amber-400';

                  const shortName = lut.name
                    .replace(' Blockbuster', '')
                    .replace(' Film', '')
                    .replace(' Nights', '')
                    .replace(' Pastels', '')
                    .replace(' Warmth', '')
                    .replace(' Moody', '')
                    .replace(' (B&W)', '');

                  return (
                    <button
                      key={lut.id}
                      onClick={() => handleSelectLUT(lut)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition-all active:scale-95 shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-400 text-neutral-950 font-bold border-amber-300 shadow-sm'
                          : 'bg-neutral-950/80 border-neutral-800 text-neutral-300 hover:text-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <span>{shortName}</span>
                    </button>
                  );
                })}

                {/* Upload Custom .CUBE LUT */}
                <label className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-950/80 border border-dashed border-neutral-700 hover:border-amber-400 text-neutral-400 hover:text-amber-400 transition-all shrink-0 flex items-center gap-1 cursor-pointer">
                  <Plus className="w-3 h-3" />
                  <span>+ .CUBE</span>
                  <input
                    type="file"
                    accept=".cube,.txt"
                    onChange={handleLUTUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Row 3: Sliders & Quick Export Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                {/* Minimal Sliders */}
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  {/* Intensitas LUT (Shown when LUT is active) */}
                  {activeLUT && settings.lutId !== 'none' && (
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400">
                        <span>Intensitas Preset</span>
                        <span className="font-mono text-amber-400 tabular-nums">
                          {Math.round(settings.lutIntensity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={settings.lutIntensity}
                        onChange={(e) =>
                          setSettings((s) => ({ ...s, lutIntensity: parseFloat(e.target.value) }))
                        }
                        className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                      />
                    </div>
                  )}

                  {/* Dynamic Contrast */}
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Kontras HDR</span>
                      <span className="font-mono text-amber-400 tabular-nums">{settings.contrast.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.9"
                      max="1.35"
                      step="0.02"
                      value={settings.contrast}
                      onChange={(e) => setSettings((s) => ({ ...s, contrast: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  {/* Rec.2020 Color Volume */}
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Warna Rec.2020</span>
                      <span className="font-mono text-amber-400 tabular-nums">{settings.saturation.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="1.4"
                      step="0.02"
                      value={settings.saturation}
                      onChange={(e) => setSettings((s) => ({ ...s, saturation: parseFloat(e.target.value) }))}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  {/* Kejernihan Ultra & Micro-Contrast (Crystal Clear Detail Enhancement) */}
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400">
                      <span>Kejernihan Ultra</span>
                      <span className="font-mono text-amber-400 tabular-nums">
                        {Math.round((settings.clarity ?? 0.35) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="0.80"
                      step="0.05"
                      value={settings.clarity ?? 0.35}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, clarity: parseFloat(e.target.value) }))
                      }
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  {/* Reset button */}
                  <button
                    onClick={() => {
                      if (activePlatform === 'tiktok')
                        setSettings({
                          ...TIKTOK_PRESET.settings,
                          lutId: activeLUT ? activeLUT.id : 'none',
                          lutIntensity: 1.0,
                        });
                      else if (activePlatform === 'instagram')
                        setSettings({
                          ...INSTAGRAM_PRESET.settings,
                          lutId: activeLUT ? activeLUT.id : 'none',
                          lutIntensity: 1.0,
                        });
                      else
                        setSettings({
                          ...WHATSAPP_PRESET.settings,
                          lutId: activeLUT ? activeLUT.id : 'none',
                          lutIntensity: 1.0,
                        });
                    }}
                    className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all cursor-pointer shrink-0 mt-3 sm:mt-0"
                    title="Reset Pengaturan"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Primary Action Button */}
                <div className="w-full sm:w-auto shrink-0">
                  <button
                    onClick={handleOpenExport}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer ${
                      activePlatform === 'tiktok'
                        ? 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-pink-500/25'
                        : activePlatform === 'instagram'
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white shadow-rose-500/25'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/25'
                    }`}
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Ekspor Video {activePresetConfig.platform}</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Export Settings & Progress Modal */}
      {isExportOpen && (
        <ExportModal
          isOpen={isExportOpen}
          onClose={handleCloseExport}
          preset={activePresetConfig}
          settings={settings}
          canvas={canvasRef}
          videoElement={sourceVideoRef}
          videoDuration={videoMeta.duration}
          videoFileName={videoMeta.name}
          onOpenFFmpeg={() => {}}
          onOpenReview={(res) => {
            handleCloseExport();
            setReviewResult(res);
          }}
        />
      )}

      {/* Review Modal After Export */}
      {reviewResult && (
        <VideoReviewModal
          isOpen={!!reviewResult}
          onClose={() => setReviewResult(null)}
          videoUrl={reviewResult.blobUrl}
          fileName={reviewResult.fileName}
          fileSizeBytes={reviewResult.sizeBytes}
          durationSeconds={reviewResult.durationSeconds}
          preset={activePresetConfig}
          settings={settings}
          activeLUT={activeLUT}
          onReEdit={() => {
            setReviewResult(null);
            setIsExportOpen(true);
          }}
        />
      )}

      {/* Standalone Android APK Download & Install Modal */}
      <APKInstallModal
        isOpen={isAPKModalOpen}
        onClose={() => setIsAPKModalOpen(false)}
      />
    </div>
  );
}
