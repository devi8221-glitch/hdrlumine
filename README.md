# LuminaHDR PRO - HDR & Dolby Vision Video Mastering Studio

Aplikasi mastering video HDR10 (SMPTE ST 2084 PQ 1000 Nits) dan Dolby Vision (Profile 8.4 HLG) untuk media sosial (TikTok, Instagram Reels, dan WhatsApp HD Anti-Luntur). Dilengkapi engine WebGL2 60 FPS, 3D LUT Cinematic Presets, dan APK Standalone Android penuh.

## Fitur Utama
1. **HDR10 & Dolby Vision Tone Mapping**: Koreksi warna presisi, tanpa warna acak-acakan atau washout.
2. **Preset Platform Teroptimasi**:
   - **TikTok (HDR10)**: Highlight tajam, 1080x1920 60fps.
   - **Instagram (Dolby Vision HLG)**: Profile 8.4 bebas kompresi pudar.
   - **WhatsApp (HD Anti-Luntur)**: Kompensasi gamut cerdas agar video tidak pucat saat dikirim di chat/status.
3. **Preset Gaya Warna & 3D LUTs**:
   - Teal & Orange, Kodak 500T, Golden Hour, Cyberpunk, Emerald Mood, Fuji Pastel, Vintage 70s, Noir B&W.
   - Dukungan upload file custom `.cube`.
   - Slider Intensitas LUT (10% - 100%).
4. **Penyimpanan Video Aman ke Perangkat**:
   - Simpan langsung ke Galeri Android (`Movies/LuminaHDR`) via Native Bridge.
   - Web Share API untuk simpan ke perangkat / langsung kirim ke TikTok/IG/WhatsApp.
5. **Integrasi Otomatis APK di GitHub (GitHub Actions)**:
   - File workflow di `.github/workflows/build-apk.yml`.
   - Otomatis kompilasi APK saat `git push` atau klik manual `Run workflow`.
   - Unduh APK langsung dari menu **Artifacts** atau **Releases**.
   - Baca panduan lengkap di [GITHUB_APK_GUIDE.md](GITHUB_APK_GUIDE.md).

## Cara Menjalankan Aplikasi Web
```bash
npm install
npm run dev
```

## Cara Membangun APK Android
```bash
npm run build
chmod +x ./scripts/build-apk.sh
./scripts/build-apk.sh
```
File APK siap instal akan tersedia di `public/LuminaHDR_v1.0.apk`.
