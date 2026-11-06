package com.luminahdr.mastering;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/**
 * Universal Scoped Storage & Gallery Exporter for LuminaHDR.
 * Fully compliant with Android 10, 11, 12, 13, 14, 15, and 16 MediaStore APIs,
 * supporting Scoped Storage, DCIM/Movies gallery indexing, and resilient Base64 decoding.
 */
public class VideoStorageManager {
    private static final String TAG = "VideoStorageManager";
    private final Context context;

    public VideoStorageManager(Context context) {
        this.context = context.getApplicationContext();
    }

    public static byte[] decodeRobustBase64(String rawInput) throws IllegalArgumentException {
        if (rawInput == null || rawInput.trim().isEmpty()) {
            throw new IllegalArgumentException("Data video base64 kosong.");
        }

        // 1. Cut at the LAST comma to remove any data URL headers (e.g. data:video/webm;codecs=vp9,opus;base64,)
        String clean = rawInput.trim();
        int lastComma = clean.lastIndexOf(',');
        if (lastComma != -1) {
            clean = clean.substring(lastComma + 1);
        }

        // 2. Remove all whitespace, line breaks, quotes, URL encodings
        clean = clean.replaceAll("[\\s\\r\\n\"']+", "");
        clean = clean.replace("%2B", "+").replace("%2F", "/").replace("%3D", "=");

        // 3. Ensure valid 4-byte padding
        int pad = clean.length() % 4;
        if (pad == 2) {
            clean += "==";
        } else if (pad == 3) {
            clean += "=";
        }

        // 4. Multi-scheme decode attempts
        try {
            return Base64.decode(clean, Base64.DEFAULT);
        } catch (IllegalArgumentException e1) {
            try {
                return Base64.decode(clean, Base64.NO_WRAP);
            } catch (IllegalArgumentException e2) {
                try {
                    return Base64.decode(clean, Base64.URL_SAFE);
                } catch (IllegalArgumentException e3) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        try {
                            return java.util.Base64.getDecoder().decode(clean);
                        } catch (Exception e4) {
                            return java.util.Base64.getUrlDecoder().decode(clean);
                        }
                    }
                    throw new IllegalArgumentException("Format data video base-64 tidak dapat diurai: " + e1.getMessage());
                }
            }
        }
    }

    public String saveVideoBase64(String base64Data, String fileName, String mimeType) throws Exception {
        byte[] videoBytes = decodeRobustBase64(base64Data);

        if (videoBytes == null || videoBytes.length == 0) {
            throw new IllegalArgumentException("Ukuran byte video kosong setelah didekode");
        }

        // Sanitize MIME type
        if (mimeType == null || mimeType.trim().isEmpty() || !mimeType.contains("video/")) {
            mimeType = (fileName != null && fileName.endsWith(".webm")) ? "video/webm" : "video/mp4";
        }
        // Extract base mime type if parameters present (e.g. video/mp4;codecs=... -> video/mp4)
        if (mimeType.contains(";")) {
            mimeType = mimeType.substring(0, mimeType.indexOf(";")).trim();
        }

        // Sanitize file name
        if (fileName == null || fileName.trim().isEmpty()) {
            fileName = "LuminaHDR_" + System.currentTimeMillis() + (mimeType.contains("webm") ? ".webm" : ".mp4");
        } else {
            fileName = fileName.replaceAll("[\\\\/:*?\"<>|]", "_");
        }
        if (!fileName.contains(".")) {
            fileName += mimeType.contains("webm") ? ".webm" : ".mp4";
        }

        // 1. Android 10+ (API 29 - 36 / Android 14, 15, 16) Scoped MediaStore
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentResolver resolver = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Video.Media.MIME_TYPE, mimeType);
            values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/LuminaHDR");
            values.put(MediaStore.Video.Media.IS_PENDING, 1);
            values.put(MediaStore.Video.Media.DATE_ADDED, System.currentTimeMillis() / 1000);

            Uri collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            Uri itemUri = null;
            try {
                itemUri = resolver.insert(collection, values);
            } catch (Exception ex) {
                // Fallback to standard external content URI
                itemUri = resolver.insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
            }

            if (itemUri == null) {
                throw new IllegalStateException("Gagal membuat entri MediaStore di Galeri");
            }

            try (OutputStream out = resolver.openOutputStream(itemUri)) {
                if (out == null) throw new IllegalStateException("OutputStream tidak tersedia untuk menyimpan video");
                out.write(videoBytes);
                out.flush();
            }

            values.clear();
            values.put(MediaStore.Video.Media.IS_PENDING, 0);
            resolver.update(itemUri, values, null, null);

            return "Movies/LuminaHDR/" + fileName;
        } else {
            // 2. Legacy Direct Filesystem Storage for Android 5.0 - 9.0
            File moviesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
            File luminaDir = new File(moviesDir, "LuminaHDR");
            if (!luminaDir.exists()) {
                luminaDir.mkdirs();
            }

            File destFile = new File(luminaDir, fileName);
            try (FileOutputStream fos = new FileOutputStream(destFile)) {
                fos.write(videoBytes);
                fos.flush();
            }

            MediaScannerConnection.scanFile(
                    context,
                    new String[]{destFile.getAbsolutePath()},
                    new String[]{mimeType},
                    (path, uri) -> Log.d(TAG, "Video terscan ke Galeri: " + path)
            );

            return destFile.getAbsolutePath();
        }
    }
}
