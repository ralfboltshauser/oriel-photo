import { app } from 'electron';
import { mkdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

import type {
  CatalogDocument,
  CropRecipe,
  PhotoAdjustments,
  PhotoAsset,
  PhotoVersion,
  SourceRoot,
} from '@oriel/domain';
import log from 'electron-log/main';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isCrop(value: unknown): value is CropRecipe {
  if (!isRecord(value)) return false;
  return (
    ['original', '1:1', '4:5', '16:9'].includes(String(value.aspect)) &&
    [value.x, value.y, value.width, value.height].every(
      (number) => isFiniteNumber(number) && number >= 0 && number <= 1,
    ) &&
    [0, 90, 180, 270].includes(Number(value.rotation))
  );
}

function isAdjustments(value: unknown): value is PhotoAdjustments {
  if (!isRecord(value)) return false;
  const numericKeys: (keyof PhotoAdjustments)[] = [
    'exposure',
    'contrast',
    'highlights',
    'shadows',
    'whites',
    'blacks',
    'temperature',
    'tint',
    'vibrance',
    'saturation',
  ];
  return (
    numericKeys.every((key) => isFiniteNumber(value[key]) && Math.abs(value[key]) <= 10_000) &&
    typeof value.monochrome === 'boolean' &&
    isCrop(value.crop)
  );
}

function isVersion(value: unknown): value is PhotoVersion {
  return (
    isRecord(value) &&
    isString(value.id) &&
    value.id.length > 0 &&
    isString(value.name) &&
    isString(value.createdAt) &&
    isAdjustments(value.adjustments)
  );
}

function isPhoto(value: unknown): value is PhotoAsset {
  if (!isRecord(value) || !Array.isArray(value.versions) || !value.versions.every(isVersion)) {
    return false;
  }
  const versions = value.versions;
  const rating = value.rating;
  return (
    versions.length > 0 &&
    isString(value.id) &&
    value.id.length > 0 &&
    isString(value.sourceId) &&
    isString(value.fileName) &&
    (value.absolutePath === null || isString(value.absolutePath)) &&
    isString(value.url) &&
    isFiniteNumber(value.width) &&
    value.width >= 0 &&
    isFiniteNumber(value.height) &&
    value.height >= 0 &&
    isString(value.capturedAt) &&
    isString(value.camera) &&
    isString(value.lens) &&
    ['unflagged', 'pick', 'reject'].includes(String(value.flag)) &&
    isFiniteNumber(rating) &&
    Number.isInteger(rating) &&
    rating >= 0 &&
    rating <= 5 &&
    isString(value.activeVersionId) &&
    versions.some((version) => version.id === value.activeVersionId) &&
    typeof value.online === 'boolean'
  );
}

function isSource(value: unknown): value is SourceRoot {
  return (
    isRecord(value) &&
    isString(value.id) &&
    value.id.length > 0 &&
    isString(value.name) &&
    (value.path === null || isString(value.path)) &&
    ['demo', 'folder'].includes(String(value.kind)) &&
    isFiniteNumber(value.photoCount) &&
    Number.isInteger(value.photoCount) &&
    value.photoCount >= 0 &&
    isString(value.addedAt) &&
    typeof value.online === 'boolean'
  );
}

function isCatalogDocument(value: unknown): value is CatalogDocument {
  if (!isRecord(value) || !Array.isArray(value.photos) || !value.photos.every(isPhoto)) {
    return false;
  }
  if (!Array.isArray(value.sources) || !value.sources.every(isSource)) return false;
  if (!Array.isArray(value.selectedPhotoIds) || !value.selectedPhotoIds.every(isString)) {
    return false;
  }
  const photoIds = new Set(value.photos.map((photo) => photo.id));
  const sourceIds = new Set(value.sources.map((source) => source.id));
  return (
    value.schemaVersion === 1 &&
    typeof value.onboardingComplete === 'boolean' &&
    typeof value.shortcutHintDismissed === 'boolean' &&
    photoIds.size === value.photos.length &&
    sourceIds.size === value.sources.length &&
    value.photos.every((photo) => sourceIds.has(photo.sourceId)) &&
    value.selectedPhotoIds.every((id) => photoIds.has(id)) &&
    (value.anchorPhotoId === null ||
      (isString(value.anchorPhotoId) && photoIds.has(value.anchorPhotoId))) &&
    ['library', 'select', 'edit', 'deliver'].includes(String(value.workspace)) &&
    ['grid', 'photo'].includes(String(value.viewMode)) &&
    ['all', 'picks', 'unflagged', 'rejects', 'rated'].includes(String(value.filter)) &&
    [1, 2, 3, 4, 5].includes(Number(value.minimumRating)) &&
    typeof value.panelsHidden === 'boolean' &&
    isString(value.lastOpenedAt)
  );
}

export class CatalogStore {
  private readonly backupPath: string;
  private readonly catalogPath: string;
  private allowedRoots = new Set<string>();
  private revision = 0;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(userDataPath = app.getPath('userData')) {
    this.catalogPath = join(userDataPath, 'catalog-v1.json');
    this.backupPath = `${this.catalogPath}.backup`;
  }

  async load(): Promise<CatalogDocument | null> {
    let primaryError: unknown = null;
    for (const path of [this.catalogPath, this.backupPath]) {
      try {
        const catalog = await this.readCatalog(path);
        await this.refreshAllowedRoots(catalog);
        if (path === this.backupPath) log.warn('Recovered catalog from the rotating backup');
        return catalog;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          primaryError ??= error;
          log.error(`Could not load catalog candidate ${path}`, error);
        }
      }
    }
    if (primaryError instanceof Error) throw primaryError;
    if (primaryError)
      throw new Error('The catalog could not be opened', { cause: primaryError });
    return null;
  }

  async save(catalog: CatalogDocument): Promise<void> {
    if (!isCatalogDocument(catalog)) throw new Error('Refusing to save an invalid catalog');
    this.assertAuthorizedSources(catalog);
    const serialized = JSON.stringify(catalog, null, 2);
    if (serialized.length > 100_000_000) throw new Error('Catalog is unexpectedly large');
    const revision = ++this.revision;
    const operation = this.writeQueue
      .catch(() => undefined)
      .then(() => this.writeCatalog(serialized, revision));
    this.writeQueue = operation;
    await operation;
  }

  async flush(): Promise<void> {
    await this.writeQueue;
  }

  async addAllowedRoot(path: string): Promise<string> {
    const canonical = await realpath(path);
    this.allowedRoots.add(canonical);
    return canonical;
  }

  async isAllowedPath(path: string): Promise<boolean> {
    let candidate: string;
    try {
      candidate = await realpath(path);
    } catch {
      return false;
    }
    return [...this.allowedRoots].some(
      (root) => candidate === root || candidate.startsWith(`${root}${sep}`),
    );
  }

  private async readCatalog(path: string): Promise<CatalogDocument> {
    const json = await readFile(path, 'utf8');
    const parsed: unknown = JSON.parse(json);
    if (!isCatalogDocument(parsed))
      throw new Error('Catalog schema or invariants are not recognized');
    return parsed;
  }

  private async writeCatalog(serialized: string, revision: number): Promise<void> {
    await mkdir(dirname(this.catalogPath), { recursive: true });
    const temporaryPath = `${this.catalogPath}.${process.pid}.${revision}.tmp`;
    await writeFile(temporaryPath, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
    let movedExisting = false;
    try {
      await rm(this.backupPath, { force: true });
      try {
        await rename(this.catalogPath, this.backupPath);
        movedExisting = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      await rename(temporaryPath, this.catalogPath);
    } catch (error) {
      if (movedExisting) {
        await rename(this.backupPath, this.catalogPath).catch((restoreError) => {
          log.error('Could not restore catalog backup after a failed save', restoreError);
        });
      }
      throw error;
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  private assertAuthorizedSources(catalog: CatalogDocument): void {
    for (const source of catalog.sources) {
      if (source.path !== null && !this.allowedRoots.has(resolve(source.path))) {
        throw new Error(`Source root was not approved by the main process: ${source.name}`);
      }
    }
  }

  private async refreshAllowedRoots(catalog: CatalogDocument): Promise<void> {
    const roots = await Promise.all(
      catalog.sources
        .map((source) => source.path)
        .filter((path): path is string => path !== null)
        .map(async (path) => realpath(path).catch(() => null)),
    );
    this.allowedRoots = new Set(roots.filter((path): path is string => path !== null));
  }
}
