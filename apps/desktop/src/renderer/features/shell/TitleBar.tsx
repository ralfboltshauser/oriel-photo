import { BrandMark, Kbd } from '@oriel/ui';
import { Check, CircleAlert, LoaderCircle } from 'lucide-react';

import { useCatalogStore } from '../../store/catalog-store';

export function TitleBar() {
  const saveStatus = useCatalogStore((state) => state.saveStatus);
  const sources = useCatalogStore((state) => state.catalog.sources);
  const sourceName = sources[0]?.name ?? 'No source';

  return (
    <header className="window-titlebar" data-feedback="app.titlebar">
      <div className="titlebar-brand">
        <BrandMark size={24} />
        <span>Oriel</span>
        <small>Preview</small>
      </div>
      <div className="titlebar-context">{sourceName}</div>
      <div className="titlebar-status" data-status={saveStatus}>
        {saveStatus === 'saving' ? (
          <LoaderCircle size={12} />
        ) : saveStatus === 'error' ? (
          <CircleAlert size={12} />
        ) : (
          <Check size={12} />
        )}
        <span>
          {saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'error'
              ? 'Not saved'
              : 'Saved locally'}
        </span>
        <Kbd>⌘K</Kbd>
      </div>
    </header>
  );
}
