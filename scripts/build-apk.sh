#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$DIR")"
BUILD_DIR="/tmp/apk-build"

echo "=== Membangun APK Standalone Penuh LuminaHDR (Full Offline) ==="

# 1. Generate 12 3D LUT profiles and build web dist
echo "Generating 12 offline 3D LUT profiles..."
python3 "$ROOT_DIR/scripts/generate_luts.py"
echo "Building web app dist..."
(cd "$ROOT_DIR" && npm run build)

# 2. Deteksi lokasi Android SDK tools & android.jar secara otomatis (kompatibel Local & GitHub Actions)
if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
  for bt in "$ANDROID_HOME/build-tools/"*; do
    if [ -d "$bt" ]; then
      export PATH="$bt:$PATH"
    fi
  done
fi

ANDROID_JAR=""
for candidate in \
  "$ANDROID_HOME/platforms/android-34/android.jar" \
  "$ANDROID_HOME/platforms/android-33/android.jar" \
  "$ANDROID_HOME/platforms/android-30/android.jar" \
  "$ANDROID_HOME/platforms/android-28/android.jar" \
  "$ANDROID_HOME/platforms/android-26/android.jar" \
  "$ANDROID_HOME/platforms/android-23/android.jar" \
  /usr/lib/android-sdk/platforms/android-23/android.jar \
  /usr/lib/android-sdk/platforms/android-*/android.jar \
  /usr/local/lib/android/sdk/platforms/android-*/android.jar; do
  if [ -f "$candidate" ]; then
    ANDROID_JAR="$candidate"
    break
  fi
done

if [ -z "$ANDROID_JAR" ] || [ ! -f "$ANDROID_JAR" ]; then
  echo "Android SDK CLI belum terinstal penuh di lingkungan lokal. Menjalankan Python Stability Injector & Signer..."
  python3 "$ROOT_DIR/scripts/inject_android_stability.py"
  exit 0
fi
echo "Menggunakan Android Platform: $ANDROID_JAR"

# 3. Siapkan direktori build
mkdir -p "$BUILD_DIR/res/values" \
         "$BUILD_DIR/res/mipmap-mdpi-v4" \
         "$BUILD_DIR/res/mipmap-hdpi-v4" \
         "$BUILD_DIR/res/mipmap-xhdpi-v4" \
         "$BUILD_DIR/src/com/luminahdr/mastering" \
         "$BUILD_DIR/bin" \
         "$BUILD_DIR/gen" \
         "$BUILD_DIR/assets/www"

# 4. Copy canonical Android manifest & Java source
cp "$ROOT_DIR/android/AndroidManifest.xml" "$BUILD_DIR/AndroidManifest.xml"
cp "$ROOT_DIR/android/src/com/luminahdr/mastering/"*.java "$BUILD_DIR/src/com/luminahdr/mastering/"

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

# Copy all dist web assets & 12 3D LUT profiles to assets for full offline execution
rm -rf "$BUILD_DIR/assets"
mkdir -p "$BUILD_DIR/assets/www" "$BUILD_DIR/assets/luts"
cp -r "$ROOT_DIR/dist"/* "$BUILD_DIR/assets/www/"
if [ -d "$ROOT_DIR/public/luts" ]; then
  cp -r "$ROOT_DIR/public/luts"/* "$BUILD_DIR/assets/luts/"
fi
rm -f "$BUILD_DIR/assets/www"/*.apk*

# Keystore
if [ ! -f "$BUILD_DIR/release.keystore" ]; then
  keytool -genkey -v -keystore "$BUILD_DIR/release.keystore" -alias luminahdr -keyalg RSA -keysize 2048 -validity 10000 -storepass luminahdr123 -keypass luminahdr123 -dname "CN=LuminaHDR, OU=Mobile, O=LuminaHDR, L=Jakarta, ST=Jakarta, C=ID"
fi

# 5. AAPT Generate R.java
rm -rf "$BUILD_DIR/gen"/* "$BUILD_DIR/bin"/*
aapt package -f -m -J "$BUILD_DIR/gen" -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -I "$ANDROID_JAR"

# 6. Compile Java
javac -source 1.8 -target 1.8 -d "$BUILD_DIR/bin" -classpath "$ANDROID_JAR":"$BUILD_DIR/gen" "$BUILD_DIR/src/com/luminahdr/mastering/"*.java "$BUILD_DIR/gen/com/luminahdr/mastering/R.java"

# 7. Dexing (Support d8, dalvik-exchange, and dx)
if command -v d8 >/dev/null 2>&1; then
  echo "Menggunakan D8 compiler..."
  d8 --release --min-api 21 --output "$BUILD_DIR/bin" "$BUILD_DIR/bin"/com/luminahdr/mastering/*.class
elif command -v dalvik-exchange >/dev/null 2>&1; then
  echo "Menggunakan dalvik-exchange..."
  dalvik-exchange --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin"
elif command -v dx >/dev/null 2>&1; then
  echo "Menggunakan dx..."
  dx --dex --output="$BUILD_DIR/bin/classes.dex" "$BUILD_DIR/bin"
else
  echo "Error: Kompilator Dex (d8, dalvik-exchange, atau dx) tidak ditemukan."
  exit 1
fi

# 8. Package APK with full offline web assets (-A)
rm -f "$BUILD_DIR/bin/app.unsigned.apk" "$BUILD_DIR/bin/app.aligned.apk" "$ROOT_DIR/public/LuminaHDR_v1.0.apk" "$ROOT_DIR/dist/LuminaHDR_v1.0.apk"
aapt package -f -M "$BUILD_DIR/AndroidManifest.xml" -S "$BUILD_DIR/res" -A "$BUILD_DIR/assets" -I "$ANDROID_JAR" -F "$BUILD_DIR/bin/app.unsigned.apk"

# 9. Add classes.dex
(cd "$BUILD_DIR/bin" && aapt add app.unsigned.apk classes.dex)

# 10. Zipalign
zipalign -v -p 4 "$BUILD_DIR/bin/app.unsigned.apk" "$BUILD_DIR/bin/app.aligned.apk"

# 11. Sign APK with v1, v2, v3
apksigner sign --ks "$BUILD_DIR/release.keystore" --ks-pass pass:luminahdr123 --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$ROOT_DIR/public/LuminaHDR_v1.0.apk" "$BUILD_DIR/bin/app.aligned.apk"
mkdir -p "$ROOT_DIR/dist"
cp "$ROOT_DIR/public/LuminaHDR_v1.0.apk" "$ROOT_DIR/dist/LuminaHDR_v1.0.apk"

# 12. Official Verification
apksigner verify -v "$ROOT_DIR/public/LuminaHDR_v1.0.apk"

echo "=== APK Berhasil Dibangun Resmi (Kompatibel Android 8 - 16 & Poco X6 5G): ==="
ls -lh "$ROOT_DIR/public/LuminaHDR_v1.0.apk"

