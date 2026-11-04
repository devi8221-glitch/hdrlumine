import React from 'react';
import { X, HelpCircle, AlertTriangle, CheckCircle2, Smartphone, Zap } from 'lucide-react';

interface WhyWashoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhyWashoutModal: React.FC<WhyWashoutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Panduan: Mengapa Video HDR Luntur di Medsos?</h3>
              <p className="text-xs text-neutral-400">
                Penyebab teknis dan cara LuminaHDR menyelamatkan video Anda.
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
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-neutral-300 leading-relaxed">
          {/* Card 1: WhatsApp Bug */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>1. Masalah Utama WhatsApp: "Grey Foggy Washout"</span>
            </div>
            <p className="text-neutral-400">
              WhatsApp sama sekali <strong className="text-white">tidak mendukung pemutaran HDR</strong>. Video yang direkam di iPhone (Dolby Vision Profile 8.4) menggunakan kurva gamma HLG/PQ dan gamut warna ultra-luas Rec.2020. Saat WhatsApp mengompresi video, servernya memotong metadata warna secara buta, menyebabkan video tampil berkabut abu-abu pucat, kontras nol, dan warna kulit hilang.
            </p>
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-start gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Solusi LuminaHDR:</strong> Preset WhatsApp melakukan tone-mapping Hable/ACES ke Rec.709 8-bit YUV420p murni sebelum dikirim, ditambah micro-contrast boost untuk menahan kompresi WhatsApp.
              </span>
            </div>
          </div>

          {/* Card 2: Instagram Reels */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>2. Masalah Instagram Reels: Wajah & Langit Terbakar (Clipping)</span>
            </div>
            <p className="text-neutral-400">
              Instagram mendukung pemutaran HDR hanya untuk pengguna iPhone dan Android premium. Namun, 70% pengguna Instagram menonton di layar SDR biasa. Algoritma konversi server Instagram meng-clip highlight di 100 nits, membuat wajah orang tampak putih menyilaukan dan langit tanpa awan.
            </p>
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-start gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Solusi LuminaHDR:</strong> Gunakan preset "Instagram Reels Filmic SDR" dengan kompresi bahu highlight (shoulder roll-off). Detail awan dan tekstur kulit tetap utuh di semua layar HP!
              </span>
            </div>
          </div>

          {/* Card 3: TikTok */}
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="flex items-center gap-2 text-pink-400 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>3. Masalah TikTok: Kehilangan Tag Metadata HLG/BT.2020</span>
            </div>
            <p className="text-neutral-400">
              TikTok menerima upload HDR 10-bit H.265. Tetapi jika aplikasi edit video Anda tidak menyertakan FourCC tag <code className="text-amber-300 font-mono">hvc1</code> dan tag transfer <code className="text-amber-300 font-mono">arib-std-b67</code>, TikTok akan memperlakukannya sebagai SDR biasa dan meredupkan layar penonton secara drastis.
            </p>
            <div className="p-2.5 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-start gap-2 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Solusi LuminaHDR:</strong> Preset TikTok menyuntikkan tag metadata HEVC 10-bit yang presisi sehingga feed TikTok langsung mendeteksi stream HDR asli.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold transition-colors cursor-pointer"
          >
            Mengerti, Kembali ke Studio
          </button>
        </div>
      </div>
    </div>
  );
};
