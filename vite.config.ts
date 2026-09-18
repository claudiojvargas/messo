import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
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
      includeAssets: ['icons/messo.svg'],
      manifest: {
        name: 'Messo',
        short_name: 'Messo',
        description: 'Sua calculadora de compras simples e organizada.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#196b52',
        background_color: '#fafaf9',
        icons: [
          { src: '/icons/messo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,svg,webmanifest,wasm,gz}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
    }),
  ],
})
