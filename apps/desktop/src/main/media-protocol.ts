import { protocol } from 'electron';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';

import type { CatalogStore } from './catalog-store';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.arw': 'image/x-sony-arw',
  '.cr2': 'image/x-canon-cr2',
  '.cr3': 'image/x-canon-cr3',
  '.dng': 'image/x-adobe-dng',
  '.nef': 'image/x-nikon-nef',
  '.orf': 'image/x-olympus-orf',
  '.raf': 'image/x-fuji-raf',
  '.raw': 'image/x-camera-raw',
  '.rw2': 'image/x-panasonic-rw2',
};

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'oriel-app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
    {
      scheme: 'oriel-media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function installMediaProtocol(catalogStore: CatalogStore): void {
  protocol.handle('oriel-media', async (request) => {
    const url = new URL(request.url);
    const requestedPath = url.searchParams.get('path');
    const path = requestedPath ? await catalogStore.resolveAllowedPath(requestedPath) : null;
    if (!path) {
      return new Response('Media path is not in an approved source', { status: 403 });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        headers: { Allow: 'GET, HEAD' },
        status: 405,
      });
    }
    try {
      const contentType = MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';
      const details = await stat(path);
      if (!details.isFile()) return new Response('Media path is not a file', { status: 404 });
      const headers = {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': String(details.size),
        'Content-Type': contentType,
        'Cross-Origin-Resource-Policy': 'cross-origin',
      };
      if (request.method === 'HEAD') {
        return new Response(null, { headers });
      }
      const stream = createReadStream(path);
      request.signal.addEventListener('abort', () => stream.destroy(), { once: true });
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers });
    } catch {
      return new Response('Original is offline', { status: 404 });
    }
  });
}
