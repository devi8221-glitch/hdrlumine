#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$DIR")"
BUILD_DIR="/tmp/apk-build"

echo "=== Membangun APK Standalone Penuh LuminaHDR (Full Offline) ==="

# 1. Pastikan dist/ sudah dibuild
if [ ! -d "$ROOT_DIR/dist" ] || [ ! -f "$ROOT_DIR/dist/index.html" ]; then
  echo "Building web app dist..."
  (cd "$ROOT_DIR" && npm run build)
fi

mkdir -p "$BUILD_DIR/res/values" "$BUILD_DIR/res/mipmap-mdpi-v4" "$BUILD_DIR/res/mipmap-hdpi-v4" "$BUILD_DIR/res/mipmap-xhdpi-v4" "$BUILD_DIR/src/com/luminahdr/mastering" "$BUILD_DIR/bin" "$BUILD_DIR/gen" "$BUILD_DIR/assets/www"

# Copy canonical Android manifest & Java source
cp "$ROOT_DIR/android/AndroidManifest.xml" "$BUILD_DIR/AndroidManifest.xml"
cp "$ROOT_DIR/android/src/com/luminahdr/mastering/MainActivity.java" "$BUILD_DIR/src/com/luminahdr/mastering/MainActivity.java"

# Copy icons
cp "$ROOT_DIR/public/pwa-192x192.png" "$BUILD_DIR/res/mipmap-mdpi-v4/ic_launcher.png"
cp "$ROOT_DIR/public/pwa-192x192.png" "$BUILD_DIR/res/mipmap-hdpi-v4/ic_launcher.png"
cp "$ROOT_DIR/public/pwa-192x192.png" "$BUILD_DIR/res/mipmap-xhdpi-v4/ic_launcher.png"

# App strings
cat << 'EOF' > "$BUILD_DIR/res/values/strings.xml"
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">LuminaHDR</string>
</resources>
EOF

# Copy all dist web assets to assets/www for full offline execution
rm -rf "$BUILD_DIR/assets/www"/*
cp -r "$ROOT_DIR/dist"/* "$BUILD_DIR/assets/www/"
rm -f "$BUILD_DIR/assets/www"/*.apk*

# Keystore
if [ ! -f "$BUILD_DIR/release.keystore" ]; then
  keytool -genkey -v -keystore "$BUILD_DIR/release.keystore" -alias luminahdr -keyalg RSA -keysize 2048 -validity 10000 -storepass luminahdr123 -keypass luminahdr123 -dname "CN=LuminaHDR, OU=Mobile, O=LuminaHDR, L=Jakarta, ST=Jakarta, C=ID"
fi

# 1. AAPT Generate R.java
rm -rf "$BUILD_DIR/gen"/* "$BUILD_DIR/bin"/*
aapt package -f -m -J "$BUILD_DIR/gen" -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -I /usr/lib/android-sdk/platforms/android-23/android.jar

# 2. Compile Java
javac -source 1.8 -target 1.8 -d "$BUILD_DIR/bin" -classpath /usr/lib/android-sdk/platforms/android-23/android.jar:"$BUILD_DIR/gen" "$BUILD_DIR/src/com/luminahdr/mastering/MainActivity.java" "$BUILD_DIR/gen/com/luminahdr/mastering/R.java"

# 3. Dexing
dalvik-exchange --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin"

# 4. Package APK with full offline web assets (-A)
rm -f "$BUILD_DIR/bin/app.unsigned.apk" "$BUILD_DIR/bin/app.aligned.apk" "$ROOT_DIR/public/LuminaHDR_v1.0.apk" "$ROOT_DIR/dist/LuminaHDR_v1.0.apk"
aapt package -f -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -A "$BUILD_DIR/assets" -I /usr/lib/android-sdk/platforms/android-23/android.jar -F "$BUILD_DIR/bin/app.unsigned.apk"

# 5. Add classes.dex
(cd "$BUILD_DIR/bin" && aapt add app.unsigned.apk classes.dex)

# 6. Zipalign
zipalign -v -p 4 "$BUILD_DIR/bin/app.unsigned.apk" "$BUILD_DIR/bin/app.aligned.apk"

# 7. Sign APK with v1, v2, v3
apksigner sign --ks "$BUILD_DIR/release.keystore" --ks-pass pass:luminahdr123 --out "$ROOT_DIR/public/LuminaHDR_v1.0.apk" "$BUILD_DIR/bin/app.aligned.apk"
cp "$ROOT_DIR/public/LuminaHDR_v1.0.apk" "$ROOT_DIR/dist/LuminaHDR_v1.0.apk"

# 8. Verify
apksigner verify -v "$ROOT_DIR/public/LuminaHDR_v1.0.apk"

echo "=== APK Berhasil Dibangun: $ROOT_DIR/public/LuminaHDR_v1.0.apk ==="
ls -lh "$ROOT_DIR/public/LuminaHDR_v1.0.apk"
