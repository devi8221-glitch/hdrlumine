export interface DemoScene {
  id: string;
  name: string;
  category: string;
  description: string;
}

export const DEMO_SCENES: DemoScene[] = [
  {
    id: 'coastal_sunset',
    name: 'Sunset Golden Hour (1000 Nits)',
    category: 'High Dynamic Range',
    description: 'Pemandangan matahari terbenam sinematik dengan piringan cahaya surya alami dan pantulan air laut.',
  },
  {
    id: 'cinematic_night',
    name: 'Dusk City Skyline',
    category: 'Night Contrast',
    description: 'Pemandangan senja perkotaan dengan gradasi langit biru tua dan pendaran lampu arsitektur.',
  },
];

export class ProceduralHDRGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animFrameId: number | null = null;
  private currentSceneId: string = 'coastal_sunset';
  private time: number = 0;

  constructor(width: number = 1080, height: number = 1920) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D context for demo footage');
    this.ctx = ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setScene(sceneId: string) {
    this.currentSceneId = sceneId;
  }

  public start() {
    if (this.animFrameId) return;
    const loop = () => {
      this.time += 0.016;
      this.renderCurrentScene();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private renderCurrentScene() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const t = this.time;

    if (this.currentSceneId === 'cinematic_night') {
      this.drawNightSkyline(ctx, width, height, t);
    } else {
      this.drawSunsetScene(ctx, width, height, t);
    }
  }

  private drawSunsetScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // 1. Natural Sky Gradient (Deep dusk blue -> Warm Amber -> Golden Horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
    skyGrad.addColorStop(0.0, '#111827');
    skyGrad.addColorStop(0.35, '#1e1b4b');
    skyGrad.addColorStop(0.65, '#b45309');
    skyGrad.addColorStop(0.85, '#f59e0b');
    skyGrad.addColorStop(1.0, '#fef3c7');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.62);

    // 2. High-Dynamic-Range Solar Core (Clean 1000 Nits Sun Disc)
    const sunX = w * 0.5;
    const sunY = h * 0.45;
    const sunPulse = Math.sin(t * 1.5) * 5;

    // Atmospheric warm corona
    const coronaGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 320);
    coronaGrad.addColorStop(0, 'rgba(255, 250, 220, 0.95)');
    coronaGrad.addColorStop(0.18, 'rgba(253, 224, 71, 0.7)');
    coronaGrad.addColorStop(0.45, 'rgba(245, 158, 11, 0.35)');
    coronaGrad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 320, 0, Math.PI * 2);
    ctx.fill();

    // Pure white specular solar core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 48 + sunPulse, 0, Math.PI * 2);
    ctx.fill();

    // 3. Ocean Surface (Calm gentle waves reflecting solar path)
    const oceanY = h * 0.62;
    const oceanH = h - oceanY;
    const oceanGrad = ctx.createLinearGradient(0, oceanY, 0, h);
    oceanGrad.addColorStop(0, '#78350f');
    oceanGrad.addColorStop(0.25, '#451a03');
    oceanGrad.addColorStop(0.6, '#172554');
    oceanGrad.addColorStop(1, '#020617');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, oceanY, w, oceanH);

    // Golden specular reflection beam on water
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 28; i++) {
      const lineY = oceanY + (i / 28) * oceanH;
      const progress = i / 28;
      const lineWidth = (progress * w * 0.4) + Math.sin(t * 3 + i) * 20;
      const lineX = sunX - lineWidth / 2;
      
      const beamGrad = ctx.createLinearGradient(lineX, lineY, lineX + lineWidth, lineY);
      beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
      beamGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.9)');
      beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = beamGrad;
      ctx.fillRect(lineX, lineY, lineWidth, 4 + progress * 6);
    }
    ctx.restore();

    // 4. Distant Mountain Silhouette
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, oceanY);
    ctx.lineTo(w * 0.2, oceanY - 55);
    ctx.lineTo(w * 0.38, oceanY - 110);
    ctx.lineTo(w * 0.48, oceanY - 45);
    ctx.lineTo(w * 0.52, oceanY);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w * 0.55, oceanY);
    ctx.lineTo(w * 0.72, oceanY - 80);
    ctx.lineTo(w * 0.9, oceanY - 140);
    ctx.lineTo(w, oceanY - 60);
    ctx.lineTo(w, oceanY);
    ctx.closePath();
    ctx.fill();
  }

  private drawNightSkyline(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
    // Dusk Night Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.7);
    skyGrad.addColorStop(0, '#020617');
    skyGrad.addColorStop(0.5, '#0f172a');
    skyGrad.addColorStop(0.85, '#1e293b');
    skyGrad.addColorStop(1, '#334155');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.7);

    // City Buildings Silhouettes
    const groundY = h * 0.7;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, groundY, w, h - groundY);

    const buildings = [
      { x: w * 0.05, width: w * 0.16, height: 420 },
      { x: w * 0.22, width: w * 0.22, height: 620 },
      { x: w * 0.46, width: w * 0.18, height: 780 },
      { x: w * 0.66, width: w * 0.20, height: 540 },
      { x: w * 0.88, width: w * 0.14, height: 380 },
    ];

    buildings.forEach((b, i) => {
      const topY = groundY - b.height;
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(b.x, topY, b.width, b.height);

      // Building warm glowing architectural windows
      const rows = 18;
      const cols = 5;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const winX = b.x + 8 + c * (b.width / cols);
          const winY = topY + 20 + r * (b.height / rows);
          const isLit = ((i * 7 + r * 3 + c * 5) % 3 !== 0);
          if (isLit) {
            ctx.fillStyle = (r % 2 === 0) ? 'rgba(254, 240, 138, 0.85)' : 'rgba(245, 158, 11, 0.75)';
            ctx.fillRect(winX, winY, (b.width / cols) - 6, (b.height / rows) - 8);
          }
        }
      }

      // Spire Beacon on tallest building
      if (i === 2) {
        ctx.fillStyle = '#ef4444';
        const blink = Math.sin(t * 4) > 0 ? 1 : 0.2;
        ctx.globalAlpha = blink;
        ctx.beginPath();
        ctx.arc(b.x + b.width / 2, topY - 15, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
  }
}
