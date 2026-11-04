import { ScopeMode } from '../types/video';

export class ScopesRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sampleCanvas: HTMLCanvasElement;
  private sampleCtx: CanvasRenderingContext2D;

  constructor(targetCanvas: HTMLCanvasElement) {
    this.canvas = targetCanvas;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Cannot get 2D context for scopes');
    this.ctx = ctx;

    // Offscreen small sample canvas to downsample input frame for 60fps performance
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 160;
    this.sampleCanvas.height = 90;
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  public render(sourceCanvas: HTMLCanvasElement, mode: ScopeMode) {
    if (mode === 'none') return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // Dark sleek backdrop with subtle grid
    ctx.fillStyle = '#080a0f';
    ctx.fillRect(0, 0, w, h);

    // Downsample source to small resolution for instantaneous pixel analysis
    this.sampleCtx.drawImage(sourceCanvas, 0, 0, this.sampleCanvas.width, this.sampleCanvas.height);
    const imgData = this.sampleCtx.getImageData(0, 0, this.sampleCanvas.width, this.sampleCanvas.height);
    const data = imgData.data;

    if (mode === 'waveform') {
      this.renderWaveform(ctx, data, this.sampleCanvas.width, this.sampleCanvas.height, w, h);
    } else if (mode === 'vectorscope') {
      this.renderVectorscope(ctx, data, this.sampleCanvas.width, this.sampleCanvas.height, w, h);
    } else if (mode === 'rgb_parade') {
      this.renderRGBParade(ctx, data, this.sampleCanvas.width, this.sampleCanvas.height, w, h);
    }
  }

  private renderWaveform(
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sw: number,
    sh: number,
    w: number,
    h: number
  ) {
    const padX = 36;
    const padY = 16;
    const plotW = w - padX - 12;
    const plotH = h - padY * 2;

    // Graticule grid
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)';
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';

    const ireSteps = [
      { ire: 120, label: '120 HDR', color: 'rgba(239, 68, 68, 0.4)' },
      { ire: 100, label: '100 SDR', color: 'rgba(234, 179, 8, 0.5)' },
      { ire: 50, label: '50 Mid', color: 'rgba(59, 130, 246, 0.3)' },
      { ire: 18, label: '18 Skin', color: 'rgba(16, 185, 129, 0.3)' },
      { ire: 0, label: '0 Black', color: 'rgba(148, 163, 184, 0.3)' },
    ];

    ireSteps.forEach(({ ire, label, color }) => {
      // Map 0-120 IRE to plotH
      const y = padY + plotH - (ire / 120) * plotH;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(w - 12, y);
      ctx.stroke();

      ctx.fillText(label, 4, y + 3);
    });

    // Waveform points
    ctx.fillStyle = 'rgba(52, 211, 153, 0.18)'; // Luma phosphor green
    for (let py = 0; py < sh; py += 1) {
      for (let px = 0; px < sw; px += 1) {
        const idx = (py * sw + px) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Rec.709 luma
        const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const ire = (luma / 255) * 100;

        const plotX = padX + (px / sw) * plotW;
        const plotY = padY + plotH - (ire / 120) * plotH;

        ctx.fillRect(plotX, plotY, 1.2, 1.2);
      }
    }
  }

  private renderVectorscope(
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sw: number,
    sh: number,
    w: number,
    h: number
  ) {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const radius = Math.min(w, h) * 0.42;

    // Reticle rings
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();

    // Skin Tone Line ("I-line" at ~57 degrees / -123 deg)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    const skinAngle = -2.15; // standard I-line angle in U-V plane
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(skinAngle) * radius, cy + Math.sin(skinAngle) * radius);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('Skin', cx + Math.cos(skinAngle) * (radius + 8) - 10, cy + Math.sin(skinAngle) * (radius + 8));

    // Color Targets (R, Mg, B, Cy, G, Yl)
    const targets = [
      { name: 'R', angle: 1.80, r: 0.75, color: '#ef4444' },
      { name: 'Mg', angle: 2.85, r: 0.75, color: '#ec4899' },
      { name: 'B', angle: -2.35, r: 0.75, color: '#3b82f6' },
      { name: 'Cy', angle: -1.35, r: 0.75, color: '#06b6d4' },
      { name: 'G', angle: -0.30, r: 0.75, color: '#22c55e' },
      { name: 'Yl', angle: 0.75, r: 0.75, color: '#eab308' },
    ];

    targets.forEach(({ name, angle, r, color }) => {
      const tx = cx + Math.cos(angle) * (radius * r);
      const ty = cy + Math.sin(angle) * (radius * r);
      ctx.strokeStyle = color;
      ctx.strokeRect(tx - 4, ty - 4, 8, 8);
      ctx.fillStyle = color;
      ctx.fillText(name, tx + 6, ty + 3);
    });

    // Plot vectorscope points (Cb, Cr)
    ctx.fillStyle = 'rgba(14, 165, 233, 0.22)';
    const totalPixels = sw * sh;
    for (let i = 0; i < totalPixels; i += 2) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // YCbCr conversion
      const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Scale to radius
      const px = cx + (cb / 128) * radius;
      const py = cy - (cr / 128) * radius;

      ctx.fillRect(px, py, 1.2, 1.2);
    }
  }

  private renderRGBParade(
    ctx: CanvasRenderingContext2D,
    data: Uint8ClampedArray,
    sw: number,
    sh: number,
    w: number,
    h: number
  ) {
    const channelW = (w - 24) / 3;
    const plotH = h - 32;
    const topY = 20;

    const channels = [
      { name: 'RED', color: 'rgba(239, 68, 68, 0.25)', labelColor: '#ef4444', idxOffset: 0 },
      { name: 'GREEN', color: 'rgba(34, 197, 94, 0.25)', labelColor: '#22c55e', idxOffset: 1 },
      { name: 'BLUE', color: 'rgba(59, 130, 246, 0.25)', labelColor: '#3b82f6', idxOffset: 2 },
    ];

    ctx.font = '11px "JetBrains Mono", monospace';

    channels.forEach((ch, cIndex) => {
      const startX = 8 + cIndex * (channelW + 4);

      // Label & boundary
      ctx.fillStyle = ch.labelColor;
      ctx.fillText(ch.name, startX + 4, 14);

      ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
      ctx.strokeRect(startX, topY, channelW, plotH);

      // Mid-line
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
      ctx.beginPath();
      ctx.moveTo(startX, topY + plotH * 0.5);
      ctx.lineTo(startX + channelW, topY + plotH * 0.5);
      ctx.stroke();

      // Plot channel samples
      ctx.fillStyle = ch.color;
      for (let py = 0; py < sh; py += 1) {
        for (let px = 0; px < sw; px += 2) {
          const pixelIdx = (py * sw + px) * 4;
          const val = data[pixelIdx + ch.idxOffset];
          const pxX = startX + (px / sw) * channelW;
          const pxY = topY + plotH - (val / 255) * plotH;
          ctx.fillRect(pxX, pxY, 1.2, 1.2);
        }
      }
    });
  }
}
