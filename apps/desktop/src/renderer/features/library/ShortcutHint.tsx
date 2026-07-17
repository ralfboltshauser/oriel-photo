import { Kbd } from '@oriel/ui';
import { X } from 'lucide-react';

import { useCatalogStore } from '../../store/catalog-store';

export function ShortcutHint() {
  const dismissed = useCatalogStore((state) => state.catalog.shortcutHintDismissed);
  const dismiss = useCatalogStore((state) => state.dismissShortcutHint);
  if (dismissed) return null;
  return (
    <div className="shortcut-hint">
      <span>Move fast</span>
      <div>
        <Kbd>←</Kbd>
        <Kbd>→</Kbd> Navigate
      </div>
      <div>
        <Kbd>P</Kbd> Pick
      </div>
      <div>
        <Kbd>X</Kbd> Reject
      </div>
      <div>
        <Kbd>1–5</Kbd> Rate
      </div>
      <button aria-label="Dismiss shortcut hint" onClick={dismiss} type="button">
        <X size={12} />
      </button>
    </div>
  );
}
