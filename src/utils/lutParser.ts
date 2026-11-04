export interface ParsedLUT {
  id: string;
  name: string;
  size: number;
  data: Uint8Array; // size * size * size * 4 (RGBA)
  isCustom?: boolean;
}

export function parseCubeLUT(fileContent: string, fileName: string): ParsedLUT {
  const lines = fileContent.split(/\r?\n/);
  let size = 0;
  let title = fileName.replace(/\.[^/.]+$/, '');
  const colorValues: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#')) continue;

    if (rawLine.startsWith('TITLE')) {
      const match = rawLine.match(/TITLE\s+["']?([^"']+)["']?/i);
      if (match && match[1]) {
        title = match[1].trim();
      }
      continue;
    }

    if (rawLine.startsWith('LUT_3D_SIZE')) {
      const parts = rawLine.split(/\s+/);
      size = parseInt(parts[1], 10);
      continue;
    }

    // Skip 1D size or other headers
    if (rawLine.startsWith('LUT_1D_SIZE') || rawLine.startsWith('DOMAIN_')) {
      continue;
    }

    // Color triplets: "r g b"
    const rgbTokens = rawLine.split(/\s+/).map((tok) => parseFloat(tok));
    if (rgbTokens.length >= 3 && !isNaN(rgbTokens[0]) && !isNaN(rgbTokens[1]) && !isNaN(rgbTokens[2])) {
      colorValues.push(rgbTokens[0], rgbTokens[1], rgbTokens[2]);
    }
  }

  if (size === 0) {
    // Attempt to guess cube root from number of triplets
    const numTriplets = colorValues.length / 3;
    const guessedSize = Math.round(Math.cbrt(numTriplets));
    if (guessedSize * guessedSize * guessedSize === numTriplets) {
      size = guessedSize;
    } else {
      throw new Error(`File .cube tidak memiliki header LUT_3D_SIZE yang valid.`);
    }
  }

  const expectedTriplets = size * size * size;
  if (colorValues.length < expectedTriplets * 3) {
    throw new Error(
      `Data warna tidak lengkap: terdeteksi ${colorValues.length / 3} poin, diharapkan ${expectedTriplets} untuk ukuran ${size}³.`
    );
  }

  // Convert to RGBA Uint8Array
  const data = new Uint8Array(size * size * size * 4);
  let srcIdx = 0;
  let dstIdx = 0;

  for (let i = 0; i < expectedTriplets; i++) {
    const r = Math.min(255, Math.max(0, Math.round(colorValues[srcIdx++] * 255)));
    const g = Math.min(255, Math.max(0, Math.round(colorValues[srcIdx++] * 255)));
    const b = Math.min(255, Math.max(0, Math.round(colorValues[srcIdx++] * 255)));
    data[dstIdx++] = r;
    data[dstIdx++] = g;
    data[dstIdx++] = b;
    data[dstIdx++] = 255;
  }

  return {
    id: `custom_${Date.now()}`,
    name: title,
    size,
    data,
    isCustom: true,
  };
}

export type BuiltinLUTType =
  | 'teal_orange'
  | 'kodak_500t'
  | 'cyberpunk'
  | 'fuji_film'
  | 'golden_hour'
  | 'emerald_matrix'
  | 'vintage_vibe'
  | 'noir';

// Generate high quality 33x33x33 procedural cinematic 3D LUTs
export function createProceduralLUT(type: BuiltinLUTType, size: number = 33): ParsedLUT {
  const data = new Uint8Array(size * size * size * 4);
  let dstIdx = 0;

  const names: Record<BuiltinLUTType, string> = {
    teal_orange: 'Teal & Orange Blockbuster',
    kodak_500t: 'Kodak Vision3 500T Film',
    cyberpunk: 'Cyberpunk Neon Nights',
    fuji_film: 'Fuji F-Log Matte Pastels',
    golden_hour: 'Golden Hour Sunset Warmth',
    emerald_matrix: 'Emerald Cinematic Moody',
    vintage_vibe: 'Vintage 70s Warm Retro',
    noir: 'Silver Halide Noir (B&W)',
  };

  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        let red = r / (size - 1);
        let green = g / (size - 1);
        let blue = b / (size - 1);

        if (type === 'teal_orange') {
          // Hollywood Teal and Orange
          const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          // Shadows to Teal
          const shadowMask = Math.max(0, 1.0 - luma * 1.8);
          red -= shadowMask * 0.12;
          green += shadowMask * 0.04;
          blue += shadowMask * 0.16;

          // Highlights & Skin to Warm Amber
          const highlightMask = Math.max(0, (luma - 0.35) * 1.5);
          red += highlightMask * 0.14;
          green += highlightMask * 0.03;
          blue -= highlightMask * 0.10;

          // Rich S-Curve contrast
          red = Math.pow(Math.max(0, red), 1.08);
          green = Math.pow(Math.max(0, green), 1.08);
          blue = Math.pow(Math.max(0, blue), 1.08);
        } else if (type === 'kodak_500t') {
          // Kodak 500T organic film warmth & shadow density
          const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          red = Math.pow(red, 0.94) * 1.05;
          green = Math.pow(green, 0.98);
          blue = Math.pow(blue, 1.06) * 0.92;
          // Soft toe lift
          const toe = Math.max(0, 0.2 - luma) * 0.08;
          red += toe;
          green += toe * 0.8;
          blue += toe * 1.2;
        } else if (type === 'cyberpunk') {
          // Electric Cyan & High-Intensity Magenta
          const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          if (luma < 0.5) {
            red *= 0.65;
            green *= 1.15;
            blue *= 1.35;
          } else {
            red *= 1.35;
            green *= 0.75;
            blue *= 1.25;
          }
        } else if (type === 'fuji_film') {
          // Fuji F-Log Matte Pastels with lifted blacks
          red = red * 0.9 + 0.05;
          green = green * 0.92 + 0.04;
          blue = blue * 0.88 + 0.06;
          // Slightly desaturate
          const luma = 0.299 * red + 0.587 * green + 0.114 * blue;
          red = red * 0.85 + luma * 0.15;
          green = green * 0.85 + luma * 0.15;
          blue = blue * 0.85 + luma * 0.15;
        } else if (type === 'golden_hour') {
          // Golden Hour Sunset Warmth
          const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          red = Math.pow(red, 0.92) * 1.14;
          green = Math.pow(green, 0.98) * 1.04;
          blue = Math.pow(blue, 1.15) * 0.82;
          // Highlights glow amber
          const warmGlow = Math.max(0, luma - 0.3) * 0.18;
          red += warmGlow * 1.2;
          green += warmGlow * 0.8;
        } else if (type === 'emerald_matrix') {
          // Moody Emerald cinematic tone
          const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
          red = red * 0.82;
          green = green * 1.12 + 0.02;
          blue = blue * 0.92;
          const shadow = Math.max(0, 0.4 - luma) * 0.12;
          green += shadow * 0.8;
          blue += shadow * 0.5;
        } else if (type === 'vintage_vibe') {
          // 70s warm retro film
          red = red * 1.08 + 0.04;
          green = green * 1.02 + 0.03;
          blue = blue * 0.86 + 0.02;
          const luma = 0.299 * red + 0.587 * green + 0.114 * blue;
          red = mixNumber(red, luma, 0.1);
          green = mixNumber(green, luma, 0.1);
          blue = mixNumber(blue, luma, 0.1);
        } else if (type === 'noir') {
          // High contrast black & white
          const luma = 0.299 * red + 0.587 * green + 0.114 * blue;
          const curve = Math.pow(luma, 1.25);
          red = curve;
          green = curve;
          blue = curve;
        }

        data[dstIdx++] = Math.min(255, Math.max(0, Math.round(red * 255)));
        data[dstIdx++] = Math.min(255, Math.max(0, Math.round(green * 255)));
        data[dstIdx++] = Math.min(255, Math.max(0, Math.round(blue * 255)));
        data[dstIdx++] = 255;
      }
    }
  }

  return {
    id: `preset_${type}`,
    name: names[type] || type,
    size,
    data,
    isCustom: false,
  };
}

function mixNumber(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

export const BUILTIN_LUTS: ParsedLUT[] = [
  createProceduralLUT('teal_orange'),
  createProceduralLUT('kodak_500t'),
  createProceduralLUT('golden_hour'),
  createProceduralLUT('cyberpunk'),
  createProceduralLUT('emerald_matrix'),
  createProceduralLUT('fuji_film'),
  createProceduralLUT('vintage_vibe'),
  createProceduralLUT('noir'),
];
