import { Button, Kbd } from '@oriel/ui';
import { Check, RotateCcw, Star, X } from 'lucide-react';

import { useCatalogStore } from '../../store/catalog-store';

export function CullingBar() {
  const catalog = useCatalogStore((state) => state.catalog);
  const flagSelected = useCatalogStore((state) => state.flagSelected);
  const rateSelected = useCatalogStore((state) => state.rateSelected);
  const selected = catalog.photos.find((photo) => photo.id === catalog.selectedPhotoIds.at(-1));
  if (!selected) return null;

  return (
    <div className="culling-bar" data-feedback="select.culling-bar">
      <div className="culling-actions">
        <Button
          data-active={selected.flag === 'pick'}
          data-feedback="select.pick"
          icon={<Check size={14} />}
          onClick={() => flagSelected('pick')}
          variant="ghost"
        >
          <Kbd>P</Kbd> Pick
        </Button>
        <Button
          data-active={selected.flag === 'reject'}
          data-feedback="select.reject"
          icon={<X size={14} />}
          onClick={() => flagSelected('reject')}
          variant="ghost"
        >
          <Kbd>X</Kbd> Reject
        </Button>
        <Button
          data-feedback="select.unflag"
          icon={<RotateCcw size={13} />}
          onClick={() => flagSelected('unflagged')}
          variant="ghost"
        >
          <Kbd>U</Kbd>
        </Button>
      </div>
      <div aria-label="Rating" className="rating-control" data-feedback="select.rating">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            aria-label={`${rating} stars`}
            data-filled={selected.rating >= rating}
            key={rating}
            onClick={() => rateSelected(rating as 1 | 2 | 3 | 4 | 5)}
            type="button"
          >
            <Star fill={selected.rating >= rating ? 'currentColor' : 'none'} size={14} />
          </button>
        ))}
      </div>
      <div className="photo-position">
        {catalog.photos.findIndex((photo) => photo.id === selected.id) + 1} <span>/</span>{' '}
        {catalog.photos.length}
      </div>
    </div>
  );
}
