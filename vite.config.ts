import { defineConfig } from 'vite';
import { exec } from 'child_process';
import { resolve } from 'path';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/vite';

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

export default defineConfig({
  plugins: [solid(), tailwindcss(), openFolderPlugin()],
  server: {
    port: 3000,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
});
