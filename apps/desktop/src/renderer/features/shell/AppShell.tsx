import { getActiveVersion } from '@oriel/domain';

import { DevelopInspector } from '../develop/DevelopInspector';
import { DeliveryWorkspace } from '../delivery/DeliveryWorkspace';
import { LibraryGrid } from '../library/LibraryGrid';
import { PhotoWorkspace } from '../library/PhotoWorkspace';
import { useCatalogStore } from '../../store/catalog-store';
import { Sidebar } from './Sidebar';
import { StageRail } from './StageRail';
import { TitleBar } from './TitleBar';
import { TopBar } from './TopBar';

export function AppShell() {
  const catalog = useCatalogStore((state) => state.catalog);
  const selected = catalog.photos.find((photo) => photo.id === catalog.selectedPhotoIds.at(-1));
  const showInspector = catalog.workspace === 'edit' && selected && !catalog.panelsHidden;

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-body" data-panels-hidden={catalog.panelsHidden}>
        <StageRail />
        {!catalog.panelsHidden ? <Sidebar /> : null}
        <main className="work-area">
          <h1 className="sr-only">
            {catalog.workspace === 'select'
              ? 'Selects'
              : catalog.workspace === 'edit'
                ? 'Edit'
                : catalog.workspace === 'deliver'
                  ? 'Deliver'
                  : 'Library'}
          </h1>
          <TopBar />
          <div className="workspace-frame">
            {catalog.workspace === 'deliver' ? (
              <DeliveryWorkspace />
            ) : catalog.viewMode === 'grid' ? (
              <LibraryGrid />
            ) : (
              <PhotoWorkspace />
            )}
          </div>
        </main>
        {showInspector ? (
          <DevelopInspector photo={selected} version={getActiveVersion(selected)} />
        ) : null}
      </div>
    </div>
  );
}
