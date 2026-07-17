import { protocol } from 'electron';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import type { CatalogStore } from './catalog-store';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
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
    const path = url.searchParams.get('path');
    if (!path || !(await catalogStore.isAllowedPath(path))) {
      return new Response('Media path is not in an approved source', { status: 403 });
    }
    try {
      const bytes = await readFile(path);
      return new Response(bytes, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, max-age=3600',
          'Content-Type': MIME_TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
        },
      });
    } catch {
      return new Response('Original is offline', { status: 404 });
    }
  });
}
