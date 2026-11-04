export type ToneMappingAlgorithm = 'aces' | 'reinhard' | 'hable' | 'bt2390' | 'linear';

export type InputColorProfile = 'dolby_vision_hlg' | 'hdr10_pq' | 'slog3_flat' | 'rec709';

export type PlatformPresetId = 
  | 'tiktok_hdr' 
  | 'tiktok_sdr_punch' 
  | 'ig_reels_hdr' 
  | 'ig_reels_sdr' 
  | 'whatsapp_hd' 
  | 'whatsapp_fast' 
  | 'custom';

export type ScopeMode = 'none' | 'waveform' | 'vectorscope' | 'rgb_parade' | 'false_color';

export type SplitViewMode = 'off' | 'split_wipe' | 'side_by_side';

export interface ColorGradingSettings {
  exposure: number;           // -3.0 to +3.0 EV
  contrast: number;           // 0.5 to 2.0
  highlightRolloff: number;   // 0.0 to 1.0 (smooth shoulder compression)
  shadowLift: number;         // -0.2 to +0.4
  saturation: number;         // 0.0 to 2.0
  vibrance: number;           // -1.0 to +1.0
  temperature: number;        // -50 to +50 (Kelvin bias)
  tint: number;               // -50 to +50 (Green / Magenta)
  whiteClipNits: number;      // 100 to 1000 nits
  gamutCompression: boolean;  // BT.2020 -> BT.709 boundary rolloff
  antiWashoutBoost: boolean;  // WhatsApp / IG re-encoder compensation
  toneMapping: ToneMappingAlgorithm;
  inputProfile: InputColorProfile;
  lutId: string;              // 'none' or preset/custom LUT id
  lutIntensity: number;       // 0.0 to 1.0 (mix weight)
}

export interface PlatformPresetConfig {
  id: PlatformPresetId;
  name: string;
  platform: 'TikTok' | 'Instagram' | 'WhatsApp' | 'Custom';
  description: string;
  badge: string;
  recommendedAspect: '9:16' | '1:1' | '16:9' | 'source';
  targetBitrateMbps: number;
  targetResolution: { width: number; height: number };
  targetFps: number;
  outputFormat: 'mp4_h264' | 'mp4_hevc' | 'webm';
  settings: ColorGradingSettings;
  colorSpaceTag: {
    primaries: string;
    transfer: string;
    matrix: string;
  };
  whyUseThis: string;
}

export interface VideoMetadata {
  name: string;
  sizeBytes: number;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  detectedHDR: boolean;
  colorTransfer: string;
}

export interface ExportProgress {
  isExporting: boolean;
  progressPercent: number;
  currentTime: number;
  totalTime: number;
  statusText: string;
}
