/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { exec } from 'child_process';
import { resolve } from 'path';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

function openFolderPlugin() {
  return {
    name: 'open-folder',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url?.startsWith('/__open-folder')) {
          const url = new URL(req.url, 'http://localhost');
          const relPath = url.searchParams.get('path');
          if (!relPath) {
            res.statusCode = 400;
            res.end('Missing path');
            return;
          }
          const absPath = resolve(relPath);
          exec(`explorer "${absPath}"`);
          res.statusCode = 200;
          res.end('ok');
          return;
        }
        next();
      });
    },
  };
}

const coopCoepHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    openFolderPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,wasm,png,svg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: 'Study Tool',
        short_name: 'Study',
        description: 'Spaced repetition flashcards and quizzes',
        theme_color: '#4a7fb5',
        background_color: '#f5f0e8',
        display: 'standalone',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    headers: coopCoepHeaders,
  },
  preview: {
    headers: coopCoepHeaders,
  },
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
