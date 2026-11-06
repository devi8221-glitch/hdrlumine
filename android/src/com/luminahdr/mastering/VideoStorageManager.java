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
 * Fully compliant with Android 10, 11, 12, 13, and 14 MediaStore APIs,
 * as well as legacy file paths for Android 5.0 - 9.0.
 */
public class VideoStorageManager {
    private static final String TAG = "VideoStorageManager";
    private final Context context;

    public VideoStorageManager(Context context) {
        this.context = context.getApplicationContext();
    }

    public String saveVideoBase64(String base64Data, String fileName, String mimeType) throws Exception {
        byte[] videoBytes;
        if (base64Data.contains(",")) {
            String pureBase64 = base64Data.substring(base64Data.indexOf(",") + 1);
            videoBytes = Base64.decode(pureBase64, Base64.DEFAULT);
        } else {
            videoBytes = Base64.decode(base64Data, Base64.DEFAULT);
        }

        if (videoBytes == null || videoBytes.length == 0) {
            throw new IllegalArgumentException("Data video kosong atau base64 tidak valid");
        }

        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = "video/mp4";
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ Scoped MediaStore Storage (Instant visibility in Google Photos & Gallery)
            ContentResolver resolver = context.getContentResolver();
            ContentValues values = new ContentValues();
            values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
            values.put(MediaStore.Video.Media.MIME_TYPE, mimeType);
            values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/LuminaHDR");
            values.put(MediaStore.Video.Media.IS_PENDING, 1);

            Uri collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            Uri itemUri = resolver.insert(collection, values);

            if (itemUri == null) {
                throw new IllegalStateException("Gagal membuat entri MediaStore untuk video");
            }

            try (OutputStream out = resolver.openOutputStream(itemUri)) {
                if (out == null) throw new IllegalStateException("OutputStream tidak tersedia");
                out.write(videoBytes);
                out.flush();
            }

            values.clear();
            values.put(MediaStore.Video.Media.IS_PENDING, 0);
            resolver.update(itemUri, values, null, null);

            return "Movies/LuminaHDR/" + fileName;
        } else {
            // Android 5.0 - 9.0 Legacy Direct Filesystem Storage
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

            // Trigger Android Media Scanner so it appears in Photos/Gallery instantly
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
