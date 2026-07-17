import { getActiveVersion } from '@oriel/domain';

import { useCatalogStore } from '../../store/catalog-store';
import { CullingBar } from './CullingBar';
import { Filmstrip } from './Filmstrip';
import { PhotoCanvas } from './PhotoCanvas';
import { ShortcutHint } from './ShortcutHint';

export function PhotoWorkspace() {
  const catalog = useCatalogStore((state) => state.catalog);
  const showOriginal = useCatalogStore((state) => state.showOriginal);
  const photo = catalog.photos.find((item) => item.id === catalog.selectedPhotoIds.at(-1));
  if (!photo)
    return (
      <div className="empty-filter">
        <h2>Select a photo</h2>
        <p>Choose a frame from the library to begin.</p>
      </div>
    );
  const version = getActiveVersion(photo);

  return (
    <div className="photo-workspace">
      <div className="photo-stage">
        <PhotoCanvas
          adjustments={version.adjustments}
          fileName={photo.fileName}
          original={showOriginal}
          url={photo.url}
        />
        <ShortcutHint />
      </div>
      <CullingBar />
      <Filmstrip />
    </div>
  );
}
