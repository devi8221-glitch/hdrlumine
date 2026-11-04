# Panduan Integrasi Otomatis APK di GitHub (GitHub Actions)

Aplikasi **LuminaHDR** telah dilengkapi dengan alur otomatis (CI/CD) **GitHub Actions** di `.github/workflows/build-apk.yml`. 

Begitu repositori ini diunggah (push) ke GitHub, sistem GitHub akan langsung otomatis membangun, mengompilasi, dan menandatangani file **APK Android (`LuminaHDR_v1.0.apk`)** yang siap diinstal di HP tanpa memerlukan Android Studio di komputer Anda.

---

## Cara Menggunakan di GitHub (3 Langkah Mudah)

### Langkah 1: Push Repositori ke Akun GitHub Anda
Jika belum mengunggah repositori ke GitHub:
```bash
git init
git add .
git commit -m "feat: LuminaHDR dengan preset LUT dan integrasi APK"
git branch -M main
git remote add origin https://github.com/USERNAME-ANDA/lumina-hdr.git
git push -u origin main
```

### Langkah 2: Jalankan Alur Pembuatan APK di GitHub
Ada 2 cara file APK akan otomatis dibuat:
1. **Otomatis Setiap Push**: Setiap kali Anda melakukan `git push` ke branch `main`, GitHub Actions akan otomatis memulai build APK.
2. **Manual (1-Klik di Web GitHub)**:
   - Buka repositori Anda di web GitHub (`https://github.com/USERNAME-ANDA/lumina-hdr`).
   - Klik tab **Actions** di bagian atas.
   - Di sisi kiri, pilih **Build Android APK**.
   - Klik tombol **Run workflow** di sebelah kanan -> pilih branch `main` -> klik **Run workflow**.

### Langkah 3: Unduh File APK dari GitHub
1. Setelah proses build selesai (biasanya memakan waktu 1–2 menit, ditandai centang hijau `✓`):
2. Klik pada hasil pekerjaan build tersebut (misalnya: *Build & Package Standalone APK*).
3. Gulir ke bagian paling bawah ke bagian **Artifacts**.
4. Klik **`LuminaHDR-v1.0-release-apk`** untuk langsung mengunduh file `.zip` yang berisi file **`LuminaHDR_v1.0.apk`**.
5. Ekstrak dan kirim file `.apk` ke ponsel Android Anda, lalu ketuk untuk menginstal!

---

## Otomatis Rilis Versi (GitHub Releases)
Jika Anda ingin membuat rilis resmi di GitHub yang tombol unduh APK-nya langsung tampil di halaman depan repositori:
```bash
git tag v1.0.0
git push origin v1.0.0
```
GitHub Actions akan otomatis membuat halaman **Releases** dengan judul `Release v1.0.0` dan melampirkan file `LuminaHDR_v1.0.apk` secara publik.

---

## Membangun APK Secara Lokal (Tanpa GitHub)
Jika Anda menjalankan Linux di komputer lokal atau VM:
```bash
# 1. Bangun bundle web
npm run build

# 2. Jalankan skrip pembuat APK
chmod +x ./scripts/build-apk.sh
./scripts/build-apk.sh
```
File APK siap pakai akan tersimpan di:
`public/LuminaHDR_v1.0.apk`
