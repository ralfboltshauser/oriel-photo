import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEmptyCatalog, createPhotoFromImport, type SourceRoot } from '@oriel/domain';
import { afterEach, describe, expect, it } from 'vitest';

import { CatalogStore } from './catalog-store';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { force: true, recursive: true })),
  );
});

describe('catalog migrations', () => {
  it('classifies existing schema-one photos without losing their catalog state', async () => {
    const userDataPath = await mkdtemp(join(tmpdir(), 'oriel-catalog-migration-'));
    temporaryRoots.push(userDataPath);
    const source: SourceRoot = {
      addedAt: '2026-07-18T08:00:00.000Z',
      id: 'legacy-source',
      kind: 'demo',
      name: 'Legacy shoot',
      online: true,
      path: null,
      photoCount: 2,
    };
    const base = createEmptyCatalog();
    const photos = [
      createPhotoFromImport({
        absolutePath: '/legacy/A6700.ARW',
        capturedAt: '2026-07-18T08:00:00.000Z',
        fileName: 'A6700.ARW',
        fileSize: 42_000_000,
        height: 4168,
        id: 'raw-photo',
        mediaKind: 'camera-raw',
        sourceId: source.id,
        supported: true,
        url: 'oriel-media://photo/raw-photo',
        width: 6240,
      }),
      createPhotoFromImport({
        absolutePath: '/legacy/reference.JPG',
        capturedAt: '2026-07-18T08:00:01.000Z',
        fileName: 'reference.JPG',
        fileSize: 2_000_000,
        height: 1600,
        id: 'bitmap-photo',
        mediaKind: 'bitmap',
        sourceId: source.id,
        supported: true,
        url: 'oriel-media://photo/bitmap-photo',
        width: 2400,
      }),
    ];
    const legacyPhotos = photos.map(({ mediaKind, ...photo }) => {
      expect(mediaKind).toBeDefined();
      return photo;
    });
    await writeFile(
      join(userDataPath, 'catalog-v1.json'),
      JSON.stringify({
        ...base,
        anchorPhotoId: 'raw-photo',
        photos: legacyPhotos,
        schemaVersion: 1,
        selectedPhotoIds: ['raw-photo'],
        sources: [source],
      }),
      'utf8',
    );

    const loaded = await new CatalogStore(userDataPath).load();

    expect(loaded).toMatchObject({
      anchorPhotoId: 'raw-photo',
      schemaVersion: 2,
      selectedPhotoIds: ['raw-photo'],
    });
    expect(loaded?.photos.map(({ fileName, mediaKind }) => ({ fileName, mediaKind }))).toEqual([
      { fileName: 'A6700.ARW', mediaKind: 'camera-raw' },
      { fileName: 'reference.JPG', mediaKind: 'bitmap' },
    ]);
  });
});
