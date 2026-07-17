import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const desktopRoot = dirname(fileURLToPath(import.meta.url));

// A browser-only renderer harness keeps most product-flow tests fast while exercising the
// exact React entry point, styles, fixture images, canvas renderer, and browser bridge used by
// the desktop renderer. Native boundaries are covered separately by the Electron smoke test.
export default defineConfig({
  root: resolve(desktopRoot, 'src/renderer'),
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve(desktopRoot, 'src/renderer'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 41783,
    strictPort: true,
  },
});
