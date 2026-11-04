import React, { useState } from 'react';
import { PlatformPresetConfig, ColorGradingSettings } from '../types/video';
import { generateFFmpegCommand } from '../utils/ffmpegGenerator';
import { X, Copy, Check, Download, Terminal, Info } from 'lucide-react';

interface FFmpegDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preset: PlatformPresetConfig;
  settings: ColorGradingSettings;
  videoFileName: string;
}

export const FFmpegDrawer: React.FC<FFmpegDrawerProps> = ({
  isOpen,
  onClose,
  preset,
  settings,
  videoFileName,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const scriptResult = generateFFmpegCommand(videoFileName || 'input_hdr.mov', preset, settings);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptResult.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-800 rounded-lg text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">FFmpeg Production CLI Script Generator</h3>
              <p className="text-xs text-neutral-400">
                Gunakan skrip terminal ini untuk pemrosesan batch profesional di Mac, Windows, atau server otomatis.
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Preset Info */}
          <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Preset Target: {preset.name}</div>
              <div className="text-[11px] text-neutral-400">{preset.whyUseThis}</div>
            </div>
            <div className="text-xs font-mono text-amber-400 whitespace-nowrap">
              {preset.outputFormat === 'mp4_hevc' ? 'HEVC 10-bit' : 'H.264 8-bit YUV420p'}
            </div>
          </div>

          {/* Terminal Command Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300">
                Command Line Siap Pakai:
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors cursor-pointer border border-neutral-700"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-amber-400" />
                      <span>Salin Command</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative group">
              <pre className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
                {scriptResult.command}
              </pre>
            </div>
          </div>

          {/* Download Script Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadFile(scriptResult.downloadScriptSh, `master_${preset.id}.sh`)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-xs font-semibold text-white border border-neutral-700 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Unduh Skrip Bash (.sh untuk Mac/Linux)</span>
            </button>
            <button
              onClick={() => downloadFile(scriptResult.downloadScriptBat, `master_${preset.id}.bat`)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-xs font-semibold text-white border border-neutral-700 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Unduh Skrip Batch (.bat untuk Windows)</span>
            </button>
          </div>

          {/* Flag Explanations */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Penjelasan Parameter FFmpeg & Tag Color Space:</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {scriptResult.explanation.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-neutral-950/60 rounded-lg border border-neutral-800/80 text-xs space-y-1">
                  <div className="font-mono text-amber-300 font-medium">{item.flag}</div>
                  <div className="text-neutral-400 text-[11px] leading-relaxed">{item.purpose}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-mono">
            Memerlukan FFmpeg dengan pustaka libzimg & libx264/libx265
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
