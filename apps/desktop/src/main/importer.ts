import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import {
  BITMAP_EXTENSIONS,
  CAMERA_RAW_EXTENSIONS,
  mediaKindForFileName,
  type ImportCandidate,
  type ImportScanResult,
  type SourceRoot,
} from '@oriel/domain';

const SUPPORTED_EXTENSIONS = new Set<string>([...BITMAP_EXTENSIONS, ...CAMERA_RAW_EXTENSIONS]);
const MAX_RELEVANT_FILES = 5_000;
const METADATA_CONCURRENCY = 24;

interface CollectedFiles {
  files: string[];
  truncated: boolean;
  warnings: string[];
}

async function collectFiles(root: string): Promise<CollectedFiles> {
  const directories = [root];
  const files: string[] = [];
  const warnings: string[] = [];
  let truncated = false;

  while (directories.length > 0 && !truncated) {
    const current = directories.pop()!;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      warnings.push(`Could not read ${current}`);
      continue;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) {
        warnings.push(`Skipped symbolic link: ${entry.name}`);
        continue;
      }
      if (entry.isDirectory()) {
        directories.push(path);
        continue;
      }
      if (!entry.isFile()) continue;
      const extension = extname(path).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(extension)) continue;
      if (files.length >= MAX_RELEVANT_FILES) {
        truncated = true;
        break;
      }
      files.push(path);
    }
  }

  if (truncated) {
    warnings.push(
      `This build reviews at most ${MAX_RELEVANT_FILES.toLocaleString()} relevant files per folder. Split larger shoots into folders before importing.`,
    );
  }
  return { files, truncated, warnings: warnings.slice(0, 100) };
}

function stableId(path: string, size: number, modified: number): string {
  return createHash('sha256').update(`${path}:${size}:${modified}`).digest('hex').slice(0, 24);
}

function stableSourceId(path: string): string {
  return `source-${createHash('sha256').update(path).digest('hex').slice(0, 20)}`;
}

async function inspectFile(filePath: string, sourceId: string): Promise<ImportCandidate> {
  const extension = extname(filePath).toLowerCase();
  const mediaKind = mediaKindForFileName(filePath);
  const supported = mediaKind !== null;
  try {
    const details = await stat(filePath);
    return {
      id: stableId(filePath, details.size, details.mtimeMs),
      sourceId,
      fileName: basename(filePath),
      absolutePath: filePath,
      url: `oriel-media://image?path=${encodeURIComponent(filePath)}`,
      width: 0,
      height: 0,
      capturedAt: details.mtime.toISOString(),
      fileSize: details.size,
      mediaKind: mediaKind ?? 'bitmap',
      supported,
      reason: supported ? undefined : `${extension.slice(1).toUpperCase()} is not supported`,
    };
  } catch {
    return {
      id: stableId(filePath, 0, 0),
      sourceId,
      fileName: basename(filePath),
      absolutePath: filePath,
      url: '',
      width: 0,
      height: 0,
      capturedAt: new Date(0).toISOString(),
      fileSize: 0,
      mediaKind: mediaKind ?? 'bitmap',
      supported: false,
      reason: 'Could not read file metadata',
    };
  }
}

export async function scanFolder(path: string): Promise<ImportScanResult> {
  const sourceId = stableSourceId(path);
  const collected = await collectFiles(path);
  const candidates: ImportCandidate[] = [];
  for (let index = 0; index < collected.files.length; index += METADATA_CONCURRENCY) {
    const batch = collected.files.slice(index, index + METADATA_CONCURRENCY);
    candidates.push(
      ...(await Promise.all(batch.map((filePath) => inspectFile(filePath, sourceId)))),
    );
  }

  candidates.sort(
    (left, right) =>
      left.capturedAt.localeCompare(right.capturedAt) ||
      left.fileName.localeCompare(right.fileName),
  );
  const ready = candidates.filter((candidate) => candidate.supported);
  const skipped = candidates.filter((candidate) => !candidate.supported);
  const source: SourceRoot = {
    id: sourceId,
    name: basename(path),
    path,
    kind: 'folder',
    photoCount: ready.length,
    addedAt: new Date().toISOString(),
    online: true,
  };
  return {
    source,
    ready,
    skipped,
    warnings: collected.warnings,
    truncated: collected.truncated,
  };
}
