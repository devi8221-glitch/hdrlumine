import React, { useState } from 'react';
import { ColorGradingSettings, ToneMappingAlgorithm, InputColorProfile } from '../types/video';
import { ParsedLUT, BUILTIN_LUTS, parseCubeLUT } from '../utils/lutParser';
import {
  RotateCcw,
  Sliders,
  Sun,
  Shield,
  Layers,
  HelpCircle,
  Clapperboard,
  Upload,
  Check,
  Trash2,
  Sparkles,
  Film,
  FileCode,
} from 'lucide-react';

interface ColorControlsProps {
  settings: ColorGradingSettings;
  onChange: (updated: Partial<ColorGradingSettings>) => void;
  onReset: () => void;
  customLUTs: ParsedLUT[];
  activeLUT: ParsedLUT | null;
  onSelectLUT: (lut: ParsedLUT | null) => void;
  onUploadLUT: (lut: ParsedLUT) => void;
  onDeleteCustomLUT: (lutId: string) => void;
}

export const ColorControls: React.FC<ColorControlsProps> = ({
  settings,
  onChange,
  onReset,
  customLUTs,
  activeLUT,
  onSelectLUT,
  onUploadLUT,
  onDeleteCustomLUT,
}) => {
  const [lutError, setLutError] = useState<string | null>(null);

  const toneMapOptions: { id: ToneMappingAlgorithm; label: string; desc: string }[] = [
    { id: 'aces', label: 'ACES Film', desc: 'Standar sinema Hollywood, kontras organik dan warna kulit alami' },
    { id: 'hable', label: 'Hable Filmic', desc: 'Kurva Uncharted 2, kompresi shoulder lembut pada highlight' },
    { id: 'bt2390', label: 'BT.2390 EETF', desc: 'Standar broadcast ITU-R untuk mapping HDR ke SDR presisi' },
    { id: 'reinhard', label: 'Reinhard Ext', desc: 'Algoritma luminance preservation dengan batas white clip nits' },
    { id: 'linear', label: 'Direct Clamp', desc: 'Tanpa kurva kompresi, potong langsung di batas batas SDR' },
  ];

  const inputProfiles: { id: InputColorProfile; label: string }[] = [
    { id: 'dolby_vision_hlg', label: 'Dolby Vision / HLG (iPhone)' },
    { id: 'hdr10_pq', label: 'HDR10 PQ (ST 2084)' },
    { id: 'slog3_flat', label: 'S-Log3 / Flat Log' },
    { id: 'rec709', label: 'Rec.709 SDR' },
  ];

  // Handle .cube file upload
  const handleCubeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLutError(null);
    try {
      const text = await file.text();
      const parsed = parseCubeLUT(text, file.name);
      onUploadLUT(parsed);
      onSelectLUT(parsed);
      onChange({ lutId: parsed.id });
    } catch (err: any) {
      setLutError(err?.message || 'Gagal memproses file .cube');
    }
    // Reset file input so user can re-upload if needed
    e.target.value = '';
  };

  const handleSelectLUTItem = (lut: ParsedLUT | null) => {
    onSelectLUT(lut);
    onChange({ lutId: lut ? lut.id : 'none' });
  };

  const allLUTs = [...BUILTIN_LUTS, ...customLUTs];

  return (
    <div className="space-y-6">
      {/* Section 1: Input Profile & Tone Mapping Operator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-300">
            Profil Input Video Asli
          </label>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {inputProfiles.map((prof) => (
            <button
              key={prof.id}
              onClick={() => onChange({ inputProfile: prof.id })}
              className={`px-2.5 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer truncate ${
                settings.inputProfile === prof.id
                  ? 'bg-amber-400 text-neutral-950 font-semibold'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {prof.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-neutral-300">
            Algoritma Tone Mapping HDR-ke-SDR
          </label>
        </div>
        <div className="space-y-1.5">
          {toneMapOptions.map((tm) => (
            <button
              key={tm.id}
              onClick={() => onChange({ toneMapping: tm.id })}
              className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                settings.toneMapping === tm.id
                  ? 'bg-neutral-800 border-amber-500/80 text-white'
                  : 'bg-neutral-900/40 border-neutral-800 text-neutral-400 hover:bg-neutral-800/40'
              }`}
            >
              <div className="text-xs font-medium text-white">{tm.label}</div>
              <div className="text-[11px] text-neutral-400 mt-0.5">{tm.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Custom 3D LUTs (.cube) & Cinematic Emulations */}
      <div className="space-y-3.5 pt-3 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">Custom 3D LUTs (.cube)</span>
          </div>
          <label className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors cursor-pointer border border-neutral-700">
            <Upload className="w-3 h-3 text-amber-400" />
            <span>Unggah .CUBE</span>
            <input
              type="file"
              accept=".cube,text/plain"
              onChange={handleCubeFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <p className="text-[11px] text-neutral-400 leading-relaxed">
          Terapkan 3D Color Lookup Table standar DaVinci / Premiere untuk grading sinematik instan bersama kontrol parametrik.
        </p>

        {lutError && (
          <div className="p-2.5 rounded bg-red-950/50 border border-red-500/40 text-[11px] text-red-300">
            {lutError}
          </div>
        )}

        {/* LUT Grid / Selector */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
          {/* None / Bypass Option */}
          <button
            onClick={() => handleSelectLUTItem(null)}
            className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
              settings.lutId === 'none' || !activeLUT
                ? 'bg-neutral-800 border-amber-500/70 text-white shadow-sm'
                : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:bg-neutral-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Bypass / Tanpa LUT</span>
            </div>
            {(settings.lutId === 'none' || !activeLUT) && (
              <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
            )}
          </button>

          {/* All Available LUTs (Built-in + Custom Uploads) */}
          {allLUTs.map((lut) => {
            const isSelected = activeLUT?.id === lut.id && settings.lutId !== 'none';
            return (
              <div
                key={lut.id}
                onClick={() => handleSelectLUTItem(lut)}
                className={`w-full text-left p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'bg-neutral-800 border-amber-500/70 text-white shadow-sm'
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:bg-neutral-800/40'
                }`}
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="flex items-center gap-1.5">
                    {lut.isCustom ? (
                      <FileCode className="w-3 h-3 text-amber-400 shrink-0" />
                    ) : (
                      <Film className="w-3 h-3 text-neutral-400 shrink-0" />
                    )}
                    <span className="text-xs font-medium text-white truncate">
                      {lut.name}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
                    <span>{lut.size}×{lut.size}×{lut.size}</span>
                    <span aria-hidden="true">·</span>
                    <span>{(lut.size * lut.size * lut.size).toLocaleString()} Pts</span>
                    {lut.isCustom && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-400">Custom</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {lut.isCustom && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomLUT(lut.id);
                        if (activeLUT?.id === lut.id) {
                          handleSelectLUTItem(null);
                        }
                      }}
                      className="p-1 rounded text-neutral-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Hapus LUT Kustom"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-amber-400 stroke-[3]" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* LUT Intensity Slider */}
        {settings.lutId !== 'none' && activeLUT && (
          <div className="p-3 rounded-lg bg-neutral-950/70 border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Intensitas Campuran LUT</span>
              <span className="font-mono text-amber-400 tabular-nums">
                {Math.round((settings.lutIntensity ?? 1.0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.02"
              value={settings.lutIntensity ?? 1.0}
              onChange={(e) => onChange({ lutIntensity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        )}
      </div>

      {/* Section 3: Parametric Exposure & Dynamic Range */}
      <div className="space-y-4 pt-3 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-300">Penyesuaian Exposure & Dynamic Range</span>
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Nilai</span>
          </button>
        </div>

        {/* Exposure */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Exposure Kompensasi (EV)</span>
            <span className="font-mono text-amber-400 tabular-nums">
              {settings.exposure >= 0 ? `+${settings.exposure.toFixed(2)}` : settings.exposure.toFixed(2)} EV
            </span>
          </div>
          <input
            type="range"
            min="-3.0"
            max="3.0"
            step="0.05"
            value={settings.exposure}
            onChange={(e) => onChange({ exposure: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Contrast */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Dynamic Contrast (Mid-18%)</span>
            <span className="font-mono text-amber-400 tabular-nums">{settings.contrast.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.6"
            max="1.8"
            step="0.02"
            value={settings.contrast}
            onChange={(e) => onChange({ contrast: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Highlight Rolloff */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Highlight Shoulder Rolloff</span>
            <span className="font-mono text-amber-400 tabular-nums">{Math.round(settings.highlightRolloff * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.02"
            value={settings.highlightRolloff}
            onChange={(e) => onChange({ highlightRolloff: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Shadow Lift */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Shadow Lift (Black Point)</span>
            <span className="font-mono text-amber-400 tabular-nums">
              {settings.shadowLift >= 0 ? `+${settings.shadowLift.toFixed(2)}` : settings.shadowLift.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-0.1"
            max="0.3"
            step="0.01"
            value={settings.shadowLift}
            onChange={(e) => onChange({ shadowLift: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Target Nits White Clip */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">White Point Clip Target</span>
            <span className="font-mono text-amber-400 tabular-nums">{Math.round(settings.whiteClipNits)} Nits</span>
          </div>
          <input
            type="range"
            min="100"
            max="1000"
            step="25"
            value={settings.whiteClipNits}
            onChange={(e) => onChange({ whiteClipNits: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>

      {/* Section 4: Color, Saturation & Temperature */}
      <div className="space-y-4 pt-3 border-t border-neutral-800">
        <span className="text-xs font-semibold text-neutral-300">Warna, Saturasi & Temperatur</span>

        {/* Saturation */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Saturasi Global</span>
            <span className="font-mono text-amber-400 tabular-nums">{settings.saturation.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.8"
            step="0.02"
            value={settings.saturation}
            onChange={(e) => onChange({ saturation: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Vibrance */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Vibrance (Proteksi Kulit)</span>
            <span className="font-mono text-amber-400 tabular-nums">
              {settings.vibrance >= 0 ? `+${settings.vibrance.toFixed(2)}` : settings.vibrance.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-0.5"
            max="0.8"
            step="0.02"
            value={settings.vibrance}
            onChange={(e) => onChange({ vibrance: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Temperature */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Color Temperature (Kelvin)</span>
            <span className="font-mono text-amber-400 tabular-nums">
              {settings.temperature > 0 ? `+${settings.temperature} K` : `${settings.temperature} K`}
            </span>
          </div>
          <input
            type="range"
            min="-40"
            max="40"
            step="1"
            value={settings.temperature}
            onChange={(e) => onChange({ temperature: parseInt(e.target.value, 10) })}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>
      </div>

      {/* Section 5: Gamut Limiter & WhatsApp Anti-Washout Enhancers */}
      <div className="space-y-3 pt-3 border-t border-neutral-800">
        <span className="text-xs font-semibold text-neutral-300">Gamut Limiter & Anti-Washout</span>

        <label className="flex items-start gap-3 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 cursor-pointer hover:bg-neutral-800/40">
          <input
            type="checkbox"
            checked={settings.gamutCompression}
            onChange={(e) => onChange({ gamutCompression: e.target.checked })}
            className="mt-0.5 rounded border-neutral-700 text-amber-400 focus:ring-amber-400"
          />
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-white">Gamut Compression BT.2020 ke Rec.709</div>
            <div className="text-[11px] text-neutral-400 leading-relaxed">
              Mencegah artefak neon clipping pada warna merah dan sian berintensitas tinggi.
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800 cursor-pointer hover:bg-neutral-800/40">
          <input
            type="checkbox"
            checked={settings.antiWashoutBoost}
            onChange={(e) => onChange({ antiWashoutBoost: e.target.checked })}
            className="mt-0.5 rounded border-neutral-700 text-amber-400 focus:ring-amber-400"
          />
          <div className="space-y-0.5">
            <div className="text-xs font-medium text-white">WhatsApp & IG Re-Encode Compensation</div>
            <div className="text-[11px] text-neutral-400 leading-relaxed">
              Kompensasi kontras mikro untuk menembus kabut abu-abu kompresi WhatsApp.
            </div>
          </div>
        </label>
      </div>
    </div>
  );
};
