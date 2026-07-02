import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Project GitHub Pages site is served from a subpath:
  // https://gitphantom700.github.io/laundristic-p1/
  base: '/laundristic-p1/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'apple-touch-icon-v2.png',
        'robots.txt',
      ],
      manifest: {
        name: 'Laundristic',
        short_name: 'Laundristic',
        id: '/laundristic-p1/',
        description:
          'A local-first, offline PWA to catalog garments, log laundry drop-offs, and keep proof of every pickup. No accounts, no cloud.',
        theme_color: '#4E6E52',
        background_color: '#ffffff',
        start_url: '/laundristic-p1/',
        scope: '/laundristic-p1/',
        display: 'standalone',
        // Relative src (no leading slash) resolves against the manifest's own
        // location (/laundristic-p1/), so icons load correctly on the subpath.
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
});
