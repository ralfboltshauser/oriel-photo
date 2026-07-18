import { createVersion, type PhotoAsset, type SourceRoot } from '@oriel/domain';

export const DEMO_SOURCE: SourceRoot = {
  id: 'demo-alpine-weekend',
  name: 'Alpine weekend',
  path: null,
  kind: 'demo',
  photoCount: 12,
  addedAt: '2026-07-17T08:40:00.000Z',
  online: true,
};

export interface DemoPhotoSeed {
  id: string;
  asset: string;
  fileName: string;
  width: number;
  height: number;
  capturedAt: string;
  camera: string;
  lens: string;
}

export const DEMO_PHOTO_SEEDS: DemoPhotoSeed[] = [
  ['oriel-001', 'photo-10.jpg', 'ORL_1042.jpg', 1600, 1067, '2026-07-11T07:42:00Z'],
  ['oriel-002', 'photo-11.jpg', 'ORL_1051.jpg', 1600, 1067, '2026-07-11T07:48:00Z'],
  ['oriel-003', 'photo-12.jpg', 'ORL_1078.jpg', 1600, 1067, '2026-07-11T08:12:00Z'],
  ['oriel-004', 'photo-13.jpg', 'ORL_1096.jpg', 1600, 1067, '2026-07-11T08:26:00Z'],
  ['oriel-005', 'photo-14.jpg', 'ORL_1124.jpg', 1600, 1067, '2026-07-11T09:04:00Z'],
  ['oriel-006', 'photo-15.jpg', 'ORL_1141.jpg', 1600, 1067, '2026-07-11T09:17:00Z'],
  ['oriel-007', 'photo-16.jpg', 'ORL_1172.jpg', 1600, 1067, '2026-07-11T09:41:00Z'],
  ['oriel-008', 'photo-17.jpg', 'ORL_1190.jpg', 1600, 1067, '2026-07-11T10:02:00Z'],
  ['oriel-009', 'photo-28.jpg', 'ORL_1216.jpg', 1600, 1067, '2026-07-11T11:24:00Z'],
  ['oriel-010', 'photo-29.jpg', 'ORL_1228.jpg', 1600, 1067, '2026-07-11T11:39:00Z'],
  ['oriel-011', 'photo-37.jpg', 'ORL_1264.jpg', 1600, 1067, '2026-07-11T12:08:00Z'],
  ['oriel-012', 'photo-42.jpg', 'ORL_1281.jpg', 1600, 1067, '2026-07-11T12:21:00Z'],
].map(([id, asset, fileName, width, height, capturedAt], index) => ({
  id: String(id),
  asset: String(asset),
  fileName: String(fileName),
  width: Number(width),
  height: Number(height),
  capturedAt: String(capturedAt),
  camera: index < 8 ? 'Fujifilm X-T5' : 'Sony α7 IV',
  lens: index < 8 ? 'XF 23mm F1.4' : 'FE 35mm F1.8',
}));

export function createDemoPhotos(assetUrls: Record<string, string>): PhotoAsset[] {
  return DEMO_PHOTO_SEEDS.map((seed, index) => {
    const version = createVersion('Version 1', `${seed.id}-v1`);
    return {
      id: seed.id,
      sourceId: DEMO_SOURCE.id,
      fileName: seed.fileName,
      absolutePath: null,
      url: assetUrls[seed.asset] ?? '',
      width: seed.width,
      height: seed.height,
      capturedAt: seed.capturedAt,
      camera: seed.camera,
      lens: seed.lens,
      mediaKind: 'bitmap',
      flag: index === 1 || index === 8 ? 'pick' : index === 6 ? 'reject' : 'unflagged',
      rating: index === 1 ? 5 : index === 8 ? 4 : 0,
      activeVersionId: version.id,
      versions: [version],
      online: true,
    };
  });
}
