import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    build: {
      externalizeDeps: { exclude: ['@oriel/domain'] },
      outDir: 'out/main',
      sourcemap: true,
    },
  },
  preload: {
    build: {
      outDir: 'out/preload',
      sourcemap: true,
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    plugins: [react()],
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer'),
      },
    },
    build: {
      outDir: resolve('out/renderer'),
      emptyOutDir: true,
      sourcemap: true,
    },
  },
});
