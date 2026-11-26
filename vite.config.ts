/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Base do app: "/" no computador e "/capi/" no GitHub Pages (o workflow define VITE_BASE_PATH).
function resolverBase(valor: string | undefined): string {
  const limpo = (valor ?? '').trim().replace(/^\/+|\/+$/g, '');
  return limpo ? `/${limpo}/` : '/';
}
const base = resolverBase(process.env.VITE_BASE_PATH);

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
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
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
