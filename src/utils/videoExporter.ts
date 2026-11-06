export interface ExportOptions {
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
  fileName: string;
  bitrateMbps?: number;
  onProgress: (percent: number, currentSec: number, totalSec: number) => void;
  onComplete: (blobUrl: string, fileName: string) => void;
  onError: (errorMsg: string) => void;
}

export class VideoStreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private progressInterval: number | null = null;
  private cleanups: (() => void)[] = [];

  public async startRecording(
    canvas: HTMLCanvasElement,
    audioElement: HTMLVideoElement | null,
    options: ExportOptions
  ) {
    this.recordedChunks = [];
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.isRecording = true;

    try {
      const stream = canvas.captureStream(options.fps || 30);

      // Attempt to attach audio track smoothly
      if (audioElement) {
        try {
          const audioTrack = (audioElement as any).captureStream?.()?.getAudioTracks()?.[0]
            || (audioElement as any).mozCaptureStream?.()?.getAudioTracks()?.[0];
          if (audioTrack && audioTrack.readyState === 'live') {
            stream.addTrack(audioTrack);
          }
        } catch {
          // Video-only stream if audio capture is restricted
        }
      }

      // Prioritize High-Profile AVC/H.264 & VP9 for wide mobile compatibility
      const mimeTypes = [
        'video/mp4;codecs=avc1.4d4028,mp4a.40.2', // Main Profile H.264 (Most fluid on Android)
        'video/mp4;codecs=avc1.640028,mp4a.40.2', // High Profile H.264
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp09.00.41.08,opus',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      // 14 Mbps default: optimal sweet spot between crystal-clear HDR clarity and buttery-smooth mobile hardware encoding
      const targetBps = (options.bitrateMbps && options.bitrateMbps > 0)
        ? Math.round(options.bitrateMbps * 1000000)
        : 14000000;

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: targetBps,
        audioBitsPerSecond: 192000,
      };
      if (selectedMime) {
        recorderOptions.mimeType = selectedMime;
      }

      this.mediaRecorder = new MediaRecorder(stream, recorderOptions);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      const startTime = performance.now();
      const targetDurationMs = options.durationSeconds * 1000;

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        if (this.progressInterval) {
          clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
        this.cleanups.forEach((fn) => fn());
        this.cleanups = [];

        const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        const finalBlob = new Blob(this.recordedChunks, {
          type: selectedMime || 'video/mp4',
        });
        const blobUrl = URL.createObjectURL(finalBlob);
        const finalName = `${options.fileName.replace(/\.[^/.]+$/, '')}_mastered.${ext}`;
        options.onComplete(blobUrl, finalName);
      };

      // Hook into video element playback events for precise frame-timing
      if (audioElement) {
        const onTimeUpdate = () => {
          if (!this.isRecording) return;
          const cur = audioElement.currentTime;
          const dur = options.durationSeconds;
          const percent = Math.min(99, Math.floor((cur / dur) * 100));
          options.onProgress(percent, Math.floor(cur), Math.ceil(dur));

          if (cur >= dur || audioElement.ended) {
            this.stopRecording();
          }
        };

        const onEnded = () => {
          if (this.isRecording) {
            this.stopRecording();
          }
        };

        audioElement.addEventListener('timeupdate', onTimeUpdate);
        audioElement.addEventListener('ended', onEnded, { once: true });

        this.cleanups.push(() => {
          audioElement.removeEventListener('timeupdate', onTimeUpdate);
          audioElement.removeEventListener('ended', onEnded);
        });
      }

      // Start recording with 1000ms timeslices (reduces GC pauses compared to 250ms)
      this.mediaRecorder.start(1000);

      // Backup wall-clock interval in case video element doesn't emit timeupdate
      this.progressInterval = window.setInterval(() => {
        if (!this.isRecording) return;
        const elapsed = performance.now() - startTime;
        const percent = Math.min(99, Math.floor((elapsed / targetDurationMs) * 100));
        const currentSec = Math.min(options.durationSeconds, Math.floor(elapsed / 1000));
        options.onProgress(percent, currentSec, options.durationSeconds);

        if (elapsed >= targetDurationMs + 800) {
          this.stopRecording();
        }
      }, 250);

    } catch (err: any) {
      this.isRecording = false;
      this.cleanups.forEach((fn) => fn());
      this.cleanups = [];
      options.onError(err?.message || 'Gagal memulai perekaman video di browser');
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('MediaRecorder stop warning:', e);
      }
    }
  }

  public cancel() {
    this.isRecording = false;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('MediaRecorder cancel warning:', e);
      }
    }
    this.recordedChunks = [];
  }
}
