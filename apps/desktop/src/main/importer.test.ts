import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { scanFolder } from './importer';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { force: true, recursive: true })),
  );
});

async function makeShoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'oriel-import-'));
  temporaryRoots.push(root);
  await mkdir(join(root, 'selects'));
  await Promise.all([
    writeFile(join(root, 'frame-01.JPG'), 'jpeg fixture'),
    writeFile(join(root, 'selects', 'frame-02.webp'), 'webp fixture'),
    writeFile(join(root, 'frame-03.CR3'), 'raw fixture'),
    writeFile(join(root, 'notes.txt'), 'ignored sidecar'),
  ]);
  return root;
}

describe('folder scanning', () => {
  it('recurses, separates truthful preview support, and ignores unrelated files', async () => {
    const root = await makeShoot();
    const result = await scanFolder(root);

    expect(result.source).toMatchObject({
      kind: 'folder',
      name: expect.stringMatching(/^oriel-import-/),
      path: root,
      photoCount: 2,
    });
    expect(result.ready.map((photo) => photo.fileName).sort()).toEqual([
      'frame-01.JPG',
      'frame-02.webp',
    ]);
    expect(result.ready.every((photo) => photo.supported)).toBe(true);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]).toMatchObject({
      fileName: 'frame-03.CR3',
      supported: false,
      reason: 'CR3 RAW decoding is not available in this build',
    });
    expect(result.warnings).toEqual([]);
    expect(result.truncated).toBe(false);
  });

  it('keeps photo identity stable when the file has not changed', async () => {
    const root = await makeShoot();
    const first = await scanFolder(root);
    const second = await scanFolder(root);

    expect(second.source.id).toBe(first.source.id);
    expect(second.ready.map((photo) => photo.id).sort()).toEqual(
      first.ready.map((photo) => photo.id).sort(),
    );
  });
});
