import { protocol } from 'electron';
import { readFile } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function responseHeaders(path: string): HeadersInit {
  return {
    'Cache-Control': 'no-cache',
    'Content-Type': MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  };
}

export function installAppProtocol(): void {
  const rendererRoot = resolve(__dirname, '../renderer');
  protocol.handle('oriel-app', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'app')
      return new Response('Unknown application origin', { status: 404 });
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Malformed application path', { status: 400 });
    }
    const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const path = resolve(join(rendererRoot, relativePath));
    const escaped = relative(rendererRoot, path);
    if (escaped === '..' || escaped.startsWith(`..${sep}`)) {
      return new Response('Application path is outside the renderer bundle', { status: 403 });
    }
    try {
      const bytes = await readFile(path);
      return new Response(bytes, { headers: responseHeaders(path) });
    } catch {
      return new Response('Application asset not found', { status: 404 });
    }
  });
}
