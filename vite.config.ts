import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
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
        globPatterns: ['**/*.{html,js,css,svg,webmanifest}'],
        navigateFallback: 'index.html',
        runtimeCaching: [],
      },
    }),
  ],
})
