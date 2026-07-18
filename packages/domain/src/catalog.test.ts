import { describe, expect, it } from 'vitest';

import {
  cloneAdjustments,
  createEmptyCatalog,
  createPhotoFromImport,
  filterPhotos,
  getActiveVersion,
  isAdjusted,
} from './catalog';

const candidate = {
  id: 'photo-1',
  sourceId: 'source-1',
  fileName: 'IMG_0001.jpg',
  absolutePath: '/photos/IMG_0001.jpg',
  url: 'oriel-media://photo?path=%2Fphotos%2FIMG_0001.jpg',
  width: 1600,
  height: 1200,
  capturedAt: '2026-07-17T12:00:00.000Z',
  fileSize: 100,
  mediaKind: 'bitmap',
  supported: true,
} as const;

describe('catalog domain', () => {
  it('creates a photo with an immutable-looking default version boundary', () => {
    const photo = createPhotoFromImport(candidate);
    expect(photo.flag).toBe('unflagged');
    expect(photo.versions).toHaveLength(1);
    expect(getActiveVersion(photo).adjustments).not.toBe(
      getActiveVersion(createPhotoFromImport({ ...candidate, id: 'photo-2' })).adjustments,
    );
  });

  it('deep clones crop instructions', () => {
    const cloned = cloneAdjustments(
      getActiveVersion(createPhotoFromImport(candidate)).adjustments,
    );
    cloned.crop.rotation = 90;
    expect(getActiveVersion(createPhotoFromImport(candidate)).adjustments.crop.rotation).toBe(
      0,
    );
  });

  it('recognizes adjustments and filters culling state', () => {
    const picked = { ...createPhotoFromImport(candidate), flag: 'pick' as const };
    const rejected = {
      ...createPhotoFromImport({ ...candidate, id: 'photo-2' }),
      flag: 'reject' as const,
    };
    expect(filterPhotos([picked, rejected], 'picks', 1)).toEqual([picked]);
    const adjustments = cloneAdjustments(getActiveVersion(picked).adjustments);
    adjustments.exposure = 0.4;
    expect(isAdjusted(adjustments)).toBe(true);
    expect(createEmptyCatalog().onboardingComplete).toBe(false);
  });
});
