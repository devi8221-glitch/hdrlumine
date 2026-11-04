package com.luminahdr.mastering;

import android.annotation.TargetApi;
import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.DownloadListener;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import android.media.MediaScannerConnection;
import android.util.Base64;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
    private static final String LOCAL_ORIGIN = "https://luminahdr.local";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Fullscreen window configuration
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.parseColor("#0a0a0a"));
            window.setNavigationBarColor(Color.parseColor("#0a0a0a"));
        }
        applyImmersiveMode();

        // 2. Hardware-accelerated WebView covering 100% of the screen
        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#0a0a0a"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        }
        setContentView(webView, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // 3. WebSettings tuned for Responsive Fullscreen SPA & WebGL2
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Critical: loadWithOverviewMode(false) ensures the WebView obeys width=device-width
        // without shrinking or zooming out into a tiny desktop overview.
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);

        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            settings.setMediaPlaybackRequiresUserGesture(false);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // 4. Intercept local assets for instant, reliable offline loading
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith(LOCAL_ORIGIN) || url.startsWith("http://localhost") || url.startsWith("https://localhost")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return handleLocalAssetRequest(url);
            }

            @TargetApi(Build.VERSION_CODES.LOLLIPOP)
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return handleLocalAssetRequest(request.getUrl().toString());
            }
        });

        // 5. WebChromeClient for File Uploads and HTML5 Permissions
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    request.grant(request.getResources());
                }
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                             WebChromeClient.FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                String[] mimetypes = {"video/*", "*/*"};
                intent.putExtra(Intent.EXTRA_MIME_TYPES, mimetypes);
                startActivityForResult(Intent.createChooser(intent, "Pilih Video HDR atau LUT .cube"), FILE_CHOOSER_REQUEST_CODE);
                return true;
            }

            @Override
            public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                result.confirm();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                result.confirm();
                return true;
            }
        });

        // 6. Download Listener
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    if (url.startsWith("blob:") || url.startsWith("data:")) {
                        return;
                    }
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setMimeType(mimetype);
                    request.allowScanningByMediaScanner();
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                    DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                    dm.enqueue(request);
                    Toast.makeText(getApplicationContext(), "Mengunduh: " + filename, Toast.LENGTH_SHORT).show();
                } catch (Exception e) {
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setData(Uri.parse(url));
                    startActivity(i);
                }
            }
        });

        // 7. Native Android Bridge for saving videos directly to Gallery & Movies storage
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        // Load offline local app directly from embedded APK assets
        webView.loadUrl(LOCAL_ORIGIN + "/index.html");
    }

    public class AndroidBridge {
        @android.webkit.JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @android.webkit.JavascriptInterface
        public void saveVideoBase64(final String base64Data, final String fileName, final String mimeType) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    saveFileToStorage(base64Data, fileName, mimeType);
                }
            }).start();
        }

        @android.webkit.JavascriptInterface
        public void shareVideoBase64(final String base64Data, final String fileName, final String mimeType) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    shareVideoFile(base64Data, fileName, mimeType);
                }
            }).start();
        }
    }

    private void saveFileToStorage(String base64Data, String fileName, String mimeType) {
        try {
            String cleanData = base64Data;
            int commaIdx = cleanData.indexOf(",");
            if (commaIdx != -1) {
                cleanData = cleanData.substring(commaIdx + 1);
            }

            byte[] videoBytes = Base64.decode(cleanData, Base64.DEFAULT);

            // Prefer Movies/LuminaHDR folder so it appears in video players and galleries
            File targetDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
            if (targetDir == null) {
                targetDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
            }
            File luminaFolder = new File(targetDir, "LuminaHDR");
            if (!luminaFolder.exists()) {
                luminaFolder.mkdirs();
            }

            final File outputFile = new File(luminaFolder, fileName);
            FileOutputStream fos = new FileOutputStream(outputFile);
            fos.write(videoBytes);
            fos.flush();
            fos.close();

            // Scan file to trigger Android MediaStore / Gallery refresh
            MediaScannerConnection.scanFile(
                MainActivity.this,
                new String[]{outputFile.getAbsolutePath()},
                new String[]{mimeType != null && !mimeType.isEmpty() ? mimeType : "video/mp4"},
                new MediaScannerConnection.OnScanCompletedListener() {
                    @Override
                    public void onScanCompleted(String path, Uri uri) {
                        // Scan complete
                    }
                }
            );

            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(
                        MainActivity.this,
                        "✓ Berhasil disimpan di Galeri:\n" + outputFile.getName(),
                        Toast.LENGTH_LONG
                    ).show();

                    if (webView != null) {
                        webView.evaluateJavascript(
                            "window.onAndroidSaveResult && window.onAndroidSaveResult(true, '" + outputFile.getAbsolutePath().replace("'", "\\'") + "');",
                            null
                        );
                    }
                }
            });
        } catch (final Exception e) {
            e.printStackTrace();
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    Toast.makeText(
                        MainActivity.this,
                        "Gagal menyimpan video: " + e.getMessage(),
                        Toast.LENGTH_LONG
                    ).show();

                    if (webView != null) {
                        webView.evaluateJavascript(
                            "window.onAndroidSaveResult && window.onAndroidSaveResult(false, '" + e.getMessage().replace("'", "\\'") + "');",
                            null
                        );
                    }
                }
            });
        }
    }

    private void shareVideoFile(String base64Data, String fileName, String mimeType) {
        try {
            String cleanData = base64Data;
            int commaIdx = cleanData.indexOf(",");
            if (commaIdx != -1) {
                cleanData = cleanData.substring(commaIdx + 1);
            }
            byte[] videoBytes = Base64.decode(cleanData, Base64.DEFAULT);

            File cacheFolder = new File(getCacheDir(), "shared_videos");
            if (!cacheFolder.exists()) cacheFolder.mkdirs();
            File shareFile = new File(cacheFolder, fileName);
            FileOutputStream fos = new FileOutputStream(shareFile);
            fos.write(videoBytes);
            fos.flush();
            fos.close();

            Uri fileUri = Uri.fromFile(shareFile);
            Intent shareIntent = new Intent(Intent.ACTION_SEND);
            shareIntent.setType(mimeType != null && !mimeType.isEmpty() ? mimeType : "video/mp4");
            shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
            shareIntent.putExtra(Intent.EXTRA_SUBJECT, fileName);
            shareIntent.putExtra(Intent.EXTRA_TEXT, "Video HDR dari LuminaHDR");
            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            startActivity(Intent.createChooser(shareIntent, "Bagikan Video Master HDR"));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void applyImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            );
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyImmersiveMode();
        // Notify webview container to relayout immediately
        if (webView != null) {
            webView.requestLayout();
            webView.invalidate();
        }
    }

    private WebResourceResponse handleLocalAssetRequest(String url) {
        if (url == null) return null;
        try {
            Uri uri = Uri.parse(url);
            String host = uri.getHost();
            if ("luminahdr.local".equalsIgnoreCase(host) || "localhost".equalsIgnoreCase(host)) {
                String path = uri.getPath();
                if (path == null || path.isEmpty() || path.equals("/")) {
                    path = "index.html";
                } else if (path.startsWith("/")) {
                    path = path.substring(1);
                }

                String assetPath = "www/" + path;
                String mime = "application/octet-stream";
                String encoding = null;

                if (path.endsWith(".html")) {
                    mime = "text/html";
                    encoding = "UTF-8";
                } else if (path.endsWith(".js") || path.endsWith(".mjs")) {
                    mime = "application/javascript";
                    encoding = "UTF-8";
                } else if (path.endsWith(".css")) {
                    mime = "text/css";
                    encoding = "UTF-8";
                } else if (path.endsWith(".svg")) {
                    mime = "image/svg+xml";
                    encoding = "UTF-8";
                } else if (path.endsWith(".png")) {
                    mime = "image/png";
                } else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
                    mime = "image/jpeg";
                } else if (path.endsWith(".json") || path.endsWith(".webmanifest")) {
                    mime = "application/json";
                    encoding = "UTF-8";
                } else if (path.endsWith(".wasm")) {
                    mime = "application/wasm";
                } else if (path.endsWith(".cube")) {
                    mime = "text/plain";
                    encoding = "UTF-8";
                }

                InputStream is = getAssets().open(assetPath);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    Map<String, String> headers = new HashMap<String, String>();
                    headers.put("Access-Control-Allow-Origin", "*");
                    headers.put("Cache-Control", "no-cache");
                    return new WebResourceResponse(mime, encoding, 200, "OK", headers, is);
                } else {
                    return new WebResourceResponse(mime, encoding, is);
                }
            }
        } catch (Exception e) {
            // Asset not found or error
        }
        return null;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return;
            Uri[] results = null;
            if (resultCode == Activity.RESULT_OK && data != null) {
                String dataString = data.getDataString();
                if (dataString != null) {
                    results = new Uri[]{Uri.parse(dataString)};
                } else if (data.getClipData() != null) {
                    final int count = data.getClipData().getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = data.getClipData().getItemAt(i).getUri();
                    }
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
