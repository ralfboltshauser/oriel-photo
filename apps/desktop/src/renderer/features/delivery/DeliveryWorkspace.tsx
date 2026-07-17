import { Button } from '@oriel/ui';
import { AlertTriangle, Check, FileImage, LoaderCircle, Send, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useCatalogStore } from '../../store/catalog-store';

type Availability = 'checking' | 'ready' | 'missing';

function canLoadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

export function DeliveryWorkspace() {
  const catalog = useCatalogStore((state) => state.catalog);
  const saveStatus = useCatalogStore((state) => state.saveStatus);
  const setExportOpen = useCatalogStore((state) => state.setExportOpen);
  const picks = useMemo(
    () => catalog.photos.filter((photo) => photo.flag === 'pick'),
    [catalog.photos],
  );
  const [availability, setAvailability] = useState<Availability>('checking');

  useEffect(() => {
    let canceled = false;
    setAvailability('checking');
    void Promise.all(picks.map((photo) => canLoadImage(photo.url))).then((results) => {
      if (!canceled) setAvailability(results.every(Boolean) ? 'ready' : 'missing');
    });
    return () => {
      canceled = true;
    };
  }, [picks]);

  const readyToExport = picks.length > 0 && availability === 'ready' && saveStatus === 'saved';
  return (
    <div className="delivery-workspace" data-feedback="delivery.workspace">
      <header>
        <p className="eyebrow">Ready when you are</p>
        <h1>Deliver with confidence.</h1>
        <p>
          One final check, then Oriel renders new JPEGs. Your originals stay exactly where they
          are.
        </p>
      </header>
      <div className="delivery-layout">
        <section className="delivery-card hero">
          <div className="delivery-card-heading">
            <div>
              <FileImage size={17} />
            </div>
            <span>
              <strong>{picks.length} picks</strong>
              <small>Current delivery set</small>
            </span>
          </div>
          <div className="delivery-thumbs">
            {picks.slice(0, 6).map((photo) => (
              <img alt="" decoding="async" key={photo.id} loading="lazy" src={photo.url} />
            ))}
            {picks.length === 0 ? (
              <p>
                Mark photographs with <kbd>P</kbd> to build a delivery set.
              </p>
            ) : null}
          </div>
          <Button
            disabled={!readyToExport}
            data-feedback="delivery.export-picks"
            icon={<Send size={14} />}
            onClick={() => setExportOpen(true)}
            variant="primary"
          >
            Export picks
          </Button>
        </section>
        <section aria-live="polite" className="delivery-card checks">
          <h2>Preflight</h2>
          <div
            data-state={
              availability === 'ready'
                ? 'ready'
                : availability === 'missing'
                  ? 'error'
                  : 'pending'
            }
          >
            {availability === 'checking' ? (
              <LoaderCircle size={14} />
            ) : availability === 'ready' ? (
              <Check size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            <span>
              {availability === 'checking'
                ? 'Checking every original…'
                : availability === 'ready'
                  ? 'Every pick has an online original'
                  : 'At least one original is offline'}
            </span>
          </div>
          <div
            data-state={
              saveStatus === 'saved' ? 'ready' : saveStatus === 'error' ? 'error' : 'pending'
            }
          >
            {saveStatus === 'saving' ? (
              <LoaderCircle size={14} />
            ) : saveStatus === 'saved' ? (
              <Check size={14} />
            ) : (
              <AlertTriangle size={14} />
            )}
            <span>
              {saveStatus === 'saved'
                ? 'All edits are saved locally'
                : saveStatus === 'saving'
                  ? 'Saving the latest edits…'
                  : 'The latest edits could not be saved'}
            </span>
          </div>
          <div data-state="ready">
            <Check size={14} />
            <span>Collision-safe file naming</span>
          </div>
          <div className="delivery-safety">
            <ShieldCheck size={17} />
            <span>
              <strong>Originals untouched</strong>
              <small>Export always creates new files.</small>
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
