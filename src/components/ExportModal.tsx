import React, { useState } from 'react';
import { PlatformPresetConfig, ColorGradingSettings } from '../types/video';
import { VideoStreamRecorder } from '../utils/videoExporter';
import {
  Download,
  X,
  Check,
  Loader2,
  FileVideo,
  Terminal,
  Sparkles,
  Sliders,
  Settings2,
  Share2,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: PlatformPresetConfig;
  settings: ColorGradingSettings;
  canvas: HTMLCanvasElement | null;
  videoElement: HTMLVideoElement | null;
  videoDuration: number;
  videoFileName: string;
  onOpenFFmpeg: () => void;
  onOpenReview: (result: {
    blobUrl: string;
    fileName: string;
    sizeBytes: number;
    durationSeconds: number;
  }) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  preset,
  settings,
  canvas,
  videoElement,
  videoDuration,
  videoFileName,
  onOpenFFmpeg,
  onOpenReview,
}) => {
  const [recorder] = useState<VideoStreamRecorder>(() => new VideoStreamRecorder());
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentSec, setCurrentSec] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Save Video Settings State
  const defaultBaseName = videoFileName
    ? videoFileName.replace(/\.[^/.]+$/, '')
    : `master_${preset.id}`;
  const [customFileName, setCustomFileName] = useState<string>(`${defaultBaseName}_tone_mapped.mp4`);
  const [targetBitrateMbps, setTargetBitrateMbps] = useState<number>(14); // 14 Mbps: smooth hardware encoding on mobile without dropped frames
  const [targetFps, setTargetFps] = useState<number>(30); // 30 FPS default for mobile stutter-free playback
  const [resolutionChoice, setResolutionChoice] = useState<'preset' | '720p' | '1080p' | 'source'>('preset');
  const [audioBitrate, setAudioBitrate] = useState<'320k' | '192k' | '128k' | 'mute'>('192k');
  const [activeTab, setActiveTab] = useState<'quick' | 'settings'>('quick');

  if (!isOpen) return null;

  const durationSec = Math.max(3, Math.min(60, Math.round(videoDuration)));
  const estimatedSizeMb = ((targetBitrateMbps * durationSec) / 8).toFixed(1);

  const startExport = async () => {
    if (!canvas) {
      setErrorMessage('Canvas video belum siap.');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    setCurrentSec(0);
    setErrorMessage(null);

    // If using video element, ensure frame-accurate sync before recording starts
    if (videoElement) {
      videoElement.pause();
      // Seek to 0 and wait for seeked event so first frame is cleanly buffered
      await new Promise<void>((resolve) => {
        let done = false;
        const onSeeked = () => {
          if (done) return;
          done = true;
          videoElement.removeEventListener('seeked', onSeeked);
          resolve();
        };
        videoElement.addEventListener('seeked', onSeeked, { once: true });
        videoElement.currentTime = 0;
        setTimeout(onSeeked, 300);
      });

      try {
        await videoElement.play();
      } catch (e) {
        console.warn('Playback resume error:', e);
      }
    }

    let exportWidth = preset.targetResolution.width;
    let exportHeight = preset.targetResolution.height;
    if (resolutionChoice === '720p') {
      exportWidth = 720;
      exportHeight = 1280;
    } else if (resolutionChoice === '1080p') {
      exportWidth = 1080;
      exportHeight = 1920;
    }

    const safeName = customFileName.trim() || `master_${preset.id}.mp4`;

    recorder.startRecording(canvas, audioBitrate === 'mute' ? null : videoElement, {
      durationSeconds: durationSec,
      fps: targetFps,
      width: exportWidth,
      height: exportHeight,
      fileName: safeName,
      bitrateMbps: targetBitrateMbps,
      onProgress: (p, cur) => {
        setProgress(p);
        setCurrentSec(cur);
      },
      onComplete: async (url, finalName) => {
        setIsExporting(false);
        setProgress(100);

        // Fetch blob to know accurate file size in bytes
        let sizeBytes = 0;
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          sizeBytes = blob.size;
        } catch {
          sizeBytes = parseFloat(estimatedSizeMb) * 1024 * 1024;
        }

        onClose();
        // Immediately launch post-edit Review Modal!
        onOpenReview({
          blobUrl: url,
          fileName: finalName,
          sizeBytes,
          durationSeconds: durationSec,
        });
      },
      onError: (msg) => {
        setIsExporting(false);
        setErrorMessage(msg);
      },
    });
  };

  const handleCancelExport = () => {
    recorder.cancel();
    setIsExporting(false);
    setProgress(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Ekspor & Pengaturan Simpan Video</h3>
              <p className="text-xs text-neutral-400">
                Pilih format & kualitas, lalu review sebelum disimpan ke galeri.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Ringkasan Cepat vs Pengaturan Save Lanjutan */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 px-6 pt-3 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('quick')}
            className={`pb-2.5 transition-colors cursor-pointer ${
              activeTab === 'quick'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Ringkasan Ekspor ({preset.platform})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2.5 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Pengaturan File & Kualitas</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {activeTab === 'quick' ? (
            /* Quick Spec Card */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{preset.name}</span>
                  <span className="text-xs font-mono text-amber-400">{preset.badge}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-300 pt-2 border-t border-neutral-800/80">
                  <div>
                    <span className="text-neutral-500">Resolusi: </span>
                    <span className="text-white">{preset.targetResolution.width}×{preset.targetResolution.height} (9:16)</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Framerate: </span>
                    <span className="text-white">{targetFps} FPS</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Target Bitrate: </span>
                    <span className="text-white">{targetBitrateMbps} Mbps</span>
                  </div>
                  <div>
                    <span className="text-neutral-500">Estimasi Ukuran: </span>
                    <span className="text-amber-400">~{estimatedSizeMb} MB</span>
                  </div>
                </div>
              </div>

              {/* Destination info */}
              <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-lg text-xs space-y-1">
                <span className="text-neutral-400 font-medium block">Alur Kerja Setelah Selesai:</span>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Video akan langsung terbuka di jendela <strong>Review Setelah Edit</strong> untuk diperiksa kualitasnya secara detail, lalu dapat disimpan ke galeri atau dibagikan langsung ke aplikasi TikTok, IG, atau WhatsApp.
                </p>
              </div>
            </div>
          ) : (
            /* Custom Save Video Settings */
            <div className="space-y-3.5 text-xs">
              {/* File Name */}
              <div className="space-y-1.5">
                <label className="text-neutral-300 font-semibold block">Nama File Output:</label>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg font-mono text-xs text-white focus:outline-none focus:border-amber-400"
                  placeholder="nama_video_master.mp4"
                />
              </div>

              {/* Bitrate slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Target Bitrate Video:</span>
                  <span className="font-mono text-amber-400 tabular-nums font-bold">{targetBitrateMbps} Mbps</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="30"
                  step="1"
                  value={targetBitrateMbps}
                  onChange={(e) => setTargetBitrateMbps(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-neutral-500">
                  <span>8 Mbps (Hemat)</span>
                  <span className="text-emerald-400 font-bold">14 Mbps (Lancar & Bebas Patah)</span>
                  <span>20 Mbps (Studio HD)</span>
                  <span>30 Mbps (Cinema)</span>
                </div>
              </div>

              {/* Framerate Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-400 block">Framerate (FPS):</label>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {targetFps === 30 ? '✓ Rekomendasi Bebas Patah-patah' : 'Mode 60 FPS'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[24, 30, 60].map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => setTargetFps(fps)}
                      className={`py-2 rounded-lg border font-mono text-xs transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        targetFps === fps
                          ? 'bg-amber-400 text-neutral-950 font-bold border-amber-400'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="font-bold">{fps} FPS</span>
                      <span className="text-[9px] opacity-80 font-normal">
                        {fps === 30 ? 'Paling Stabil' : fps === 60 ? 'Ultra Mulus' : 'Sinematik'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Bitrate */}
              <div className="space-y-1.5">
                <label className="text-neutral-400 block">Kualitas Audio (AAC):</label>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
                  {(['320k', '192k', '128k', 'mute'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAudioBitrate(a)}
                      className={`py-1.5 rounded-md border transition-colors cursor-pointer ${
                        audioBitrate === a
                          ? 'bg-amber-400 text-neutral-950 font-bold border-amber-400'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {a === 'mute' ? 'Tanpa Audio' : a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Export State Display */}
          {isExporting ? (
            <div className="p-5 rounded-xl bg-neutral-950 border border-neutral-800 text-center space-y-3 mt-3">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
              <div className="space-y-1">
                <div className="text-xs font-semibold text-white">
                  Sedang Merender Frame Video HDR Master...
                </div>
                <div className="text-xs font-mono text-amber-400 tabular-nums">
                  {progress}% ({currentSec}s / {durationSec}s)
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <button
                onClick={handleCancelExport}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors cursor-pointer"
              >
                Batalkan Render
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <button
                onClick={startExport}
                className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10 transition-colors cursor-pointer active:scale-99"
              >
                <Sparkles className="w-4 h-4 text-neutral-950 stroke-[2.5]" />
                <span>Mulai Render & Buka Review ({durationSec}s)</span>
              </button>

              <div className="text-center">
                <button
                  onClick={() => {
                    onClose();
                    onOpenFFmpeg();
                  }}
                  className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Gunakan FFmpeg CLI untuk file besar / batch render</span>
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-300">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
