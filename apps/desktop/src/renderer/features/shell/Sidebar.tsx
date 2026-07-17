import type { FilterMode } from '@oriel/domain';
import { Button } from '@oriel/ui';
import { Check, Circle, Folder, HardDrive, Image, Images, Plus, Star, X } from 'lucide-react';

import { useCatalogStore } from '../../store/catalog-store';

const filters: { value: FilterMode; label: string; icon: typeof Images }[] = [
  { value: 'all', label: 'All photos', icon: Images },
  { value: 'picks', label: 'Picks', icon: Check },
  { value: 'unflagged', label: 'Unreviewed', icon: Circle },
  { value: 'rated', label: 'Rated', icon: Star },
  { value: 'rejects', label: 'Rejected', icon: X },
];

export function Sidebar() {
  const catalog = useCatalogStore((state) => state.catalog);
  const setFilter = useCatalogStore((state) => state.setFilter);
  const scanFolder = useCatalogStore((state) => state.scanFolder);

  const count = (filter: FilterMode) => {
    if (filter === 'picks')
      return catalog.photos.filter((photo) => photo.flag === 'pick').length;
    if (filter === 'rejects')
      return catalog.photos.filter((photo) => photo.flag === 'reject').length;
    if (filter === 'unflagged')
      return catalog.photos.filter((photo) => photo.flag === 'unflagged').length;
    if (filter === 'rated') return catalog.photos.filter((photo) => photo.rating > 0).length;
    return catalog.photos.length;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-scroll">
        <div className="sidebar-section-heading">
          <span>Library</span>
        </div>
        <div className="sidebar-list">
          {filters.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className="sidebar-row"
                data-active={catalog.filter === item.value}
                key={item.value}
                onClick={() => setFilter(item.value)}
                type="button"
              >
                <Icon size={14} />
                <span>{item.label}</span>
                <small>{count(item.value)}</small>
              </button>
            );
          })}
        </div>

        <div className="sidebar-section-heading">
          <span>Sources</span>
          <Folder size={12} />
        </div>
        <div className="source-list">
          {catalog.sources.map((source) => (
            <div className="source-row" key={source.id}>
              <div className="source-icon">
                <Image size={14} />
              </div>
              <div>
                <span>{source.name}</span>
                <small>
                  {source.photoCount} photos ·{' '}
                  {source.kind === 'demo' ? 'Sample' : 'Referenced'}
                </small>
              </div>
            </div>
          ))}
        </div>
        <Button
          className="add-source"
          icon={<Plus size={14} />}
          onClick={() => void scanFolder()}
          variant="ghost"
        >
          Add folder
        </Button>
      </div>

      <div className="sidebar-safety">
        <div className="safety-status">
          <HardDrive size={14} />
          <span>Local workspace</span>
          <i />
        </div>
        <p>Originals are referenced in place.</p>
        <strong>Not a backup</strong>
      </div>
    </aside>
  );
}
