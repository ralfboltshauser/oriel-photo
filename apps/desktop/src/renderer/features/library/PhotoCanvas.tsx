import type { PhotoAdjustments } from '@oriel/domain';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { loadImage, renderImage } from '../../lib/image-engine';

export function PhotoCanvas({
  adjustments,
  fileName,
  original,
  url,
}: {
  adjustments: PhotoAdjustments;
  fileName: string;
  original: boolean;
  url: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [size, setSize] = useState({ width: 1200, height: 760 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let canceled = false;
    setStatus('loading');
    void loadImage(url)
      .then((loaded) => {
        if (!canceled) {
          setImage(loaded);
          setStatus('ready');
        }
      })
      .catch(() => !canceled && setStatus('error'));
    return () => {
      canceled = true;
    };
  }, [url]);

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
        aria-label={original ? `Original ${fileName}` : `Edited ${fileName}`}
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
          <strong>Original unavailable</strong>
          <span>Your edits are safe. Locate the source to continue.</span>
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
