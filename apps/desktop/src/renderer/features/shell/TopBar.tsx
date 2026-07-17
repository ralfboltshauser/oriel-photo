import { filterPhotos } from '@oriel/domain';
import { Button, IconButton, SegmentedControl, Tooltip } from '@oriel/ui';
import { Command, Grid2X2, PanelLeftClose, Search, Send, Square } from 'lucide-react';

import { useCatalogStore } from '../../store/catalog-store';

export function TopBar() {
  const catalog = useCatalogStore((state) => state.catalog);
  const setViewMode = useCatalogStore((state) => state.setViewMode);
  const setCommandOpen = useCatalogStore((state) => state.setCommandOpen);
  const setExportOpen = useCatalogStore((state) => state.setExportOpen);
  const togglePanels = useCatalogStore((state) => state.togglePanels);
  const visible = filterPhotos(catalog.photos, catalog.filter, catalog.minimumRating);

  return (
    <header className="topbar" data-feedback="topbar">
      <div className="topbar-title">
        <strong>
          {catalog.workspace === 'select'
            ? 'Selects'
            : catalog.workspace === 'edit'
              ? 'Edit'
              : catalog.workspace === 'deliver'
                ? 'Deliver'
                : 'Library'}
        </strong>
        <span>
          {visible.length} {visible.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>

      <div className="topbar-center" data-feedback="topbar.view-mode">
        {catalog.workspace !== 'deliver' ? (
          <SegmentedControl
            ariaLabel="View mode"
            onChange={setViewMode}
            options={[
              { value: 'grid', label: 'Grid', icon: <Grid2X2 size={13} /> },
              { value: 'photo', label: 'Photo', icon: <Square size={13} /> },
            ]}
            value={catalog.viewMode}
          />
        ) : null}
      </div>

      <div className="topbar-actions">
        {catalog.selectedPhotoIds.length > 1 ? (
          <span className="selection-count">{catalog.selectedPhotoIds.length} selected</span>
        ) : null}
        <Tooltip content="Hide panels · Tab">
          <IconButton
            data-feedback="topbar.hide-panels"
            label="Hide panels"
            onClick={togglePanels}
          >
            <PanelLeftClose size={15} />
          </IconButton>
        </Tooltip>
        <button
          className="command-trigger"
          data-feedback="topbar.command-menu"
          onClick={() => setCommandOpen(true)}
          type="button"
        >
          <Search size={13} />
          <span>Find anything</span>
          <kbd>
            <Command size={10} />K
          </kbd>
        </button>
        <Button
          data-feedback="topbar.export"
          icon={<Send size={14} />}
          onClick={() => setExportOpen(true)}
          variant="primary"
        >
          Export
        </Button>
      </div>
    </header>
  );
}
