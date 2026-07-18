import type { DecodedPhotoMetadata, PhotoAsset } from '@oriel/domain';
import LibRaw, { type LibRawImageData, type LibRawMetadata } from 'libraw-wasm';

type RawDecodePurpose = 'thumbnail' | 'preview' | 'export';

interface RawImageResource {
  metadata: DecodedPhotoMetadata;
  release: () => void;
  url: string;
}

interface CachedRawImage {
  lastUsed: number;
  metadata: DecodedPhotoMetadata;
  url: string;
}

const previewCache = new Map<string, Promise<CachedRawImage>>();
const thumbnailCache = new Map<string, Promise<CachedRawImage>>();
const MAX_PREVIEWS = 4;
const MAX_THUMBNAILS = 96;
const MAX_RAW_BYTES = 250_000_000;
let activeDecodes = 0;
const decodeWaiters: (() => void)[] = [];

async function enterDecodeQueue(): Promise<void> {
  if (activeDecodes < 2) {
    activeDecodes += 1;
    return;
  }
  await new Promise<void>((resolve) => decodeWaiters.push(resolve));
  activeDecodes += 1;
}

function leaveDecodeQueue(): void {
  activeDecodes -= 1;
  decodeWaiters.shift()?.();
}

function normalizeMetadata(metadata: LibRawMetadata | undefined): DecodedPhotoMetadata {
  if (!metadata) throw new Error('The RAW decoder returned no metadata');
  const camera = [metadata.camera_make, metadata.camera_model].filter(Boolean).join(' ').trim();
  const lens =
    metadata.lens?.Lens || metadata.lens?.makernotes?.Lens || 'Lens metadata unavailable';
  const capturedAt =
    metadata.timestamp instanceof Date && Number.isFinite(metadata.timestamp.getTime())
      ? metadata.timestamp.toISOString()
      : new Date(0).toISOString();
  return {
    aperture: Number(metadata.aperture) || 0,
    camera: camera || 'Camera metadata unavailable',
    capturedAt,
    focalLength: Number(metadata.focal_len) || 0,
    height: Number(metadata.height) || 0,
    iso: Number(metadata.iso_speed) || 0,
    lens,
    shutterSeconds: Number(metadata.shutter) || 0,
    width: Number(metadata.width) || 0,
  };
}

async function fetchRawBytes(url: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`The RAW original is unavailable (${response.status})`);
  const declaredSize = Number(response.headers.get('content-length') ?? 0);
  if (declaredSize > MAX_RAW_BYTES)
    throw new Error('The RAW file exceeds Oriel’s 250 MB limit');
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_RAW_BYTES) {
    throw new Error('The RAW file is empty or exceeds Oriel’s 250 MB limit');
  }
  return new Uint8Array(buffer);
}

async function rgbImageToBlob(image: LibRawImageData): Promise<Blob> {
  if (image.colors < 3 || image.width < 1 || image.height < 1) {
    throw new Error('The RAW decoder returned invalid image dimensions');
  }
  const pixels = image.width * image.height;
  if (pixels > 120_000_000)
    throw new Error('The decoded RAW image is too large to render safely');
  const rgba = new Uint8ClampedArray(pixels * 4);
  const source = image.data;
  const isSixteenBit = source instanceof Uint16Array || image.bits > 8;
  for (
    let sourceIndex = 0, targetIndex = 0;
    targetIndex < rgba.length;
    sourceIndex += image.colors
  ) {
    const scale = isSixteenBit ? 1 / 257 : 1;
    rgba[targetIndex] = Math.round((source[sourceIndex] ?? 0) * scale);
    rgba[targetIndex + 1] = Math.round((source[sourceIndex + 1] ?? 0) * scale);
    rgba[targetIndex + 2] = Math.round((source[sourceIndex + 2] ?? 0) * scale);
    rgba[targetIndex + 3] = 255;
    targetIndex += 4;
  }
  const imageData = new ImageData(rgba, image.width, image.height);
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('A canvas could not be created for the RAW preview');
    context.putImageData(imageData, 0, 0);
    return canvas.convertToBlob({ type: 'image/png' });
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('A canvas could not be created for the RAW preview');
  context.putImageData(imageData, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('RAW preview encoding failed'))),
      'image/png',
    );
  });
}

async function decodeRaw(url: string, purpose: RawDecodePurpose): Promise<CachedRawImage> {
  if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') {
    throw new Error('The RAW worker is unavailable because the renderer is not isolated');
  }
  await enterDecodeQueue();
  let decoder: LibRaw | null = null;
  try {
    decoder = new LibRaw();
    const bytes = await fetchRawBytes(url);
    await decoder.open(bytes.buffer, {
      halfSize: purpose !== 'export',
      highlight: 2,
      outputBps: 8,
      outputColor: 1,
      useCameraMatrix: 3,
      useCameraWb: true,
      userQual: 3,
    });
    const metadata = normalizeMetadata(await decoder.metadata(true));
    if (purpose === 'thumbnail') {
      const thumbnail = await decoder.thumbnailData();
      if (thumbnail?.format === 'jpeg' && thumbnail.data.byteLength > 0) {
        return {
          lastUsed: performance.now(),
          metadata,
          url: URL.createObjectURL(
            new Blob([Uint8Array.from(thumbnail.data)], { type: 'image/jpeg' }),
          ),
        };
      }
    }
    const decoded = await decoder.imageData();
    if (!decoded) throw new Error('The RAW decoder returned no processed image');
    const blob = await rgbImageToBlob(decoded);
    return { lastUsed: performance.now(), metadata, url: URL.createObjectURL(blob) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`RAW decode failed: ${message}`, { cause: error });
  } finally {
    try {
      decoder?.dispose();
    } finally {
      leaveDecodeQueue();
    }
  }
}

function prune(cache: Map<string, Promise<CachedRawImage>>, maximum: number): void {
  if (cache.size <= maximum) return;
  const entries = [...cache.entries()];
  void Promise.all(
    entries.map(async ([key, promise]) => ({ key, resource: await promise.catch(() => null) })),
  ).then((resolved) => {
    resolved
      .filter(
        (entry): entry is { key: string; resource: CachedRawImage } => entry.resource !== null,
      )
      .sort((left, right) => left.resource.lastUsed - right.resource.lastUsed)
      .slice(0, Math.max(0, cache.size - maximum))
      .forEach(({ key, resource }) => {
        if (cache.delete(key)) URL.revokeObjectURL(resource.url);
      });
  });
}

async function cachedRaw(
  cache: Map<string, Promise<CachedRawImage>>,
  maximum: number,
  cacheKey: string,
  url: string,
  purpose: RawDecodePurpose,
): Promise<RawImageResource> {
  let promise = cache.get(cacheKey);
  if (!promise) {
    promise = decodeRaw(url, purpose).catch((error) => {
      cache.delete(cacheKey);
      throw error;
    });
    cache.set(cacheKey, promise);
    prune(cache, maximum);
  }
  const resource = await promise;
  resource.lastUsed = performance.now();
  return { metadata: resource.metadata, release: () => undefined, url: resource.url };
}

export async function getPhotoImageResource(
  photo: Pick<PhotoAsset, 'id' | 'mediaKind' | 'url'>,
  purpose: RawDecodePurpose,
): Promise<RawImageResource> {
  if (photo.mediaKind === 'bitmap') {
    return {
      metadata: {
        aperture: 0,
        camera: '',
        capturedAt: new Date(0).toISOString(),
        focalLength: 0,
        height: 0,
        iso: 0,
        lens: '',
        shutterSeconds: 0,
        width: 0,
      },
      release: () => undefined,
      url: photo.url,
    };
  }
  const cacheKey = `${photo.id}:${photo.url}`;
  if (purpose === 'thumbnail') {
    return cachedRaw(thumbnailCache, MAX_THUMBNAILS, cacheKey, photo.url, purpose);
  }
  if (purpose === 'preview') {
    return cachedRaw(previewCache, MAX_PREVIEWS, cacheKey, photo.url, purpose);
  }
  const resource = await decodeRaw(photo.url, purpose);
  return {
    metadata: resource.metadata,
    release: () => URL.revokeObjectURL(resource.url),
    url: resource.url,
  };
}

export async function isPhotoOriginalOnline(photo: Pick<PhotoAsset, 'url'>): Promise<boolean> {
  return fetch(photo.url, { method: 'HEAD' })
    .then((response) => response.ok)
    .catch(() => false);
}
