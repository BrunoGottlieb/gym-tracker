import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['images/*.webp', 'icons/*.png'],
      manifest: {
        name: 'Gym Tracker', short_name: 'Gym Tracker', lang: 'pt-BR',
        description: 'Treinos, cargas e séries no seu ritmo.',
        theme_color: '#286344', background_color: '#fafbf8',
        display: 'standalone', start_url: '.', scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,webp,woff2}'], navigateFallback: 'index.html' },
    }),
  ],
});
