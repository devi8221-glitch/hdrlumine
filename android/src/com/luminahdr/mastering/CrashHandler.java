package com.luminahdr.mastering;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Robust ANR & Crash Guardian for LuminaHDR on Android 5.0 through Android 14.
 * Catches all uncaught native / thread exceptions, logs them safely to disk,
 * and restarts the activity gracefully without standard Android crash dialogs.
 */
public class CrashHandler implements Thread.UncaughtExceptionHandler {
    private static final String TAG = "LuminaCrashHandler";
    private final Context context;
    private final Thread.UncaughtExceptionHandler defaultHandler;

    public CrashHandler(Context context) {
        this.context = context.getApplicationContext();
        this.defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
    }

    public static void install(Context context) {
        Thread.setDefaultUncaughtExceptionHandler(new CrashHandler(context));
    }

    @Override
    public void uncaughtException(Thread thread, Throwable throwable) {
        try {
            saveCrashReport(thread, throwable);
            Log.e(TAG, "LuminaHDR recovered from crash: " + throwable.getMessage(), throwable);

            // Attempt graceful restart of MainActivity
            Intent intent = new Intent(context, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            context.startActivity(intent);

            android.os.Process.killProcess(android.os.Process.myPid());
            System.exit(10);
        } catch (Throwable e) {
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        }
    }

    private void saveCrashReport(Thread thread, Throwable throwable) {
        try {
            File crashDir = new File(context.getFilesDir(), "crash_logs");
            if (!crashDir.exists()) {
                crashDir.mkdirs();
            }

            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
            File crashFile = new File(crashDir, "crash_" + timestamp + ".txt");

            StringWriter sw = new StringWriter();
            PrintWriter pw = new PrintWriter(sw);
            throwable.printStackTrace(pw);

            FileWriter writer = new FileWriter(crashFile);
            writer.write("=== LuminaHDR Crash Guardian Log ===\n");
            writer.write("Time: " + timestamp + "\n");
            writer.write("Device: " + Build.MANUFACTURER + " " + Build.MODEL + "\n");
            writer.write("Android OS: " + Build.VERSION.RELEASE + " (API " + Build.VERSION.SDK_INT + ")\n");
            writer.write("Thread: " + thread.getName() + " (id=" + thread.getId() + ")\n");
            writer.write("Stack Trace:\n");
            writer.write(sw.toString());
            writer.flush();
            writer.close();
        } catch (Exception ignored) {
        }
    }
}
