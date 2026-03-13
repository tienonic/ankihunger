/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { exec, spawn } from 'child_process';
import { resolve } from 'path';
import { readFileSync } from 'fs';
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

function loadBridgeConfig() {
  try {
    const raw = readFileSync(resolve('ai-bridge.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function aiBridgePlugin() {
  return {
    name: 'ai-bridge',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.method !== 'POST' || req.url !== '/api/ai') return next();

        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', () => {
          let prompt: string;
          let requestModel: string | undefined;
          try {
            const parsed = JSON.parse(body);
            prompt = parsed.prompt;
            requestModel = parsed.model; // per-request model override
            if (!prompt) throw new Error('missing prompt');
          } catch {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Bad request: body must be { "prompt": "...", "model?": "..." }');
            return;
          }

          // Read config fresh each request (so edits take effect without restart)
          const config = loadBridgeConfig();
          const model = requestModel || config.model || 'sonnet';
          const showOutput = config.showOutput !== false;

          const args = ['-p', '--output-format', 'text', '--model', model];
          if (config.systemPrompt) args.push('--system-prompt', config.systemPrompt);
          if (config.maxBudgetUsd) args.push('--max-budget-usd', String(config.maxBudgetUsd));
          if (config.effort) args.push('--effort', config.effort);
          if (config.verbose) args.push('--verbose');

          console.log(`\x1b[36m[ai-bridge]\x1b[0m model=\x1b[33m${model}\x1b[0m prompt=${prompt.length}chars`);

          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          const child = spawn('claude', args, {
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
          });

          child.stdin.write(prompt);
          child.stdin.end();

          let stderrBuf = '';
          let stdoutTotal = 0;

          child.stdout.on('data', (chunk: Buffer) => {
            const text = chunk.toString();
            stdoutTotal += text.length;
            if (showOutput) process.stdout.write(`\x1b[2m${text}\x1b[0m`);
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          });

          child.stderr.on('data', (chunk: Buffer) => {
            stderrBuf += chunk.toString();
          });

          child.on('close', (code: number | null) => {
            if (showOutput && stdoutTotal > 0) process.stdout.write('\n');
            console.log(`\x1b[36m[ai-bridge]\x1b[0m done code=${code} ${stdoutTotal}b`);
            if (stderrBuf.trim()) console.log(`\x1b[31m[ai-bridge] stderr:\x1b[0m ${stderrBuf.trim().slice(0, 300)}`);
            if (code && code !== 0 && stderrBuf.trim()) {
              res.write(`data: ${JSON.stringify({ error: stderrBuf.trim() })}\n\n`);
            }
            res.write('data: [DONE]\n\n');
            res.end();
          });

          child.on('error', (err: Error) => {
            console.log(`\x1b[31m[ai-bridge] spawn error:\x1b[0m ${err.message}`);
            res.write(`data: ${JSON.stringify({ error: `Failed to spawn claude CLI: ${err.message}` })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
          });

          res.on('close', () => {
            child.kill();
          });
        });
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
    aiBridgePlugin(),
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
    host: true,
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
