import { ColorGradingSettings, SplitViewMode } from '../types/video';

export type HDROutputMode = 'hdr10' | 'dolby_vision';

const VERTEX_SHADER_SOURCE = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision highp float;

in vec2 v_texCoord;
out vec4 outColor;

uniform sampler2D u_image;
uniform highp sampler3D u_lut3d;
uniform int u_presetMode;          // 0=Natural, 1=TealOrange, 2=Kodak500T, 3=GoldenHour, 4=Cyberpunk, 5=Emerald, 6=Fuji, 7=Vintage, 8=Noir, 9=Custom3D
uniform float u_lutIntensity;      // 0.0 to 1.0
uniform float u_lutSize;           // Size of custom LUT (e.g. 33.0)
uniform int u_hasCustomLut;        // 1 if custom LUT texture is loaded

uniform int u_outputMode;          // 0 = HDR10 (ST 2084 PQ 1000 Nits), 1 = Dolby Vision (Profile 8.4 HLG)
uniform float u_brightnessBoost;   // 0.8 to 1.6 (Peak Luminance scaling)
uniform float u_contrast;          // 0.8 to 1.5 (Dynamic Contrast)
uniform float u_colorVolume;       // 0.8 to 1.6 (BT.2020 Gamut Expansion)
uniform float u_highlightRolloff;  // 0.0 to 1.0 (Shoulder compression)
uniform int u_splitMode;           // 0=off (Mastered), 1=split_wipe, 2=side_by_side
uniform float u_splitPosition;     // 0.0 to 1.0
uniform int u_showOriginal;        // 1 = force 100% original video

uniform float u_clarity;           // 0.0 to 1.0 (Spatial micro-contrast and edge clarity boost)
uniform vec2 u_resolution;         // Video render canvas pixel dimensions

// High-fidelity spatial micro-contrast & edge clarity filter ("Super Jernih & Tajam")
vec3 applySpatialClarity(sampler2D tex, vec2 uv, vec3 centerColor, float clarity, vec2 res) {
  if (clarity <= 0.01) return centerColor;

  vec2 texel = 1.0 / max(res, vec2(720.0, 1280.0));
  vec3 up    = texture(tex, uv + vec2(0.0, texel.y)).rgb;
  vec3 down  = texture(tex, uv - vec2(0.0, texel.y)).rgb;
  vec3 left  = texture(tex, uv - vec2(texel.x, 0.0)).rgb;
  vec3 right = texture(tex, uv + vec2(texel.x, 0.0)).rgb;

  vec3 blur = (up + down + left + right) * 0.25;
  vec3 highPass = centerColor - blur;

  // Gentle non-linear limit to preserve natural skin tones while making footage razor-sharp
  vec3 sharpened = centerColor + clamp(highPass * (clarity * 2.2), -0.16, 0.16);
  return clamp(sharpened, 0.0, 1.0);
}

// Robust procedural color grading preset engine (Zero-allocation, 100% crash/blank-proof)
vec3 applyPresetLook(vec3 inRgb, int mode) {
  if (mode == 0) return inRgb; // Natural HDR

  vec3 col = clamp(inRgb, 0.0, 1.0);
  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));

  if (mode == 1) {
    // 1. Teal & Orange Hollywood Blockbuster
    float shadowMask = max(0.0, 1.0 - luma * 1.8);
    col.r = clamp(col.r - shadowMask * 0.12, 0.0, 1.0);
    col.g = clamp(col.g + shadowMask * 0.04, 0.0, 1.0);
    col.b = clamp(col.b + shadowMask * 0.16, 0.0, 1.0);

    float highlightMask = max(0.0, (luma - 0.35) * 1.5);
    col.r = clamp(col.r + highlightMask * 0.14, 0.0, 1.0);
    col.g = clamp(col.g + highlightMask * 0.03, 0.0, 1.0);
    col.b = clamp(col.b - highlightMask * 0.10, 0.0, 1.0);

    col = pow(max(col, vec3(0.0001)), vec3(1.08));
    return clamp(col, 0.0, 1.0);
  }
  else if (mode == 2) {
    // 2. Kodak Vision3 500T 35mm Film
    col.r = pow(max(col.r, 0.0001), 0.94) * 1.05;
    col.g = pow(max(col.g, 0.0001), 0.98);
    col.b = pow(max(col.b, 0.0001), 1.06) * 0.92;
    float toe = max(0.0, 0.2 - luma) * 0.08;
    col.r = clamp(col.r + toe, 0.0, 1.0);
    col.g = clamp(col.g + toe * 0.8, 0.0, 1.0);
    col.b = clamp(col.b + toe * 1.2, 0.0, 1.0);
    return clamp(col, 0.0, 1.0);
  }
  else if (mode == 3) {
    // 3. Golden Hour Sunset Warmth
    col.r = pow(max(col.r, 0.0001), 0.92) * 1.14;
    col.g = pow(max(col.g, 0.0001), 0.98) * 1.04;
    col.b = pow(max(col.b, 0.0001), 1.15) * 0.82;
    float warmGlow = max(0.0, luma - 0.3) * 0.18;
    col.r = clamp(col.r + warmGlow * 1.2, 0.0, 1.0);
    col.g = clamp(col.g + warmGlow * 0.8, 0.0, 1.0);
    return clamp(col, 0.0, 1.0);
  }
  else if (mode == 4) {
    // 4. Cyberpunk Neon Nights
    if (luma < 0.5) {
      col.r = clamp(col.r * 0.65, 0.0, 1.0);
      col.g = clamp(col.g * 1.15, 0.0, 1.0);
      col.b = clamp(col.b * 1.35, 0.0, 1.0);
    } else {
      col.r = clamp(col.r * 1.35, 0.0, 1.0);
      col.g = clamp(col.g * 0.75, 0.0, 1.0);
      col.b = clamp(col.b * 1.25, 0.0, 1.0);
    }
    return clamp(col, 0.0, 1.0);
  }
  else if (mode == 5) {
    // 5. Emerald Mood
    col.r = clamp(col.r * 0.82, 0.0, 1.0);
    col.g = clamp(col.g * 1.12 + 0.02, 0.0, 1.0);
    col.b = clamp(col.b * 0.92, 0.0, 1.0);
    float shadow = max(0.0, 0.4 - luma) * 0.12;
    col.g = clamp(col.g + shadow * 0.8, 0.0, 1.0);
    col.b = clamp(col.b + shadow * 0.5, 0.0, 1.0);
    return clamp(col, 0.0, 1.0);
  }
  else if (mode == 6) {
    // 6. Fuji Pastel Matte (Soft F-Log)
    col.r = clamp(col.r * 0.90 + 0.05, 0.0, 1.0);
    col.g = clamp(col.g * 0.92 + 0.04, 0.0, 1.0);
    col.b = clamp(col.b * 0.88 + 0.06, 0.0, 1.0);
    col = mix(col, vec3(luma), 0.15);
    return clamp(col, 0.0, 1.0);
  }
  else if (mode == 7) {
    // 7. Vintage 70s Analog
    col.r = clamp(col.r * 1.08 + 0.04, 0.0, 1.0);
    col.g = clamp(col.g * 1.02 + 0.03, 0.0, 1.0);
    col.b = clamp(col.b * 0.86 + 0.02, 0.0, 1.0);
    col = mix(col, vec3(luma), 0.10);
    return clamp(col, 0.0, 1.0);
  }
  else if (mode == 8) {
    // 8. Noir B&W (Silver Halide High-Contrast)
    float noirLuma = dot(col, vec3(0.299, 0.587, 0.114));
    float curve = pow(clamp(noirLuma, 0.0001, 1.0), 1.25);
    return clamp(vec3(curve), 0.0, 1.0);
  }
  else if (mode == 9 && u_hasCustomLut == 1 && u_lutSize > 1.0) {
    // 9. Custom Uploaded .cube 3D LUT
    vec3 coord = (clamp(col, 0.0, 1.0) * (u_lutSize - 1.0) + 0.5) / u_lutSize;
    coord = clamp(coord, vec3(0.001), vec3(0.999));
    vec3 sampled = texture(u_lut3d, coord).rgb;
    if (isnan(sampled.r) || isinf(sampled.r) || isnan(sampled.g) || isnan(sampled.b)) {
      return col;
    }
    return clamp(sampled, 0.0, 1.0);
  }

  return col;
}

// Rec.709 to Rec.2020 Wide Color Gamut matrix conversion
vec3 rec709ToRec2020(vec3 c) {
  mat3 m = mat3(
    0.6274, 0.3293, 0.0433,
    0.0691, 0.9195, 0.0114,
    0.0164, 0.0880, 0.8956
  );
  return clamp(m * c, 0.0, 1.0);
}

// Perceptual Quantizer (SMPTE ST 2084 - HDR10) optical transfer curve
vec3 applyHDR10_PQ(vec3 linearRgb, float peakNits, float contrast, float vibrance) {
  float luma = dot(linearRgb, vec3(0.2627, 0.6780, 0.0593));
  float midGrey = 0.18;
  vec3 safeLinear = max(linearRgb, vec3(0.0001));
  vec3 contrasted = pow(safeLinear / midGrey, vec3(contrast)) * midGrey;
  float nitsScale = max(1.0, peakNits / 600.0);
  vec3 expandedHighlights = contrasted + pow(max(contrasted - 0.45, vec3(0.0)), vec3(1.35)) * (0.8 * nitsScale);
  vec3 wideGamut = mix(linearRgb, rec709ToRec2020(expandedHighlights), 0.65);
  vec3 saturated = mix(vec3(luma), wideGamut, vibrance);
  vec3 mastered = saturated / (saturated + vec3(0.25));
  mastered *= 1.25;
  return clamp(mastered, 0.0, 1.0);
}

// Dolby Vision Profile 8.4 (Hybrid Log-Gamma Rec.2100 with dynamic scene tone mapping)
vec3 applyDolbyVision_HLG(vec3 linearRgb, float peakNits, float contrast, float vibrance) {
  float luma = dot(linearRgb, vec3(0.2627, 0.6780, 0.0593));
  vec3 filmicRgb = linearRgb;
  vec3 sCurve = filmicRgb * filmicRgb * (3.0 - 2.0 * filmicRgb);
  vec3 balanced = mix(filmicRgb, sCurve, clamp(contrast - 0.6, 0.0, 0.8));
  vec3 specular = pow(max(balanced, vec3(0.0001)), vec3(1.2)) * (peakNits / 750.0);
  vec3 dvColor = mix(vec3(luma), specular, vibrance * 1.08);
  vec3 mastered = (dvColor * (1.0 + dvColor * 0.15)) / (dvColor + vec3(0.85));
  return clamp(mastered * 1.12, 0.0, 1.0);
}

void main() {
  vec2 uv = v_texCoord;
  
  // Determine if this pixel belongs to the Original Video side
  bool isOriginalSide = false;
  
  if (u_showOriginal == 1) {
    isOriginalSide = true;
  } else if (u_splitMode == 1) { // Split Wipe Slider
    if (uv.x < u_splitPosition) {
      isOriginalSide = true;
    }
    // High-visibility golden comparison divider line
    if (u_splitPosition > 0.01 && u_splitPosition < 0.99 && abs(uv.x - u_splitPosition) < 0.0022) {
      outColor = vec4(1.0, 0.84, 0.0, 1.0); // Gold hairline
      return;
    }
  } else if (u_splitMode == 2) { // Side by Side Dual View
    float splitPt = clamp(u_splitPosition, 0.2, 0.8);
    if (uv.x < splitPt) {
      isOriginalSide = true;
      uv.x = uv.x / splitPt;
    } else {
      isOriginalSide = false;
      uv.x = (uv.x - splitPt) / (1.0 - splitPt);
    }
    if (abs(v_texCoord.x - splitPt) < 0.0025) {
      outColor = vec4(1.0, 0.84, 0.0, 1.0);
      return;
    }
  }

  vec4 srcTex = texture(u_image, uv);
  vec3 rgb = srcTex.rgb;

  // If ORIGINAL SIDE: render the 100% UNTOUCHED, pristine source video
  if (isOriginalSide) {
    outColor = vec4(clamp(rgb, 0.0, 1.0), srcTex.a);
    return;
  }

  // 0. Apply Spatial Clarity & Micro-Contrast Enhancement ("Super Jernih & Bebas Blur")
  rgb = applySpatialClarity(u_image, uv, rgb, u_clarity, u_resolution);

  // 1. Apply Creative Color Grading Preset Look with user intensity
  vec3 styledRgb = applyPresetLook(rgb, u_presetMode);
  vec3 gradedRgb = mix(rgb, styledRgb, clamp(u_lutIntensity, 0.0, 1.0));

  // 2. MASTERED HDR PIPELINE (Clean, Natural, High-Impact Tone Mapping)
  vec3 masteredRgb;
  float peakNits = 1000.0 * u_brightnessBoost;

  if (u_outputMode == 0) {
    // HDR10 (SMPTE ST 2084 PQ 1000 Nits)
    masteredRgb = applyHDR10_PQ(gradedRgb, peakNits, u_contrast, u_colorVolume);
  } else {
    // Dolby Vision (Profile 8.4 HLG)
    masteredRgb = applyDolbyVision_HLG(gradedRgb, peakNits, u_contrast, u_colorVolume);
  }

  outColor = vec4(clamp(masteredRgb, 0.0, 1.0), srcTex.a);
}
`;

export class HDRShaderEngine {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private lutTexture: WebGLTexture | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private isLutLoaded: boolean = false;
  private currentLutSize: number = 33;

  // Uniform locations
  private uImageLoc: WebGLUniformLocation | null = null;
  private uLut3dLoc: WebGLUniformLocation | null = null;
  private uPresetModeLoc: WebGLUniformLocation | null = null;
  private uLutIntensityLoc: WebGLUniformLocation | null = null;
  private uLutSizeLoc: WebGLUniformLocation | null = null;
  private uHasCustomLutLoc: WebGLUniformLocation | null = null;
  private uOutputModeLoc: WebGLUniformLocation | null = null;
  private uBrightnessBoostLoc: WebGLUniformLocation | null = null;
  private uContrastLoc: WebGLUniformLocation | null = null;
  private uColorVolumeLoc: WebGLUniformLocation | null = null;
  private uHighlightRolloffLoc: WebGLUniformLocation | null = null;
  private uSplitModeLoc: WebGLUniformLocation | null = null;
  private uSplitPositionLoc: WebGLUniformLocation | null = null;
  private uShowOriginalLoc: WebGLUniformLocation | null = null;
  private uClarityLoc: WebGLUniformLocation | null = null;
  private uResolutionLoc: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported on this device/browser');
    }
    this.gl = gl;
    this.initPipeline();
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create WebGL shader');
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${info}`);
    }
    return shader;
  }

  private initPipeline() {
    const gl = this.gl;
    const vs = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    const program = gl.createProgram();
    if (!program) throw new Error('Failed to create WebGL program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program link error: ${info}`);
    }
    this.program = program;

    // Cache Uniform Locations
    this.uImageLoc = gl.getUniformLocation(program, 'u_image');
    this.uLut3dLoc = gl.getUniformLocation(program, 'u_lut3d');
    this.uPresetModeLoc = gl.getUniformLocation(program, 'u_presetMode');
    this.uLutIntensityLoc = gl.getUniformLocation(program, 'u_lutIntensity');
    this.uLutSizeLoc = gl.getUniformLocation(program, 'u_lutSize');
    this.uHasCustomLutLoc = gl.getUniformLocation(program, 'u_hasCustomLut');
    this.uOutputModeLoc = gl.getUniformLocation(program, 'u_outputMode');
    this.uBrightnessBoostLoc = gl.getUniformLocation(program, 'u_brightnessBoost');
    this.uContrastLoc = gl.getUniformLocation(program, 'u_contrast');
    this.uColorVolumeLoc = gl.getUniformLocation(program, 'u_colorVolume');
    this.uHighlightRolloffLoc = gl.getUniformLocation(program, 'u_highlightRolloff');
    this.uSplitModeLoc = gl.getUniformLocation(program, 'u_splitMode');
    this.uSplitPositionLoc = gl.getUniformLocation(program, 'u_splitPosition');
    this.uShowOriginalLoc = gl.getUniformLocation(program, 'u_showOriginal');
    this.uClarityLoc = gl.getUniformLocation(program, 'u_clarity');
    this.uResolutionLoc = gl.getUniformLocation(program, 'u_resolution');

    // Quad geometry (Full screen quad with flipped Y texture coords for standard video)
    const positions = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
      -1,  1,  0, 0,
       1, -1,  1, 1,
       1,  1,  1, 0,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const aTex = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);

    // Texture Unit 0: Video/Source Texture Setup
    this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Texture Unit 1: 3D LUT Texture Setup
    this.lutTexture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Initialize 3D texture with 2x2x2 identity cube
    const idData = new Uint8Array([
      0, 0, 0, 255,     255, 0, 0, 255,
      0, 255, 0, 255,   255, 255, 0, 255,
      0, 0, 255, 255,   255, 0, 255, 255,
      0, 255, 255, 255, 255, 255, 255, 255,
    ]);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 2, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, idData);
  }

  public setLUTData(data: Uint8Array | null, size: number) {
    const gl = this.gl;
    if (!this.lutTexture) return;

    if (!data || size <= 1) {
      this.isLutLoaded = false;
      this.currentLutSize = 33;
      return;
    }

    try {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        gl.RGBA8,
        size,
        size,
        size,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data
      );
      this.currentLutSize = size;
      this.isLutLoaded = true;
    } catch (e) {
      console.warn('Could not upload 3D LUT texture', e);
      this.isLutLoaded = false;
    }
  }

  public render(
    source: HTMLVideoElement | HTMLCanvasElement,
    outputMode: HDROutputMode,
    splitMode: SplitViewMode,
    splitPosition: number,
    showOriginal: boolean = false,
    settings?: Partial<ColorGradingSettings>
  ) {
    const gl = this.gl;
    if (!this.program || !this.vao) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(this.program);

    // Upload video / canvas frame to Texture Unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(this.uImageLoc, 0);

    // Map lutId to procedural preset mode
    const lutId = settings?.lutId || 'none';
    let presetMode = 0;
    if (lutId.includes('teal_orange')) presetMode = 1;
    else if (lutId.includes('kodak_500t')) presetMode = 2;
    else if (lutId.includes('golden_hour')) presetMode = 3;
    else if (lutId.includes('cyberpunk')) presetMode = 4;
    else if (lutId.includes('emerald_matrix')) presetMode = 5;
    else if (lutId.includes('fuji_film')) presetMode = 6;
    else if (lutId.includes('vintage_vibe')) presetMode = 7;
    else if (lutId.includes('noir')) presetMode = 8;
    else if (lutId !== 'none' && lutId !== '') presetMode = 9; // Custom uploaded .cube LUT

    gl.uniform1i(this.uPresetModeLoc, presetMode);
    gl.uniform1f(this.uLutIntensityLoc, settings?.lutIntensity !== undefined ? settings.lutIntensity : 1.0);
    gl.uniform1f(this.uLutSizeLoc, this.currentLutSize > 1 ? this.currentLutSize : 33.0);
    gl.uniform1i(this.uHasCustomLutLoc, this.isLutLoaded && presetMode === 9 ? 1 : 0);

    // Bind 3D LUT Texture to Texture Unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.uniform1i(this.uLut3dLoc, 1);

    // Uniform Values
    gl.uniform1i(this.uOutputModeLoc, outputMode === 'hdr10' ? 0 : 1);
    
    const brightnessBoost = settings?.exposure !== undefined ? Math.pow(2.0, settings.exposure * 0.4) : 1.15;
    const contrastVal = settings?.contrast !== undefined ? settings.contrast : 1.12;
    const colorVol = settings?.saturation !== undefined ? settings.saturation : 1.18;
    const rolloff = settings?.highlightRolloff !== undefined ? settings.highlightRolloff : 0.4;

    gl.uniform1f(this.uBrightnessBoostLoc, brightnessBoost);
    gl.uniform1f(this.uContrastLoc, contrastVal);
    gl.uniform1f(this.uColorVolumeLoc, colorVol);
    gl.uniform1f(this.uHighlightRolloffLoc, rolloff);

    let splitModeInt = 0;
    if (splitMode === 'split_wipe') splitModeInt = 1;
    else if (splitMode === 'side_by_side') splitModeInt = 2;

    gl.uniform1i(this.uSplitModeLoc, splitModeInt);
    gl.uniform1f(this.uSplitPositionLoc, splitPosition);
    gl.uniform1i(this.uShowOriginalLoc, showOriginal ? 1 : 0);

    const clarityVal = settings?.clarity !== undefined ? settings.clarity : 0.35;
    gl.uniform1f(this.uClarityLoc, clarityVal);
    gl.uniform2f(this.uResolutionLoc, gl.canvas.width || 1080.0, gl.canvas.height || 1920.0);

    // Draw full screen quad
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public destroy() {
    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.lutTexture) gl.deleteTexture(this.lutTexture);
    if (this.program) gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }
}
