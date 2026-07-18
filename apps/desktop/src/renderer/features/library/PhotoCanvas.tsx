import type { PhotoAdjustments, PhotoAsset } from '@oriel/domain';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { loadImage, renderImage } from '../../lib/image-engine';
import { getPhotoImageResource } from '../../lib/raw-engine';
import { useCatalogStore } from '../../store/catalog-store';

export function PhotoCanvas({
  adjustments,
  original,
  photo,
}: {
  adjustments: PhotoAdjustments;
  original: boolean;
  photo: PhotoAsset;
}) {
  const updatePhotoMetadata = useCatalogStore((state) => state.updatePhotoMetadata);
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [sourcePhotoId, setSourcePhotoId] = useState('');
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [size, setSize] = useState({ width: 1200, height: 760 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState(
    'Your edits are safe. Locate the source to continue.',
  );

  useEffect(() => {
    let canceled = false;
    let release: () => void = () => undefined;
    setImage(null);
    setStatus('loading');
    setSourcePhotoId('');
    setSourceSize({ width: 0, height: 0 });
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    void getPhotoImageResource(
      { id: photo.id, mediaKind: photo.mediaKind, url: photo.url },
      'preview',
    )
      .then((resource) => {
        release = resource.release;
        if (photo.mediaKind === 'camera-raw') updatePhotoMetadata(photo.id, resource.metadata);
        return loadImage(resource.url);
      })
      .then((loaded) => {
        if (!canceled) {
          setImage(loaded);
          setSourcePhotoId(photo.id);
          setSourceSize({ height: loaded.naturalHeight, width: loaded.naturalWidth });
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (!canceled) {
          setErrorMessage(
            error instanceof Error ? error.message : 'The original could not be decoded.',
          );
          setStatus('error');
        }
      });
    return () => {
      canceled = true;
      release();
    };
  }, [photo.id, photo.mediaKind, photo.url, updatePhotoMetadata]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: Math.max(120, entry.contentRect.width - 72),
        height: Math.max(120, entry.contentRect.height - 72),
      });
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const frame = requestAnimationFrame(() => {
      try {
        renderImage(canvas, image, adjustments, {
          maxWidth: size.width,
          maxHeight: size.height,
          original,
        });
        setStatus('ready');
      } catch {
        setStatus('error');
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [adjustments, image, original, size]);

  return (
    <div
      className="photo-canvas-host"
      data-feedback="photo.preview"
      data-original={original}
      ref={hostRef}
    >
      <canvas
        aria-label={original ? `Original ${photo.fileName}` : `Edited ${photo.fileName}`}
        data-media-kind={photo.mediaKind}
        data-photo-id={photo.id}
        data-render-status={status}
        data-source-height={sourceSize.height}
        data-source-photo-id={sourcePhotoId}
        data-source-width={sourceSize.width}
        ref={canvasRef}
        role="img"
      />
      {status === 'loading' ? (
        <div className="canvas-status">
          <LoaderCircle size={17} />
          <span>Preparing preview…</span>
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="canvas-status error">
          <AlertCircle size={17} />
          <strong>
            {photo.mediaKind === 'camera-raw'
              ? 'RAW preview unavailable'
              : 'Original unavailable'}
          </strong>
          <span>{errorMessage}</span>
        </div>
      ) : null}
      {original ? (
        <div className="original-indicator">
          <span>Original</span>
          <kbd>\</kbd>
        </div>
      ) : null}
    </div>
  );
}
