/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// No GitHub Pages o app fica em /capi/.
const base = process.env.GITHUB_PAGES ? '/capi/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'icone-167.png', 'icone-152.png', 'icone-120.png', 'favicon-32.png', 'capi/*.png'],
      manifest: {
        name: 'Capi: finanças de bolso',
        short_name: 'Capi',
        description: 'Finanças de bolso, com os dados só no seu aparelho.',
        lang: 'pt-BR',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F1F3F7',
        theme_color: '#0B1530',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
