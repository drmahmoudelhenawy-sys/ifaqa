import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          injectRegister: 'auto',
          includeAssets: ['assets/**/*', '*.png', 'tailwindcss.js'],
          manifest: {
            name: 'إفاقة',
            short_name: 'إفاقة',
            description: 'تطبيق إسلامي يعمل بدون اتصال',
            lang: 'ar',
            dir: 'rtl',
            display: 'standalone',
            start_url: './',
            scope: './',
            background_color: '#0f172a',
            theme_color: '#7c3aed'
          },
          workbox: {
            // Quran pages are downloaded explicitly from the in-app offline setup.
            // Keeping them out of the install precache avoids a forced 500+ MB install.
            globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,webp,woff,woff2,ttf}'],
            navigateFallback: 'index.html',
            cleanupOutdatedCaches: true,
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            runtimeCaching: [
              {
                urlPattern: ({ request }) => request.destination === 'style',
                handler: 'CacheFirst',
                options: {
                  cacheName: 'external-stylesheets',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                },
              },
              {
                urlPattern: ({ request }) => request.destination === 'font',
                handler: 'CacheFirst',
                options: {
                  cacheName: 'external-fonts',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                },
              },
            ],
          },
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        sourcemap: false,
        minify: 'esbuild',
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage']
            }
          }
        }
      }
    };
});
