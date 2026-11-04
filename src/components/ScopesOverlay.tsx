import React, { useEffect, useRef } from 'react';
import { ScopeMode } from '../types/video';
import { ScopesRenderer } from '../utils/scopesRenderer';
import { Activity, X, Eye } from 'lucide-react';

interface ScopesOverlayProps {
  sourceCanvas: HTMLCanvasElement | null;
  activeScope: ScopeMode;
  onSelectScope: (mode: ScopeMode) => void;
  onClose: () => void;
}

export const ScopesOverlay: React.FC<ScopesOverlayProps> = ({
  sourceCanvas,
  activeScope,
  onSelectScope,
  onClose,
}) => {
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ScopesRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!scopeCanvasRef.current) return;
    rendererRef.current = new ScopesRenderer(scopeCanvasRef.current);
  }, []);

  useEffect(() => {
    if (activeScope === 'none' || activeScope === 'false_color') {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const loop = () => {
      if (sourceCanvas && rendererRef.current && scopeCanvasRef.current) {
        rendererRef.current.render(sourceCanvas, activeScope);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [sourceCanvas, activeScope]);

  if (activeScope === 'none' || activeScope === 'false_color') return null;

  return (
    <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-800 rounded-xl overflow-hidden shadow-2xl p-3 space-y-3 w-80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-white tracking-tight">Real-Time Video Scopes</span>
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scope Mode Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-950/60 rounded-lg">
        <button
          onClick={() => onSelectScope('waveform')}
          className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
            activeScope === 'waveform'
              ? 'bg-neutral-800 text-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Waveform
        </button>
        <button
          onClick={() => onSelectScope('vectorscope')}
          className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
            activeScope === 'vectorscope'
              ? 'bg-neutral-800 text-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Vectorscope
        </button>
        <button
          onClick={() => onSelectScope('rgb_parade')}
          className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
            activeScope === 'rgb_parade'
              ? 'bg-neutral-800 text-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          RGB Parade
        </button>
      </div>

      {/* Canvas Viewport */}
      <div className="relative rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center aspect-[4/3]">
        <canvas
          ref={scopeCanvasRef}
          width={320}
          height={240}
          className="w-full h-full object-contain"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1">
        <span>Sampling: 60 FPS</span>
        <span>Standar IRE: ITU-R BT.709</span>
      </div>
    </div>
  );
};
