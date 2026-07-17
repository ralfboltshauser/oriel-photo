import { BrandMark, Button, OrielTooltipProvider } from '@oriel/ui';
import { useEffect } from 'react';
import { Toaster } from 'sonner';

import { CommandPalette } from '../features/commands/CommandPalette';
import { ExportDialog } from '../features/export/ExportDialog';
import { ImportReviewDialog } from '../features/import/ImportReviewDialog';
import { Onboarding } from '../features/onboarding/Onboarding';
import { AppErrorBoundary } from '../features/recovery/AppErrorBoundary';
import { AppShell } from '../features/shell/AppShell';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { desktopBridge } from '../lib/bridge';
import { useCatalogStore } from '../store/catalog-store';

function AppContent() {
  const hydrated = useCatalogStore((state) => state.hydrated);
  const onboardingComplete = useCatalogStore((state) => state.catalog.onboardingComplete);
  const loadError = useCatalogStore((state) => state.loadError);
  const initialize = useCatalogStore((state) => state.initialize);
  const flushCatalog = useCatalogStore((state) => state.flushCatalog);
  useKeyboardShortcuts();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => desktopBridge.registerCloseHandler(flushCatalog), [flushCatalog]);

  if (!hydrated) {
    return (
      <div className="app-loading" role="status">
        <div className="app-loading-mark" />
        <span>Opening your workspace…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <main className="recovery-screen">
        <BrandMark size={34} />
        <p className="eyebrow">Catalog recovery</p>
        <h1>Your catalog needs attention.</h1>
        <p>Oriel refused to replace data it could not validate. Originals were not changed.</p>
        <code>{loadError}</code>
        <Button onClick={() => void initialize()} variant="primary">
          Try opening again
        </Button>
      </main>
    );
  }

  return (
    <div className="oriel-app" data-platform={desktopBridge.platform}>
      {onboardingComplete ? <AppShell /> : <Onboarding />}
      <ImportReviewDialog />
      <CommandPalette />
      <ExportDialog />
      <Toaster
        closeButton
        duration={3800}
        position="bottom-center"
        richColors
        toastOptions={{ className: 'oriel-toast' }}
      />
    </div>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <OrielTooltipProvider>
        <AppContent />
      </OrielTooltipProvider>
    </AppErrorBoundary>
  );
}
