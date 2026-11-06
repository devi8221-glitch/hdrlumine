import React, { useState, useRef } from 'react';
import { PlatformPresetConfig, ColorGradingSettings } from '../types/video';
import { ParsedLUT } from '../utils/lutParser';
import { saveVideoToDevice, shareVideoToApps } from '../utils/fileSaver';
import {
  Download,
  Share2,
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
  Smartphone,
  Sliders,
  Film,
  FileCheck,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface VideoReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string | null;
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number;
  preset: PlatformPresetConfig;
  settings: ColorGradingSettings;
  activeLUT: ParsedLUT | null;
  onReEdit: () => void;
}

export const VideoReviewModal: React.FC<VideoReviewModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  fileName,
  fileSizeBytes,
  durationSeconds,
  preset,
  settings,
  activeLUT,
  onReEdit,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!isOpen || !videoUrl) return null;

  const fileSizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(2);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleDownload = async () => {
    setIsSaving(true);
    setShareFeedback('Menyimpan ke perangkat...');
    try {
      const res = await saveVideoToDevice(videoUrl, fileName, {
        onProgressText: (t) => setShareFeedback(t),
      });
      setIsSaving(false);
      if (res.success) {
        setIsDownloaded(true);
        setShareFeedback(res.message);
        setTimeout(() => setIsDownloaded(false), 5000);
      } else {
        setShareFeedback(res.message);
      }
    } catch (err: any) {
      setIsSaving(false);
      setShareFeedback(`Gagal menyimpan: ${err?.message || 'Kesalahan sistem'}`);
    }
  };

  // Native Web Share API (Direct share to WhatsApp, Instagram, TikTok on Android/iOS)
  const handleShare = async () => {
    setShareFeedback('Menyiapkan video untuk dibagikan...');
    try {
      const res = await shareVideoToApps(videoUrl, fileName, preset.platform);
      setShareFeedback(res.message);
    } catch {
      setShareFeedback('Gagal membagikan video.');
    }
    setTimeout(() => setShareFeedback(null), 5000);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <FileCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Review Hasil Master Video</h3>
              <p className="text-[11px] text-neutral-400 font-mono">
                {fileName} · {fileSizeMb} MB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Body (Split 2 Columns on desktop: Left Player, Right Specs & Save Actions) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Video Review Player */}
          <div className="md:col-span-6 flex flex-col bg-black rounded-xl overflow-hidden border border-neutral-800 shadow-xl relative min-h-[340px]">
            <div className="flex-1 flex items-center justify-center relative group">
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                autoPlay
                loop
                muted={isMuted}
                onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                className="max-h-[380px] w-full object-contain cursor-pointer"
                onClick={togglePlay}
              />

              {/* Center Play overlay on hover */}
              <button
                onClick={togglePlay}
                className="absolute w-12 h-12 rounded-full bg-neutral-950/70 border border-neutral-600 text-amber-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <div className="absolute top-2 left-2 px-2 py-0.5 bg-neutral-950/80 rounded text-[10px] font-mono text-emerald-400 border border-emerald-500/40">
                PROCESSED MASTER
              </div>
            </div>

            {/* Video Transport Mini Bar */}
            <div className="p-2.5 bg-neutral-950/90 border-t border-neutral-800 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-200 transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = 0;
                  }}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Ulangi"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>

              <div className="text-[11px] font-mono text-neutral-400 tabular-nums">
                {formatTime(currentTime)} / {formatTime(durationSeconds)}
              </div>
            </div>
          </div>

          {/* Right Column: Video Specs & Save/Share Actions */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-4">
            {/* Specs Summary Card */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-amber-400" />
                  <span>Spesifikasi File Master</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400">{preset.platform} Ready</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono pt-2 border-t border-neutral-800/80 text-neutral-300">
                <div>
                  <span className="text-neutral-500 text-[11px] block">Ukuran File:</span>
                  <span className="text-amber-400 font-bold">{fileSizeMb} MB</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[11px] block">Resolusi:</span>
                  <span className="text-white">{preset.targetResolution.width}×{preset.targetResolution.height} (9:16)</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[11px] block">Framerate:</span>
                  <span className="text-white">{preset.targetFps} FPS</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[11px] block">Tone Mapping:</span>
                  <span className="text-white uppercase">{settings.toneMapping}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[11px] block">LUT 3D:</span>
                  <span className="text-white truncate block">
                    {activeLUT && settings.lutId !== 'none' ? activeLUT.name : 'Bypass (Parametrik)'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[11px] block">Anti-Washout:</span>
                  <span className="text-emerald-400 font-semibold">Aktif (Rec.709)</span>
                </div>
              </div>
            </div>

            {/* Quick Share Feedback */}
            {shareFeedback && (
              <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{shareFeedback}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              {/* Primary: Save to Gallery / Download */}
              <button
                onClick={handleDownload}
                disabled={isSaving}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-75 text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 transition-all cursor-pointer active:scale-98"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>Menyimpan ke Perangkat...</span>
                  </>
                ) : isDownloaded ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3] text-neutral-950" />
                    <span>Tersimpan di Perangkat / Galeri!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Simpan ke Galeri / Unduh File (.mp4)</span>
                  </>
                )}
              </button>

              {/* Secondary: Direct Share to WhatsApp / Instagram / TikTok */}
              <button
                onClick={handleShare}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-semibold flex items-center justify-center gap-2 border border-neutral-700 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Bagikan Langsung (WhatsApp / IG / TikTok)</span>
              </button>

              {/* Tertiary: Continue Re-editing */}
              <button
                onClick={() => {
                  onClose();
                  onReEdit();
                }}
                className="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 pt-1"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Ulang / Lanjut Sesuaikan Parameter</span>
              </button>

              {/* Quaternary: Download APK standalone */}
              <a
                href="/LuminaHDR_v1.0.apk"
                download="LuminaHDR_v1.0.apk"
                className="w-full py-2 text-[11px] text-emerald-400/90 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1.5 border-t border-neutral-800/80 mt-1 pt-2.5"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Aplikasi LuminaHDR.apk (17 MB Offline)</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
