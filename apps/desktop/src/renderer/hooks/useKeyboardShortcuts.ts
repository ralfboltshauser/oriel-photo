import { useEffect } from 'react';
import { toast } from 'sonner';

import { useCatalogStore } from '../store/catalog-store';

function isTextEditing(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.isContentEditable ||
    element?.tagName === 'INPUT' ||
    element?.tagName === 'TEXTAREA' ||
    element?.tagName === 'SELECT',
  );
}

function isInteractiveControl(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.closest(
      'button, a, [role="button"], [role="slider"], [role="option"], [role="menuitem"]',
    ),
  );
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const state = useCatalogStore.getState();
      const mod = event.metaKey || event.ctrlKey;
      const modalOpen = state.commandOpen || state.exportOpen || state.importScan !== null;

      if (
        mod &&
        event.key.toLowerCase() === 'k' &&
        !state.exportOpen &&
        state.importScan === null
      ) {
        event.preventDefault();
        state.setCommandOpen(!state.commandOpen);
        return;
      }
      if (isTextEditing(event.target) || modalOpen) return;

      if (mod && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        state.setExportOpen(true);
      } else if (mod && event.shiftKey && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        void state.scanFolder();
      } else if (mod && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        state.copyEdits();
        toast('Edits copied');
      } else if (mod && event.shiftKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        state.pasteEdits();
        toast.success('Edits applied');
      } else if (mod && event.key === "'") {
        event.preventDefault();
        state.createVersion();
        toast.success('New version created');
      } else if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
      } else if (isInteractiveControl(event.target)) {
        return;
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        state.advance(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        state.advance(-1);
      } else if (event.key.toLowerCase() === 'p') {
        event.preventDefault();
        state.flagSelected('pick', event.shiftKey);
      } else if (event.key.toLowerCase() === 'x') {
        event.preventDefault();
        state.flagSelected('reject', event.shiftKey);
      } else if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        state.flagSelected('unflagged', event.shiftKey);
      } else if (/^[0-5]$/.test(event.key)) {
        event.preventDefault();
        state.rateSelected(Number(event.key) as 0 | 1 | 2 | 3 | 4 | 5, event.shiftKey);
      } else if (event.key.toLowerCase() === 'g') {
        event.preventDefault();
        state.setWorkspace('library');
      } else if (event.key.toLowerCase() === 'e' || event.key === 'Enter') {
        event.preventDefault();
        state.setWorkspace('select');
      } else if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        state.setWorkspace('edit');
      } else if (event.key === '\\') {
        event.preventDefault();
        state.toggleOriginal();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        state.togglePanels();
      } else if (event.key === 'Escape' && state.showOriginal) {
        state.toggleOriginal(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
