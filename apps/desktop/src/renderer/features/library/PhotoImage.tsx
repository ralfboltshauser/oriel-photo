import type { PhotoAsset } from '@oriel/domain';
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react';

import { getPhotoImageResource } from '../../lib/raw-engine';
import { useCatalogStore } from '../../store/catalog-store';

const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

export function PhotoImage({
  alt,
  photo,
  ...imageProps
}: { alt: string; photo: PhotoAsset } & Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'src'
>) {
  const updatePhotoMetadata = useCatalogStore((state) => state.updatePhotoMetadata);
  const imageRef = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(photo.mediaKind === 'bitmap');
  const [source, setSource] = useState(photo.mediaKind === 'bitmap' ? photo.url : null);
  const [status, setStatus] = useState<'waiting' | 'loading' | 'ready' | 'error'>(
    photo.mediaKind === 'bitmap' ? 'ready' : 'waiting',
  );

  useEffect(() => {
    if (visible || photo.mediaKind === 'bitmap') return;
    const image = imageRef.current;
    if (!image) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: '240px' },
    );
    observer.observe(image);
    return () => observer.disconnect();
  }, [photo.mediaKind, visible]);

  useEffect(() => {
    if (photo.mediaKind === 'bitmap') {
      setSource(photo.url);
      setStatus('ready');
      return;
    }
    if (!visible) return;
    let canceled = false;
    setStatus('loading');
    void getPhotoImageResource(
      { id: photo.id, mediaKind: photo.mediaKind, url: photo.url },
      'thumbnail',
    )
      .then((resource) => {
        if (canceled) return;
        setSource(resource.url);
        setStatus('ready');
        updatePhotoMetadata(photo.id, resource.metadata);
      })
      .catch(() => !canceled && setStatus('error'));
    return () => {
      canceled = true;
    };
  }, [photo.id, photo.mediaKind, photo.url, updatePhotoMetadata, visible]);

  return (
    <img
      {...imageProps}
      alt={alt}
      data-media-kind={photo.mediaKind}
      data-raw-status={photo.mediaKind === 'camera-raw' ? status : undefined}
      ref={imageRef}
      src={source ?? TRANSPARENT_PIXEL}
    />
  );
}
