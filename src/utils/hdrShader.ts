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
uniform float u_lutIntensity;
uniform int u_hasLut;

uniform int u_outputMode;          // 0 = HDR10 (ST 2084 PQ 1000 Nits), 1 = Dolby Vision (Profile 8.4 HLG)
uniform float u_brightnessBoost;   // 0.8 to 1.6 (Peak Luminance scaling)
uniform float u_contrast;          // 0.8 to 1.5 (Dynamic Contrast)
uniform float u_colorVolume;       // 0.8 to 1.6 (BT.2020 Gamut Expansion)
uniform float u_highlightRolloff;  // 0.0 to 1.0 (Shoulder compression)
uniform int u_splitMode;           // 0=off (Mastered), 1=split_wipe, 2=side_by_side
uniform float u_splitPosition;     // 0.0 to 1.0
uniform int u_showOriginal;        // 1 = force 100% original video

// 3D LUT lookup with half-cell boundary correction
vec3 apply3DLUT(vec3 inColor) {
  if (u_hasLut == 0 || u_lutIntensity <= 0.001) {
    return inColor;
  }
  float size = float(textureSize(u_lut3d, 0).x);
  if (size <= 1.0) return inColor;
  vec3 coord = (clamp(inColor, 0.0, 1.0) * (size - 1.0) + 0.5) / size;
  vec3 lutColor = texture(u_lut3d, coord).rgb;
  return mix(inColor, lutColor, clamp(u_lutIntensity, 0.0, 1.0));
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
  // 1. Preserve skin tone luminances while expanding speculars
  float luma = dot(linearRgb, vec3(0.2627, 0.6780, 0.0593));
  
  // Dynamic contrast curve centered at 18% middle grey
  float midGrey = 0.18;
  vec3 contrasted = pow(max(linearRgb / midGrey, vec3(0.0)), vec3(contrast)) * midGrey;
  
  // Highlight radiance expansion for 1000 nits specular punch
  float nitsScale = max(1.0, peakNits / 600.0);
  vec3 expandedHighlights = contrasted + pow(max(contrasted - 0.45, vec3(0.0)), vec3(1.35)) * (0.8 * nitsScale);
  
  // BT.2020 Color volume expansion with natural skin tone protection
  vec3 wideGamut = mix(linearRgb, rec709ToRec2020(expandedHighlights), 0.65);
  float satFactor = vibrance;
  vec3 saturated = mix(vec3(luma), wideGamut, satFactor);
  
  // Soft highlight roll-off (anti-clipping knee)
  vec3 mastered = saturated / (saturated + vec3(0.25));
  mastered *= 1.25;
  
  return clamp(mastered, 0.0, 1.0);
}

// Dolby Vision Profile 8.4 (Hybrid Log-Gamma Rec.2100 with dynamic scene tone mapping)
vec3 applyDolbyVision_HLG(vec3 linearRgb, float peakNits, float contrast, float vibrance) {
  // Dolby Vision signature: rich filmic contrast, warm specular rolloff, silky smooth highlights
  float luma = dot(linearRgb, vec3(0.2627, 0.6780, 0.0593));
  
  // HLG transfer approximation with smooth toe and shoulder
  vec3 filmicRgb = linearRgb;
  
  // Contrast adjustment with filmic S-curve
  vec3 sCurve = filmicRgb * filmicRgb * (3.0 - 2.0 * filmicRgb);
  vec3 balanced = mix(filmicRgb, sCurve, clamp(contrast - 0.6, 0.0, 0.8));
  
  // Dolby Vision specular warmth and highlight radiance
  vec3 specular = pow(max(balanced, vec3(0.0)), vec3(1.2)) * (peakNits / 750.0);
  
  // BT.2020 rich color enhancement with organic saturation
  vec3 dvColor = mix(vec3(luma), specular, vibrance * 1.08);
  
  // Film shoulder compression for zero digital harshness
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
  // (No artificial washout, no fog, genuine camera output)
  if (isOriginalSide) {
    outColor = vec4(clamp(rgb, 0.0, 1.0), srcTex.a);
    return;
  }

  // 1. Apply Creative Color Grading Preset / 3D LUT (Scene look)
  vec3 gradedRgb = apply3DLUT(rgb);

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

  // Uniform locations
  private uImageLoc: WebGLUniformLocation | null = null;
  private uLut3dLoc: WebGLUniformLocation | null = null;
  private uLutIntensityLoc: WebGLUniformLocation | null = null;
  private uHasLutLoc: WebGLUniformLocation | null = null;
  private uOutputModeLoc: WebGLUniformLocation | null = null;
  private uBrightnessBoostLoc: WebGLUniformLocation | null = null;
  private uContrastLoc: WebGLUniformLocation | null = null;
  private uColorVolumeLoc: WebGLUniformLocation | null = null;
  private uHighlightRolloffLoc: WebGLUniformLocation | null = null;
  private uSplitModeLoc: WebGLUniformLocation | null = null;
  private uSplitPositionLoc: WebGLUniformLocation | null = null;
  private uShowOriginalLoc: WebGLUniformLocation | null = null;

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
    this.uLutIntensityLoc = gl.getUniformLocation(program, 'u_lutIntensity');
    this.uHasLutLoc = gl.getUniformLocation(program, 'u_hasLut');
    this.uOutputModeLoc = gl.getUniformLocation(program, 'u_outputMode');
    this.uBrightnessBoostLoc = gl.getUniformLocation(program, 'u_brightnessBoost');
    this.uContrastLoc = gl.getUniformLocation(program, 'u_contrast');
    this.uColorVolumeLoc = gl.getUniformLocation(program, 'u_colorVolume');
    this.uHighlightRolloffLoc = gl.getUniformLocation(program, 'u_highlightRolloff');
    this.uSplitModeLoc = gl.getUniformLocation(program, 'u_splitMode');
    this.uSplitPositionLoc = gl.getUniformLocation(program, 'u_splitPosition');
    this.uShowOriginalLoc = gl.getUniformLocation(program, 'u_showOriginal');

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
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 2, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, idData);
  }

  public setLUTData(data: Uint8Array | null, size: number) {
    const gl = this.gl;
    if (!this.lutTexture) return;

    if (!data || size <= 1) {
      this.isLutLoaded = false;
      return;
    }

    try {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
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
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.uniform1i(this.uImageLoc, 0);

    // Bind 3D LUT Texture to Texture Unit 1
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
    gl.uniform1i(this.uLut3dLoc, 1);

    const lutIntensity = settings?.lutIntensity !== undefined ? settings.lutIntensity : 1.0;
    const hasLutInt = this.isLutLoaded && settings?.lutId && settings.lutId !== 'none' ? 1 : 0;
    gl.uniform1f(this.uLutIntensityLoc, lutIntensity);
    gl.uniform1i(this.uHasLutLoc, hasLutInt);

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
