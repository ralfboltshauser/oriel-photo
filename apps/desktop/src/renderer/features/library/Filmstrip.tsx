import { Check, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { filterPhotos } from '@oriel/domain';

import { useCatalogStore } from '../../store/catalog-store';

export function Filmstrip() {
  const catalog = useCatalogStore((state) => state.catalog);
  const selectPhoto = useCatalogStore((state) => state.selectPhoto);
  const activeId = catalog.selectedPhotoIds.at(-1);
  const stripRef = useRef<HTMLDivElement>(null);
  const photos = useMemo(
    () => filterPhotos(catalog.photos, catalog.filter, catalog.minimumRating),
    [catalog.filter, catalog.minimumRating, catalog.photos],
  );
  const activeIndex = Math.max(
    0,
    photos.findIndex((photo) => photo.id === activeId),
  );
  const firstIndex = Math.max(0, activeIndex - 48);
  const lastIndex = Math.min(photos.length, activeIndex + 49);
  const visiblePhotos = photos.slice(firstIndex, lastIndex);

  useEffect(() => {
    stripRef.current?.querySelector(`[data-photo-id="${activeId}"]`)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeId]);

  return (
    <div
      aria-label="Filmstrip"
      className="filmstrip"
      data-feedback="photo.filmstrip"
      ref={stripRef}
      role="listbox"
    >
      {firstIndex > 0 ? (
        <div
          aria-hidden="true"
          className="filmstrip-spacer"
          style={{ width: firstIndex * 101 }}
        />
      ) : null}
      {visiblePhotos.map((photo) => (
        <button
          aria-label={photo.fileName}
          aria-selected={photo.id === activeId}
          className="filmstrip-item"
          data-feedback="photo.filmstrip-item"
          data-photo-id={photo.id}
          key={photo.id}
          onClick={() => selectPhoto(photo.id)}
          role="option"
          type="button"
        >
          <img alt="" decoding="async" draggable={false} loading="lazy" src={photo.url} />
          {photo.flag === 'pick' ? (
            <span className="mini-pick">
              <Check size={9} />
            </span>
          ) : null}
          {photo.flag === 'reject' ? (
            <span className="mini-reject">
              <X size={9} />
            </span>
          ) : null}
          {photo.rating > 0 ? <small>{photo.rating}</small> : null}
        </button>
      ))}
      {lastIndex < photos.length ? (
        <div
          aria-hidden="true"
          className="filmstrip-spacer"
          style={{ width: (photos.length - lastIndex) * 101 }}
        />
      ) : null}
    </div>
  );
}
