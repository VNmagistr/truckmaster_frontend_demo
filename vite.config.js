import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'logo.jpg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Італ Трак',
        short_name: 'Італ Трак',
        description: 'Сервісний центр Iveco — управління нарядами, складом та клієнтами',
        start_url: '/dashboard',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#f5c518',
        lang: 'uk',
        orientation: 'portrait-primary',
        categories: ['business', 'productivity'],
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
        runtimeCaching: [
          {
            // Ніколи не кешуємо auth токени
            urlPattern: /\/api\/token\//,
            handler: 'NetworkOnly',
          },
          {
            // API дані — мережа першочергово, fallback кеш (1 год)
            urlPattern: /^https:\/\/api\.ital-truck\.com\.ua\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60, // 1 година
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Медіафайли (фото ремонту, авто) — кеш першочергово (30 днів)
            urlPattern: /^https:\/\/api\.ital-truck\.com\.ua\/media\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-cache',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 днів
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
