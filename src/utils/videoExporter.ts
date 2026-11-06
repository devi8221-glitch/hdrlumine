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

  public async startRecording(
    canvas: HTMLCanvasElement,
    audioElement: HTMLVideoElement | null,
    options: ExportOptions
  ) {
    this.recordedChunks = [];
    this.isRecording = true;

    try {
      const stream = canvas.captureStream(options.fps || 60);

      // Attempt to attach audio if available
      if (audioElement) {
        try {
          const audioTrack = (audioElement as any).captureStream?.()?.getAudioTracks()?.[0];
          if (audioTrack) {
            stream.addTrack(audioTrack);
          }
        } catch {
          // Canvas video-only recording if audio capture is restricted
        }
      }

      // Prioritize High-Profile AVC/H.264 & VP9 with crystal-clear quantization
      const mimeTypes = [
        'video/mp4;codecs=avc1.64002a,mp4a.40.2', // High Profile Level 4.2 (Sharp 1080p60)
        'video/mp4;codecs=avc1.640028,mp4a.40.2', // High Profile Level 4.0
        'video/mp4;codecs=avc1.4d4028,mp4a.40.2', // Main Profile
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp09.00.41.08,opus',     // VP9 Profile 0 Level 4.1 (Clean 4K/1080p)
        'video/webm;codecs=vp9,opus',
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

      // High bitrate for pristine, uncompressed visual fidelity (35 Mbps default, or user chosen)
      const targetBps = (options.bitrateMbps && options.bitrateMbps > 0)
        ? Math.round(options.bitrateMbps * 1000000)
        : 35000000; // 35 Mbps studio quality

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: targetBps,
        audioBitsPerSecond: 320000,
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

        const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        const finalBlob = new Blob(this.recordedChunks, {
          type: selectedMime || 'video/mp4',
        });
        const blobUrl = URL.createObjectURL(finalBlob);
        const finalName = `${options.fileName.replace(/\.[^/.]+$/, '')}_mastered.${ext}`;
        options.onComplete(blobUrl, finalName);
      };

      this.mediaRecorder.start(250); // Timeslice 250ms

      // Progress reporting timer
      this.progressInterval = window.setInterval(() => {
        if (!this.isRecording) return;
        const elapsed = performance.now() - startTime;
        const percent = Math.min(99, Math.floor((elapsed / targetDurationMs) * 100));
        const currentSec = Math.min(options.durationSeconds, Math.floor(elapsed / 1000));
        options.onProgress(percent, currentSec, options.durationSeconds);

        if (elapsed >= targetDurationMs) {
          this.stopRecording();
        }
      }, 200);

    } catch (err: any) {
      this.isRecording = false;
      options.onError(err?.message || 'Gagal memulai perekaman video di browser');
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  public cancel() {
    this.isRecording = false;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.recordedChunks = [];
  }
}
