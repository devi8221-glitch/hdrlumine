import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const serveApkPlugin = (): Plugin => ({
  name: 'serve-apk',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';
      if (
        url === '/LuminaHDR_v1.0.apk' ||
        url === '/download/LuminaHDR.apk' ||
        url === '/api/download-apk' ||
        url.endsWith('LuminaHDR_v1.0.apk')
      ) {
        const apkPath = path.resolve(__dirname, 'public/LuminaHDR_v1.0.apk');
        if (fs.existsSync(apkPath)) {
          const stat = fs.statSync(apkPath);
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-Disposition', 'attachment; filename="LuminaHDR_v1.0.apk"');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          fs.createReadStream(apkPath).pipe(res);
          return;
        }
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ? req.url.split('?')[0] : '';
      if (
        url === '/LuminaHDR_v1.0.apk' ||
        url === '/download/LuminaHDR.apk' ||
        url === '/api/download-apk' ||
        url.endsWith('LuminaHDR_v1.0.apk')
      ) {
        const apkPath = path.resolve(__dirname, 'dist/LuminaHDR_v1.0.apk');
        if (fs.existsSync(apkPath)) {
          const stat = fs.statSync(apkPath);
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Content-Disposition', 'attachment; filename="LuminaHDR_v1.0.apk"');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          fs.createReadStream(apkPath).pipe(res);
          return;
        }
      }
      next();
    });
  },
});

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      serveApkPlugin(),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg'],
        workbox: {
          globIgnores: ['**/LuminaHDR_v1.0.apk*', '**/*.apk', '**/*.idsig'],
          navigateFallbackDenylist: [/^\/LuminaHDR_v1\.0\.apk/, /^\/download\//, /^\/api\//],
        },
        manifest: {
          id: '/',
          name: 'LuminaHDR - Dolby Vision & HDR10 Video Studio',
          short_name: 'LuminaHDR',
          description: 'Aplikasi mastering dan tone-mapping video HDR10 & Dolby Vision untuk TikTok, Instagram Reels, dan WhatsApp tanpa luntur.',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
