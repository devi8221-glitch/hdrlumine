export interface ExportOptions {
  durationSeconds: number;
  fps: number;
  width: number;
  height: number;
  fileName: string;
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
      const stream = canvas.captureStream(options.fps);

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

      // Determine best supported mimeType
      const mimeTypes = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=h264',
        'video/webm',
      ];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 16000000, // 16 Mbps
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
