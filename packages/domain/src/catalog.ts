import type {
  CatalogDocument,
  CropRecipe,
  FilterMode,
  ImportCandidate,
  MediaKind,
  PhotoAdjustments,
  PhotoAsset,
  PhotoVersion,
  SourceRoot,
} from './types';

export const BITMAP_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'] as const;
export const CAMERA_RAW_EXTENSIONS = [
  '.arw',
  '.cr2',
  '.cr3',
  '.dng',
  '.nef',
  '.orf',
  '.raf',
  '.raw',
  '.rw2',
] as const;

const bitmapExtensionSet = new Set<string>(BITMAP_EXTENSIONS);
const cameraRawExtensionSet = new Set<string>(CAMERA_RAW_EXTENSIONS);

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot < 0 ? '' : fileName.slice(dot).toLowerCase();
}

export function mediaKindForFileName(fileName: string): MediaKind | null {
  const extension = extensionOf(fileName);
  if (bitmapExtensionSet.has(extension)) return 'bitmap';
  if (cameraRawExtensionSet.has(extension)) return 'camera-raw';
  return null;
}

export function formatLabelForFileName(fileName: string): string {
  const extension = extensionOf(fileName);
  return extension ? extension.slice(1).toUpperCase() : 'Image';
}

export const DEFAULT_CROP: CropRecipe = {
  aspect: 'original',
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  rotation: 0,
};

export const DEFAULT_ADJUSTMENTS: PhotoAdjustments = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  monochrome: false,
  crop: DEFAULT_CROP,
};

export function cloneAdjustments(adjustments: PhotoAdjustments): PhotoAdjustments {
  return {
    ...adjustments,
    crop: { ...adjustments.crop },
  };
}

export function createVersion(
  name = 'Original edit',
  id: string = crypto.randomUUID(),
): PhotoVersion {
  return {
    id,
    name,
    createdAt: new Date().toISOString(),
    adjustments: cloneAdjustments(DEFAULT_ADJUSTMENTS),
  };
}

export function createPhotoFromImport(candidate: ImportCandidate): PhotoAsset {
  const version = createVersion('Version 1', `${candidate.id}-v1`);
  return {
    id: candidate.id,
    sourceId: candidate.sourceId,
    fileName: candidate.fileName,
    absolutePath: candidate.absolutePath,
    url: candidate.url,
    width: candidate.width,
    height: candidate.height,
    capturedAt: candidate.capturedAt,
    camera: 'Metadata pending',
    lens: 'Metadata pending',
    mediaKind: candidate.mediaKind,
    flag: 'unflagged',
    rating: 0,
    activeVersionId: version.id,
    versions: [version],
    online: true,
  };
}

export function createEmptyCatalog(): CatalogDocument {
  return {
    schemaVersion: 2,
    onboardingComplete: false,
    shortcutHintDismissed: false,
    sources: [],
    photos: [],
    selectedPhotoIds: [],
    anchorPhotoId: null,
    workspace: 'library',
    viewMode: 'grid',
    filter: 'all',
    minimumRating: 1,
    panelsHidden: false,
    lastOpenedAt: new Date().toISOString(),
  };
}

export function getActiveVersion(photo: PhotoAsset): PhotoVersion {
  return (
    photo.versions.find((version) => version.id === photo.activeVersionId) ?? photo.versions[0]!
  );
}

export function isAdjusted(adjustments: PhotoAdjustments): boolean {
  return (
    adjustments.exposure !== 0 ||
    adjustments.contrast !== 0 ||
    adjustments.highlights !== 0 ||
    adjustments.shadows !== 0 ||
    adjustments.whites !== 0 ||
    adjustments.blacks !== 0 ||
    adjustments.temperature !== 0 ||
    adjustments.tint !== 0 ||
    adjustments.vibrance !== 0 ||
    adjustments.saturation !== 0 ||
    adjustments.monochrome ||
    adjustments.crop.aspect !== 'original' ||
    adjustments.crop.rotation !== 0
  );
}

export function filterPhotos(
  photos: PhotoAsset[],
  filter: FilterMode,
  minimumRating: number,
): PhotoAsset[] {
  if (filter === 'picks') return photos.filter((photo) => photo.flag === 'pick');
  if (filter === 'rejects') return photos.filter((photo) => photo.flag === 'reject');
  if (filter === 'unflagged') return photos.filter((photo) => photo.flag === 'unflagged');
  if (filter === 'rated') return photos.filter((photo) => photo.rating >= minimumRating);
  return photos;
}

export function mergeImportedSource(
  catalog: CatalogDocument,
  source: SourceRoot,
  candidates: ImportCandidate[],
): CatalogDocument {
  const existingPaths = new Set(
    catalog.photos.map((photo) => photo.absolutePath).filter((path) => path !== null),
  );
  const newPhotos = candidates
    .filter((candidate) => !existingPaths.has(candidate.absolutePath))
    .map(createPhotoFromImport);

  return {
    ...catalog,
    onboardingComplete: true,
    sources: [...catalog.sources.filter((item) => item.id !== source.id), source],
    photos: [...catalog.photos, ...newPhotos],
    selectedPhotoIds:
      catalog.selectedPhotoIds.length > 0
        ? catalog.selectedPhotoIds
        : newPhotos[0]
          ? [newPhotos[0].id]
          : [],
    anchorPhotoId: catalog.anchorPhotoId ?? newPhotos[0]?.id ?? null,
  };
}
