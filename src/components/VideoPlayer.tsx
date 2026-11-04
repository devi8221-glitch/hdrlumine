import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ColorGradingSettings, SplitViewMode } from '../types/video';
import { HDRShaderEngine, HDROutputMode } from '../utils/hdrShader';
import { ProceduralHDRGenerator, DEMO_SCENES } from '../utils/demoFootage';
import { ParsedLUT } from '../utils/lutParser';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Upload,
  Split,
  Eye,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';

export type PlatformTarget = 'tiktok' | 'instagram' | 'whatsapp';

interface VideoPlayerProps {
  outputMode: HDROutputMode;
  onOutputModeChange: (mode: HDROutputMode) => void;
  activePlatform: PlatformTarget;
  onSelectPlatform?: (platform: PlatformTarget) => void;
  activeLUT?: ParsedLUT | null;
  settings: ColorGradingSettings;
  splitMode: SplitViewMode;
  onSplitModeChange: (mode: SplitViewMode) => void;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
  onSourceVideoReady: (video: HTMLVideoElement | null) => void;
  onVideoMetaLoaded?: (meta: { duration: number; width: number; height: number; name: string }) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  uploadedFile?: File | null;
  onFileUpload?: (file: File) => void;
  activeDemoScene?: string;
  onSelectDemoScene?: (sceneId: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  outputMode,
  onOutputModeChange,
  activePlatform,
  onSelectPlatform,
  activeLUT,
  settings,
  splitMode,
  onSplitModeChange,
  onCanvasReady,
  onSourceVideoReady,
  onVideoMetaLoaded,
  isFullscreen,
  onToggleFullscreen,
  uploadedFile,
  onFileUpload,
  activeDemoScene = 'coastal_sunset',
  onSelectDemoScene,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shaderEngineRef = useRef<HDRShaderEngine | null>(null);
  const demoGeneratorRef = useRef<ProceduralHDRGenerator | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [splitPosition, setSplitPosition] = useState<number>(0.5);
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const [isUsingCustomVideo, setIsUsingCustomVideo] = useState<boolean>(false);
  const [customVideoName, setCustomVideoName] = useState<string>('');
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>('9/16');

  // Instant Comparison Toggle
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [playFeedback, setPlayFeedback] = useState<'play' | 'pause' | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize WebGL engine & Demo generator
  useEffect(() => {
    if (!canvasRef.current) return;

    canvasRef.current.width = 1080;
    canvasRef.current.height = 1920;

    shaderEngineRef.current = new HDRShaderEngine(canvasRef.current);
    if (activeLUT && activeLUT.data) {
      shaderEngineRef.current.setLUTData(activeLUT.data, activeLUT.size);
    }
    onCanvasReady(canvasRef.current);

    demoGeneratorRef.current = new ProceduralHDRGenerator(1080, 1920);
    demoGeneratorRef.current.setScene(activeDemoScene);
    demoGeneratorRef.current.start();

    return () => {
      demoGeneratorRef.current?.stop();
      shaderEngineRef.current?.destroy();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Sync 3D LUT when active preset LUT changes
  useEffect(() => {
    if (shaderEngineRef.current) {
      if (activeLUT && activeLUT.data && activeLUT.size > 1) {
        shaderEngineRef.current.setLUTData(activeLUT.data, activeLUT.size);
      } else {
        shaderEngineRef.current.setLUTData(null, 0);
      }
    }
  }, [activeLUT]);

  // Update demo scene if changed
  useEffect(() => {
    if (demoGeneratorRef.current && !isUsingCustomVideo) {
      demoGeneratorRef.current.setScene(activeDemoScene);
    }
  }, [activeDemoScene, isUsingCustomVideo]);

  // Main rendering loop (Runs 60 FPS smoothly with WebGL2)
  const renderFrame = useCallback(() => {
    if (!shaderEngineRef.current || !canvasRef.current) return;

    if (isUsingCustomVideo && videoRef.current) {
      if (!videoRef.current.paused && !videoRef.current.ended) {
        shaderEngineRef.current.render(
          videoRef.current,
          outputMode,
          splitMode,
          splitPosition,
          isHoldingOriginal,
          settings
        );
        setCurrentTime(videoRef.current.currentTime);
      }
    } else if (demoGeneratorRef.current) {
      const demoCanvas = demoGeneratorRef.current.getCanvas();
      shaderEngineRef.current.render(
        demoCanvas,
        outputMode,
        splitMode,
        splitPosition,
        isHoldingOriginal,
        settings
      );
    }

    animFrameRef.current = requestAnimationFrame(renderFrame);
  }, [outputMode, splitMode, splitPosition, isHoldingOriginal, isUsingCustomVideo, settings]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderFrame]);

  // Handle uploaded video file
  const loadVideoFile = useCallback((file: File) => {
    const video = videoRef.current;
    if (!video) return;

    const url = URL.createObjectURL(file);
    video.src = url;
    video.load();

    video.onloadedmetadata = () => {
      const w = video.videoWidth || 1080;
      const h = video.videoHeight || 1920;
      const dur = video.duration || 15;

      if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }

      setDuration(dur);
      setIsUsingCustomVideo(true);
      setCustomVideoName(file.name);
      setVideoAspectRatio(`${w}/${h}`);

      demoGeneratorRef.current?.stop();
      video.play().then(() => setIsPlaying(true)).catch(() => {});

      onSourceVideoReady(video);
      onVideoMetaLoaded?.({
        duration: dur,
        width: w,
        height: h,
        name: file.name,
      });
    };
  }, [onSourceVideoReady, onVideoMetaLoaded]);

  useEffect(() => {
    if (uploadedFile) {
      loadVideoFile(uploadedFile);
    }
  }, [uploadedFile, loadVideoFile]);

  // Video Transport Handlers
  const togglePlay = () => {
    if (isUsingCustomVideo && videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      setIsPlaying(!isPlaying);
      if (isPlaying) {
        demoGeneratorRef.current?.stop();
      } else {
        demoGeneratorRef.current?.start();
      }
    }
  };

  const handleSeek = (timeSec: number) => {
    setCurrentTime(timeSec);
    if (isUsingCustomVideo && videoRef.current) {
      videoRef.current.currentTime = timeSec;
    }
  };

  const handleCanvasTap = () => {
    if (isDraggingSplit) return;
    const nextState = !isPlaying;
    togglePlay();
    setPlayFeedback(nextState ? 'play' : 'pause');
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setPlayFeedback(null);
    }, 600);
  };

  // Split Wipe Touch/Mouse dragging
  const handleSplitStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingSplit(true);
  };

  const handleSplitMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDraggingSplit || !canvasWrapperRef.current) return;
      const rect = canvasWrapperRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const relativeX = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0.01, Math.min(0.99, relativeX));
      setSplitPosition(clamped);
    },
    [isDraggingSplit]
  );

  const handleSplitEnd = useCallback(() => {
    if (isDraggingSplit) setIsDraggingSplit(false);
  }, [isDraggingSplit]);

  useEffect(() => {
    if (isDraggingSplit) {
      window.addEventListener('mousemove', handleSplitMove);
      window.addEventListener('mouseup', handleSplitEnd);
      window.addEventListener('touchmove', handleSplitMove);
      window.addEventListener('touchend', handleSplitEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleSplitMove);
      window.removeEventListener('mouseup', handleSplitEnd);
      window.removeEventListener('touchmove', handleSplitMove);
      window.removeEventListener('touchend', handleSplitEnd);
    };
  }, [isDraggingSplit, handleSplitMove, handleSplitEnd]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isComparisonActive = splitMode !== 'off';

  return (
    <div className="flex flex-col h-full w-full bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl relative select-none">
      {/* Top Header Bar: Video Source Info & Upload */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-neutral-900/95 border-b border-neutral-800 shrink-0 z-20">
        {/* Active Source & Mode Tag */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-neutral-200 truncate max-w-[150px] sm:max-w-[240px]">
              {isUsingCustomVideo
                ? customVideoName
                : (activeDemoScene === 'cinematic_night' ? 'Night City Lights' : 'Sunset Golden Hour')}
            </span>
            <span className="text-neutral-600 hidden sm:inline">•</span>
            <span className="text-[10px] text-amber-400 uppercase font-bold hidden sm:inline">
              {outputMode === 'dolby_vision' ? 'Dolby Vision HLG' : 'HDR10 PQ'}
            </span>
          </div>
        </div>

        {/* Video Upload & Demo Action */}
        <div className="flex items-center gap-2">
          {isUsingCustomVideo ? (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded border border-emerald-500/40 truncate max-w-[150px] sm:max-w-xs">
              ✓ {customVideoName}
            </span>
          ) : (
            <div className="hidden sm:flex items-center gap-1">
              {DEMO_SCENES.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => onSelectDemoScene?.(scene.id)}
                  className={`px-2 py-1 text-[11px] rounded transition-all cursor-pointer ${
                    activeDemoScene === scene.id
                      ? 'bg-neutral-800 text-amber-400 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {scene.name.split(' (')[0]}
                </button>
              ))}
            </div>
          )}

          <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all active:scale-95 cursor-pointer shadow-sm">
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isUsingCustomVideo ? 'Ganti Video' : 'Unggah Video'}</span>
            <input
              type="file"
              accept="video/*,.mp4,.mov,.webm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload?.(file);
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Main Expansive Video Viewport (Maximizes visual canvas) */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0 select-none p-1 sm:p-2"
      >
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          loop
          muted={isMuted}
          crossOrigin="anonymous"
        />

        {/* Adaptive Canvas Wrapper */}
        <div
          ref={canvasWrapperRef}
          onClick={handleCanvasTap}
          style={{ aspectRatio: videoAspectRatio }}
          className="relative h-full max-h-full max-w-full flex items-center justify-center shadow-2xl overflow-hidden group cursor-pointer rounded-lg border border-neutral-900"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pointer-events-none"
          />

          {/* Tap-to-play Flash Icon */}
          {playFeedback && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 transition-all duration-300">
              <div className="w-16 h-16 rounded-full bg-neutral-950/80 backdrop-blur-md border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-2xl scale-110 animate-pulse">
                {playFeedback === 'play' ? (
                  <Play className="w-8 h-8 fill-current translate-x-0.5" />
                ) : (
                  <Pause className="w-8 h-8 fill-current" />
                )}
              </div>
            </div>
          )}

          {/* Top Badges (Original SDR vs Mastered Preset) */}
          {isComparisonActive && !isHoldingOriginal && (
            <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-20">
              <div className="px-2.5 py-1 bg-neutral-950/85 backdrop-blur-md rounded-md text-[11px] font-mono border border-neutral-700 text-neutral-300 flex items-center gap-1.5 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-neutral-400" />
                <span>ORIGINAL (SDR)</span>
              </div>
              <div className={`px-2.5 py-1 backdrop-blur-md rounded-md text-[11px] font-mono text-white flex items-center gap-1.5 shadow-lg ${
                activePlatform === 'tiktok'
                  ? 'bg-pink-950/85 border border-pink-400 text-pink-200'
                  : activePlatform === 'instagram'
                  ? 'bg-rose-950/85 border border-rose-400 text-rose-200'
                  : 'bg-emerald-950/85 border border-emerald-400 text-emerald-200'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {activePlatform === 'tiktok' && 'MASTERED TIKTOK (HDR10 1000 NITS)'}
                  {activePlatform === 'instagram' && 'MASTERED REELS (DOLBY VISION HLG)'}
                  {activePlatform === 'whatsapp' && 'MASTERED WHATSAPP (ANTI-LUNTUR HD)'}
                </span>
              </div>
            </div>
          )}

          {/* Forced Original Indicator */}
          {isHoldingOriginal && (
            <div className="absolute top-3 inset-x-3 py-1.5 px-3 bg-neutral-950/90 backdrop-blur-md rounded-md text-xs font-mono border border-neutral-600 text-neutral-200 text-center shadow-xl z-20 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              <span>MENAMPILKAN 100% ORIGINAL SOURCE (SDR)</span>
            </div>
          )}

          {/* Split Screen Wipe Draggable Handle */}
          {isComparisonActive && !isHoldingOriginal && (
            <div
              onMouseDown={handleSplitStart}
              onTouchStart={handleSplitStart}
              onClick={(e) => e.stopPropagation()}
              style={{ left: `${splitPosition * 100}%` }}
              className="absolute top-0 bottom-0 w-12 -ml-6 flex items-center justify-center cursor-ew-resize z-20 select-none group/handle touch-none"
            >
              {/* Vertical Gold Divider Line */}
              <div className="w-[2px] h-full bg-gradient-to-b from-amber-400 via-amber-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.95)]" />

              {/* Thumb grip */}
              <div className="absolute w-8 h-12 rounded-xl bg-neutral-900/95 border-2 border-amber-400 text-amber-400 flex flex-col items-center justify-center shadow-2xl group-hover/handle:scale-110 active:scale-115 transition-transform backdrop-blur-md">
                <div className="flex items-center justify-center gap-0.5 text-[9px] font-bold">
                  <span>◀</span>
                  <span>▶</span>
                </div>
              </div>

              {/* Percentage label */}
              <div className="absolute bottom-6 px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-neutral-700 text-[10px] font-mono text-neutral-200 pointer-events-none whitespace-nowrap shadow-lg">
                SDR {Math.round(splitPosition * 100)}% · HDR {Math.round((1 - splitPosition) * 100)}%
              </div>
            </div>
          )}

          {/* Floating Hold-to-Compare pill (accessible at bottom right) */}
          <div className="absolute bottom-3 right-3 z-20 pointer-events-auto">
            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsHoldingOriginal(true);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                setIsHoldingOriginal(false);
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsHoldingOriginal(true);
              }}
              onMouseUp={(e) => {
                e.stopPropagation();
                setIsHoldingOriginal(false);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-xl transition-all active:scale-95 flex items-center gap-1.5 select-none ${
                isHoldingOriginal
                  ? 'bg-neutral-800 text-white border border-neutral-600 shadow-inner'
                  : 'bg-neutral-950/85 text-amber-300 border border-amber-400/60'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>{isHoldingOriginal ? 'Original Video' : 'Tahan Compare'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Dock: Compact Comparison & Transport Controls */}
      <div className="p-2 sm:p-3 bg-neutral-900/95 border-t border-neutral-800 space-y-2 shrink-0">
        {/* Comparison Mode Selector Row */}
        <div className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-neutral-950/70 border border-neutral-800 text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-neutral-400 hidden xs:inline font-medium mr-1">Tampilan:</span>
            <button
              onClick={() => onSplitModeChange('split_wipe')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                splitMode === 'split_wipe'
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
              }`}
            >
              <Split className="w-3 h-3" />
              <span>Split Wipe</span>
            </button>
            <button
              onClick={() => onSplitModeChange('off')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                splitMode === 'off'
                  ? 'bg-amber-400 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800'
              }`}
            >
              HDR Penuh
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-neutral-400 text-[11px] hidden sm:inline">Standar:</span>
            <span className="font-mono text-amber-400 font-bold text-[11px]">
              {outputMode === 'hdr10' ? 'BT.2020 PQ 10-Bit' : 'BT.2020 HLG 10-Bit'}
            </span>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-400 w-11 text-right tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 flex items-center h-5">
            <input
              type="range"
              min="0"
              max={duration}
              step="0.05"
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
            />
          </div>
          <span className="text-xs font-mono text-neutral-400 w-11 tabular-nums">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls & Tools */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              className="p-2 sm:p-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 active:scale-90 text-neutral-950 font-bold transition-all cursor-pointer shadow-md shadow-amber-400/20"
              title={isPlaying ? 'Jeda' : 'Putar'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
            </button>
            <button
              onClick={() => handleSeek(0)}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:scale-90 text-neutral-300 transition-all cursor-pointer"
              title="Ulangi dari Awal"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:scale-90 text-neutral-300 transition-all cursor-pointer"
              title={isMuted ? 'Nyalakan Audio' : 'Bisukan Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:scale-90 text-neutral-300 transition-all cursor-pointer text-xs flex items-center gap-1.5"
                title={isFullscreen ? 'Keluar dari Layar Penuh' : 'Layar Penuh'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isFullscreen ? 'Kecilkan' : 'Layar Penuh'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
