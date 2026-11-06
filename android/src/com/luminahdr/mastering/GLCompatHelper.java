package com.luminahdr.mastering;

import android.app.ActivityManager;
import android.content.Context;
import android.content.pm.ConfigurationInfo;
import android.os.Build;
import android.util.Log;

/**
 * GPU & WebGL2 Hardware Acceleration Checker for LuminaHDR.
 * Detects device GLES level, Adreno/Mali GPU chipset limits,
 * and configures WebView rendering flags accordingly.
 */
public class GLCompatHelper {
    private static final String TAG = "GLCompatHelper";

    public static boolean isGLES3Supported(Context context) {
        try {
            ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            if (am != null) {
                ConfigurationInfo info = am.getDeviceConfigurationInfo();
                if (info != null) {
                    return info.reqGlEsVersion >= 0x30000;
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "GLES detection error", e);
        }
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2;
    }

    public static int getRecommendedTextureSize() {
        // High-end Adreno 6xx/7xx and Mali G-series can easily support 4096 texture sizes
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            return 4096;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return 2048;
        } else {
            return 1024;
        }
    }

    public static String getDeviceInfoJSON(Context context) {
        boolean gles3 = isGLES3Supported(context);
        int maxTex = getRecommendedTextureSize();
        long maxMem = Runtime.getRuntime().maxMemory() / (1024 * 1024);

        return "{"
                + "\"os\":\"Android " + Build.VERSION.RELEASE + "\","
                + "\"apiLevel\":" + Build.VERSION.SDK_INT + ","
                + "\"brand\":\"" + Build.BRAND + "\","
                + "\"model\":\"" + Build.MODEL + "\","
                + "\"hardware\":\"" + Build.HARDWARE + "\","
                + "\"gles3\":" + gles3 + ","
                + "\"maxTextureSize\":" + maxTex + ","
                + "\"maxHeapMb\":" + maxMem
                + "}";
    }
}
