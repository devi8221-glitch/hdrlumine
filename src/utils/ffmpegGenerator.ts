import { PlatformPresetConfig, ColorGradingSettings } from '../types/video';

export interface FFmpegScriptResult {
  command: string;
  explanation: { flag: string; purpose: string }[];
  downloadScriptSh: string;
  downloadScriptBat: string;
}

export function generateFFmpegCommand(
  inputFileName: string,
  preset: PlatformPresetConfig,
  customSettings?: ColorGradingSettings
): FFmpegScriptResult {
  const settings = customSettings || preset.settings;
  const safeInput = inputFileName.includes(' ') ? `"${inputFileName}"` : inputFileName;
  const safeOutput = `output_${preset.id}.mp4`;

  let videoFilter = '';
  let codecArgs = '';
  let colorArgs = '';
  let audioArgs = '-c:a aac -b:a 320k -ar 48000';
  const explanations: { flag: string; purpose: string }[] = [];

  // Determine tone-mapping & scaling
  if (preset.id === 'tiktok_hdr' || preset.id === 'ig_reels_hdr') {
    // 10-bit HDR (HLG BT.2020) Pass-through / Transcode
    videoFilter = '-vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p10le"';
    codecArgs = '-c:v libx265 -crf 19 -preset slow -tag:v hvc1';
    colorArgs = '-color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc -color_range tv';

    explanations.push(
      { flag: '-c:v libx265 -tag:v hvc1', purpose: 'Menggunakan HEVC 10-bit dengan fourcc hvc1 yang diwajibkan oleh iOS & Android untuk mengenali stream HDR.' },
      { flag: '-color_trc arib-std-b67', purpose: 'Menyuntikkan metadata transfer function HLG (Dolby Vision Profile 8.4 kompatibel).' },
      { flag: '-color_primaries bt2020', purpose: 'Mempertahankan gamut warna luas Rec.2020 tanpa clipping warna.' },
      { flag: '-crf 19', purpose: 'Kualitas visual visually-lossless optimal untuk media sosial vertikal.' }
    );
  } else if (preset.id === 'whatsapp_hd') {
    // WhatsApp HD Anti-Washout (Strict Rec.709 8-bit YUV420p Tone-Mapped)
    videoFilter = '-vf "zscale=t=linear:npl=100,tonemap=tonemap=mobius:param=0.01:desat=0.5,zscale=p=bt709:t=bt709:m=bt709:r=tv,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,eq=contrast=1.12:saturation=1.10:brightness=0.02,format=yuv420p"';
    codecArgs = '-c:v libx264 -profile:v high -level 4.2 -crf 20 -maxrate 9M -bufsize 16M';
    colorArgs = '-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv';
    audioArgs = '-c:a aac -b:a 192k -ar 44100';

    explanations.push(
      { flag: 'zscale & tonemap=mobius', purpose: 'Tone mapping hardware-accurate dari HDR BT.2020 ke Rec.709 SDR tanpa warna abu-abu (memperbaiki bug WhatsApp grey washout).' },
      { flag: 'eq=contrast=1.12:saturation=1.10', purpose: 'Meningkatkan kontras mikro dan chroma untuk mengatasi re-kompresi WhatsApp yang sering memudarkan video.' },
      { flag: '-c:v libx264 -profile:v high', purpose: 'Kompatibilitas 100% pada semua versi WhatsApp Web, iOS, dan Android lawas.' },
      { flag: '-maxrate 9M', purpose: 'Menjaga total file di bawah batas 64MB WhatsApp HD.' }
    );
  } else if (preset.id === 'whatsapp_fast') {
    // WhatsApp Fast (720p < 16MB)
    videoFilter = '-vf "zscale=t=linear:npl=100,tonemap=tonemap=hable:desat=0.55,zscale=p=bt709:t=bt709:m=bt709:r=tv,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,eq=contrast=1.15:saturation=1.12,format=yuv420p"';
    codecArgs = '-c:v libx264 -profile:v main -crf 23 -maxrate 4M -bufsize 8M';
    colorArgs = '-color_primaries bt709 -color_trc bt709 -colorspace bt709';
    audioArgs = '-c:a aac -b:a 128k -ar 44100';

    explanations.push(
      { flag: 'scale=720:1280', purpose: 'Resolusi 720p ringan, memastikan ukuran video di bawah limit 16MB pengiriman pesan instan.' },
      { flag: 'tonemap=hable', purpose: 'Kurva filmic Uncharted 2 yang menjaga detail bayangan tetap bersih pada bitrate rendah.' }
    );
  } else {
    // SDR Anti-Washout (TikTok SDR / IG Reels SDR / Custom)
    const tmMethod = settings.toneMapping === 'aces' ? 'mobius' : settings.toneMapping;
    videoFilter = `-vf "zscale=t=linear:npl=${settings.whiteClipNits},tonemap=tonemap=${tmMethod}:desat=0.5,zscale=p=bt709:t=bt709:m=bt709:r=tv,scale=${preset.targetResolution.width}:${preset.targetResolution.height}:force_original_aspect_ratio=decrease,pad=${preset.targetResolution.width}:${preset.targetResolution.height}:(ow-iw)/2:(oh-ih)/2,eq=contrast=${settings.contrast.toFixed(2)}:saturation=${settings.saturation.toFixed(2)}:brightness=${(settings.shadowLift * 0.5).toFixed(2)},format=yuv420p"`;
    codecArgs = `-c:v libx264 -profile:v high -level 4.2 -crf 18 -maxrate ${preset.targetBitrateMbps}M -bufsize ${preset.targetBitrateMbps * 2}M`;
    colorArgs = '-color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv';

    explanations.push(
      { flag: `tonemap=${tmMethod}`, purpose: 'Mengompresi highlight tinggi (langit, lampu) menjadi SDR tanpa clipping putih ekstrem.' },
      { flag: '-color_primaries bt709', purpose: 'Menetapkan standar warna Rec.709 yang diwajibkan feed Instagram dan TikTok SDR.' },
      { flag: `-maxrate ${preset.targetBitrateMbps}M`, purpose: 'Mencegah server Instagram melakukan re-encode kompresi kedua yang merusak ketajaman.' }
    );
  }

  const fullCommand = `ffmpeg -y -i ${safeInput} ${videoFilter} ${codecArgs} ${colorArgs} ${audioArgs} -movflags +faststart ${safeOutput}`;

  explanations.push({
    flag: '-movflags +faststart',
    purpose: 'Memindahkan atom moov ke awal file sehingga video langsung terputar di TikTok/IG tanpa menunggu seluruh video terunduh.',
  });

  const shScript = `#!/usr/bin/env bash
# LuminaHDR Mastering Script for ${preset.name}
# Platform: ${preset.platform}
echo "Memulai pemrosesan HDR video untuk ${preset.platform}..."
${fullCommand}
echo "Selesai! Output disimpan ke ${safeOutput}"
`;

  const batScript = `@echo off
REM LuminaHDR Mastering Script for ${preset.name}
REM Platform: ${preset.platform}
echo Memulai pemrosesan HDR video untuk ${preset.platform}...
${fullCommand}
echo Selesai! Output disimpan ke ${safeOutput}
pause
`;

  return {
    command: fullCommand,
    explanation: explanations,
    downloadScriptSh: shScript,
    downloadScriptBat: batScript,
  };
}
