import { filterPhotos, getActiveVersion, isAdjusted, type PhotoAsset } from '@oriel/domain';
import { Check, CircleSlash2, Star, X } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';

import { useCatalogStore } from '../../store/catalog-store';

const COLUMN_GAP = 12;
const ROW_GAP = 18;
const OVERSCAN_ROWS = 3;

function Rating({ photo }: { photo: PhotoAsset }) {
  if (photo.rating === 0) return null;
  return (
    <span aria-label={`${photo.rating} stars`} className="thumb-rating">
      <Star fill="currentColor" size={10} /> {photo.rating}
    </span>
  );
}

export function LibraryGrid() {
  const catalog = useCatalogStore((state) => state.catalog);
  const selectPhoto = useCatalogStore((state) => state.selectPhoto);
  const setViewMode = useCatalogStore((state) => state.setViewMode);
  const photos = useMemo(
    () => filterPhotos(catalog.photos, catalog.filter, catalog.minimumRating),
    [catalog.filter, catalog.minimumRating, catalog.photos],
  );
  const selected = useMemo(() => new Set(catalog.selectedPhotoIds), [catalog.selectedPhotoIds]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ height: 600, scrollTop: 0, width: 900 });

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setViewport({
          height: grid.clientHeight,
          scrollTop: grid.scrollTop,
          width: grid.clientWidth,
        });
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    grid.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      grid.removeEventListener('scroll', measure);
    };
  }, []);

  const contentWidth = Math.max(1, viewport.width - 32);
  const minimumWidth = window.innerWidth <= 1180 ? 170 : 190;
  const columns = Math.max(
    1,
    Math.floor((contentWidth + COLUMN_GAP) / (minimumWidth + COLUMN_GAP)),
  );
  const cellWidth = (contentWidth - COLUMN_GAP * (columns - 1)) / columns;
  const rowHeight = cellWidth * (2 / 3) + 44 + ROW_GAP;
  const rowCount = Math.ceil(photos.length / columns);
  const firstRow = Math.max(0, Math.floor(viewport.scrollTop / rowHeight) - OVERSCAN_ROWS);
  const lastRow = Math.min(
    rowCount,
    Math.ceil((viewport.scrollTop + viewport.height) / rowHeight) + OVERSCAN_ROWS,
  );
  const visibleRows = Array.from(
    { length: Math.max(0, lastRow - firstRow) },
    (_, index) => firstRow + index,
  );
  const activeId = catalog.selectedPhotoIds.at(-1);

  useEffect(() => {
    const grid = gridRef.current;
    const activeIndex = photos.findIndex((photo) => photo.id === activeId);
    if (!grid || activeIndex < 0) return;
    const row = Math.floor(activeIndex / columns);
    const top = row * rowHeight;
    const bottom = top + rowHeight;
    if (top < grid.scrollTop) grid.scrollTop = top;
    else if (bottom > grid.scrollTop + grid.clientHeight)
      grid.scrollTop = bottom - grid.clientHeight;
  }, [activeId, columns, photos, rowHeight]);

  const select = (event: MouseEvent, id: string) => {
    selectPhoto(id, { additive: event.metaKey || event.ctrlKey, range: event.shiftKey });
  };

  const selectFromKeyboard = (event: KeyboardEvent, id: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    selectPhoto(id, {
      additive: event.metaKey || event.ctrlKey,
      range: event.shiftKey,
    });
    if (event.key === 'Enter') setViewMode('photo');
  };

  if (photos.length === 0) {
    return (
      <div className="empty-filter">
        <div>
          <CircleSlash2 size={22} />
        </div>
        <h2>No photos here</h2>
        <p>Change the filter or review another source.</p>
      </div>
    );
  }

  return (
    <div
      aria-colcount={columns}
      aria-label="Photo grid"
      aria-rowcount={rowCount}
      className="library-grid"
      ref={gridRef}
      role="grid"
    >
      <div
        className="virtual-grid-canvas"
        style={{ height: Math.max(1, rowCount * rowHeight - ROW_GAP) }}
      >
        {visibleRows.map((row) => (
          <div
            aria-rowindex={row + 1}
            className="virtual-grid-row"
            key={row}
            role="row"
            style={{ height: rowHeight - ROW_GAP, top: row * rowHeight }}
          >
            {photos.slice(row * columns, row * columns + columns).map((photo, column) => (
              <div
                aria-colindex={column + 1}
                aria-label={`${photo.fileName}${photo.flag === 'pick' ? ', picked' : photo.flag === 'reject' ? ', rejected' : ''}`}
                aria-selected={selected.has(photo.id)}
                className="photo-tile"
                data-flag={photo.flag}
                data-selected={selected.has(photo.id)}
                data-testid={`photo-${photo.id}`}
                key={photo.id}
                onClick={(event) => select(event, photo.id)}
                onDoubleClick={() => setViewMode('photo')}
                onKeyDown={(event) => selectFromKeyboard(event, photo.id)}
                role="gridcell"
                style={{ left: column * (cellWidth + COLUMN_GAP), width: cellWidth }}
                tabIndex={selected.has(photo.id) ? 0 : -1}
              >
                <div className="photo-thumbnail">
                  <img
                    alt=""
                    decoding="async"
                    draggable={false}
                    loading="lazy"
                    src={photo.url}
                  />
                  <div className="photo-state">
                    {photo.flag === 'pick' ? (
                      <span className="flag-pick">
                        <Check size={12} />
                      </span>
                    ) : null}
                    {photo.flag === 'reject' ? (
                      <span className="flag-reject">
                        <X size={12} />
                      </span>
                    ) : null}
                  </div>
                  {isAdjusted(getActiveVersion(photo).adjustments) ? (
                    <span aria-label="Adjusted" className="adjusted-dot" />
                  ) : null}
                  <Rating photo={photo} />
                </div>
                <footer>
                  <span>{photo.fileName}</span>
                  <small>
                    {photo.versions.length > 1
                      ? `${photo.versions.length} versions`
                      : photo.camera}
                  </small>
                </footer>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
