import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          if (id.includes('commonjsHelpers') || id.includes('vite/preload-helper')) return 'shared-runtime'
          if (/node_modules\/(?:@paddleocr|@techstark|onnxruntime|clipper-lib|js-yaml)/.test(id)) return 'paddle-sdk'
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/tesseract.js/dist/worker.min.js', dest: 'ocr' },
        { src: 'node_modules/tesseract.js-core/tesseract-core*.{js,wasm}', dest: 'ocr/core' },
        {
          src: 'node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz',
          dest: 'ocr/lang',
        },
      ],
    }),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'images/logo-192.png',
        'images/logo-512.png',
        'icons/messo.svg',
      ],
      manifest: {
        name: 'Messo',
        short_name: 'Messo',
        description: 'Sua calculadora de compras simples e organizada.',
        lang: 'pt-BR',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        theme_color: '#196b52',
        background_color: '#fafaf9',
        icons: [
          {
            src: '/images/logo-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/images/logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,svg,webmanifest,wasm,gz}'],
        globIgnores: ['**/paddle-*', '**/worker-entry-*', '**/ort-wasm-*', 'ocr-paddle.local/**'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [{
          urlPattern: ({ url }) => url.origin === self.location.origin && (url.pathname.startsWith('/ocr-paddle.local/') || /^\/assets\/(?:paddle-|worker-entry-|ort-wasm-)/.test(url.pathname)),
          handler: 'CacheFirst',
          options: {
            cacheName: 'messo-paddle-042-ort1243-v1',
            cacheableResponse: { statuses: [200] },
          },
        }],
      },
    }),
  ],
})
