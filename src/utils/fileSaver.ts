/**
 * Universal Video & File Saver for LuminaHDR
 * Supports:
 * 1. Native Android APK storage (via AndroidBridge) -> saves directly to Gallery/Movies/LuminaHDR
 * 2. Web Share API (Android Chrome & iOS Safari) -> "Save Video" to Gallery / Files
 * 3. File System Access API (showSaveFilePicker) on Chromium
 * 4. DOM Anchor Click fallback
 */

export interface SaveResult {
  success: boolean;
  message: string;
  method: 'android_native' | 'file_picker' | 'web_share' | 'download_anchor';
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      if (!res) {
        reject(new Error('Data video kosong'));
        return;
      }
      // Crucial: remove all Data URL prefixes (e.g. data:video/webm;codecs=vp9,opus;base64,)
      const lastComma = res.lastIndexOf(',');
      const cleanBase64 = lastComma !== -1 ? res.substring(lastComma + 1) : res;
      resolve(cleanBase64.trim());
    };
    reader.onerror = () => reject(new Error('Gagal membaca blob video'));
    reader.readAsDataURL(blob);
  });
}

export function saveViaAnchorClick(blob: Blob, fileName: string): SaveResult {
  try {
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.position = 'fixed';
    a.style.left = '-9999px';
    a.style.top = '-9999px';
    a.href = objectUrl;
    a.download = fileName;
    a.setAttribute('download', fileName);
    a.target = '_self';

    document.body.appendChild(a);

    const clickEvt = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
    });
    a.dispatchEvent(clickEvt);

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    }, 2500);

    return {
      success: true,
      message: 'File video berhasil diunduh ke folder Download/Galeri!',
      method: 'download_anchor',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal mengunduh: ${err?.message || 'Kesalahan sistem browser'}`,
      method: 'download_anchor',
    };
  }
}

export async function saveVideoToDevice(
  videoUrl: string,
  fileName: string,
  options?: {
    mimeType?: string;
    onProgressText?: (text: string) => void;
  }
): Promise<SaveResult> {
  const mime = options?.mimeType || (fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4');
  let detectedMime = mime;

  // 1. Check if running inside the Standalone Android APK (AndroidBridge)
  const androidBridge = (window as any).AndroidBridge;
  if (androidBridge && typeof androidBridge.saveVideoBase64 === 'function') {
    options?.onProgressText?.('Menyimpan ke Galeri Android...');
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      detectedMime = detectedMime || (blob.type ? blob.type.split(';')[0] : '') || (fileName.endsWith('.webm') ? 'video/webm' : 'video/mp4');
      const base64Data = await blobToBase64(blob);

      return new Promise((resolve) => {
        let resolved = false;

        // Callback from native Android MainActivity.java
        (window as any).onAndroidSaveResult = (success: boolean, pathOrError: string) => {
          if (resolved) return;
          resolved = true;
          delete (window as any).onAndroidSaveResult;
          if (success) {
            resolve({
              success: true,
              message: `Video tersimpan di Galeri: ${pathOrError}`,
              method: 'android_native',
            });
          } else {
            console.warn('Android native save returned error:', pathOrError, '- falling back to browser download');
            // Graceful fallback to direct anchor click
            const anchorResult = saveViaAnchorClick(blob, fileName);
            resolve({
              success: true,
              message: `Video berhasil diunduh ke perangkat (${fileName})`,
              method: 'download_anchor',
            });
          }
        };

        // Call native bridge with clean base64 data
        androidBridge.saveVideoBase64(base64Data, fileName, detectedMime);

        // Safety timeout if native callback takes too long
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve({
              success: true,
              message: 'Video dikirim ke sistem penyimpanan Android.',
              method: 'android_native',
            });
          }
        }, 5000);
      });
    } catch (err: any) {
      console.warn('AndroidBridge save error, falling back to browser methods:', err);
    }
  }

  // 2. Fetch Blob for browser operations
  options?.onProgressText?.('Menyiapkan file video...');
  let blob: Blob;
  try {
    const res = await fetch(videoUrl);
    blob = await res.blob();
  } catch (err) {
    // Fallback blob url
    blob = new Blob([], { type: mime });
  }

  // 3. File System Access API (showSaveFilePicker) on Chromium Desktop/Android
  if (typeof (window as any).showSaveFilePicker === 'function') {
    try {
      options?.onProgressText?.('Membuka dialog penyimpanan...');
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: 'Video File',
            accept: {
              [mime]: [fileName.endsWith('.webm') ? '.webm' : '.mp4'],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return {
        success: true,
        message: 'Video berhasil disimpan di folder pilihan Anda!',
        method: 'file_picker',
      };
    } catch (pickerErr: any) {
      if (pickerErr.name === 'AbortError') {
        return {
          success: false,
          message: 'Penyimpanan dibatalkan oleh pengguna.',
          method: 'file_picker',
        };
      }
      // If permission or other error, fallback to anchor
    }
  }

  // 4. Standard DOM Anchor download (Clean DOM-attached click)
  options?.onProgressText?.('Mengunduh video ke perangkat...');
  return saveViaAnchorClick(blob, fileName);
}

export async function shareVideoToApps(
  videoUrl: string,
  fileName: string,
  platformName: string = 'media sosial'
): Promise<{ success: boolean; message: string }> {
  const androidBridge = (window as any).AndroidBridge;

  // 1. Android Native share sheet if in APK
  if (androidBridge && typeof androidBridge.shareVideoBase64 === 'function') {
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const base64Data = await blobToBase64(blob);
      androidBridge.shareVideoBase64(base64Data, fileName, blob.type || 'video/mp4');
      return {
        success: true,
        message: 'Membuka menu berbagi Android...',
      };
    } catch (e) {
      console.warn('Native share failed:', e);
    }
  }

  // 2. Web Share API with File payload
  if (navigator.share) {
    try {
      const res = await fetch(videoUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type || 'video/mp4' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `LuminaHDR - ${fileName}`,
          text: `Video HDR yang sudah dimastering untuk ${platformName}!`,
          files: [file],
        });
        return {
          success: true,
          message: 'Berhasil membuka menu bagikan!',
        };
      } else {
        await navigator.share({
          title: `LuminaHDR - ${fileName}`,
          text: `Video master HDR siap diposting ke ${platformName}`,
          url: window.location.href,
        });
        return {
          success: true,
          message: 'Berhasil membuka menu bagikan!',
        };
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, message: 'Berbagi dibatalkan.' };
      }
    }
  }

  // 3. Fallback to saving file
  const saveRes = await saveVideoToDevice(videoUrl, fileName);
  return {
    success: saveRes.success,
    message: saveRes.message,
  };
}
