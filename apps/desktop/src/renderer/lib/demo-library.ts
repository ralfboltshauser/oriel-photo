import { createDemoPhotos, DEMO_SOURCE } from '@oriel/fixtures';

import photo10 from '@oriel/fixtures/assets/photo-10.jpg?url';
import photo11 from '@oriel/fixtures/assets/photo-11.jpg?url';
import photo12 from '@oriel/fixtures/assets/photo-12.jpg?url';
import photo13 from '@oriel/fixtures/assets/photo-13.jpg?url';
import photo14 from '@oriel/fixtures/assets/photo-14.jpg?url';
import photo15 from '@oriel/fixtures/assets/photo-15.jpg?url';
import photo16 from '@oriel/fixtures/assets/photo-16.jpg?url';
import photo17 from '@oriel/fixtures/assets/photo-17.jpg?url';
import photo28 from '@oriel/fixtures/assets/photo-28.jpg?url';
import photo29 from '@oriel/fixtures/assets/photo-29.jpg?url';
import photo37 from '@oriel/fixtures/assets/photo-37.jpg?url';
import photo42 from '@oriel/fixtures/assets/photo-42.jpg?url';

const assetUrls: Record<string, string> = {
  'photo-10.jpg': photo10,
  'photo-11.jpg': photo11,
  'photo-12.jpg': photo12,
  'photo-13.jpg': photo13,
  'photo-14.jpg': photo14,
  'photo-15.jpg': photo15,
  'photo-16.jpg': photo16,
  'photo-17.jpg': photo17,
  'photo-28.jpg': photo28,
  'photo-29.jpg': photo29,
  'photo-37.jpg': photo37,
  'photo-42.jpg': photo42,
};

export function buildDemoLibrary() {
  return { source: DEMO_SOURCE, photos: createDemoPhotos(assetUrls) };
}

export function refreshDemoUrls<T extends { id: string; sourceId: string; url: string }>(
  photos: T[],
): T[] {
  const current = new Map(createDemoPhotos(assetUrls).map((photo) => [photo.id, photo.url]));
  return photos.map((photo) =>
    photo.sourceId === DEMO_SOURCE.id
      ? { ...photo, url: current.get(photo.id) ?? photo.url }
      : photo,
  );
}
