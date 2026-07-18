import * as Dialog from '@radix-ui/react-dialog';
import { getActiveVersion, type ExportDestination } from '@oriel/domain';
import { Button, SegmentedControl } from '@oriel/ui';
import { Check, FolderOpen, Image, LoaderCircle, Send, ShieldCheck, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { desktopBridge } from '../../lib/bridge';
import { renderPhotoToJpeg } from '../../lib/image-engine';
import { getPhotoImageResource } from '../../lib/raw-engine';
import { useCatalogStore } from '../../store/catalog-store';

type ExportState = 'configure' | 'exporting' | 'complete' | 'error';
type TargetMode = 'selected' | 'picks';
type Recipe = 'full' | 'web';

function outputName(fileName: string, versionName: string, hasVersions: boolean): string {
  const base = fileName.replace(/\.[^.]+$/, '');
  const suffix = hasVersions ? `-${versionName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';
  return `${base}${suffix}.jpg`;
}

export function ExportDialog() {
  const open = useCatalogStore((state) => state.exportOpen);
  const setOpen = useCatalogStore((state) => state.setExportOpen);
  const catalog = useCatalogStore((state) => state.catalog);
  const picks = useMemo(
    () => catalog.photos.filter((photo) => photo.flag === 'pick'),
    [catalog.photos],
  );
  const selected = useMemo(
    () => catalog.photos.filter((photo) => catalog.selectedPhotoIds.includes(photo.id)),
    [catalog.photos, catalog.selectedPhotoIds],
  );
  const [targetMode, setTargetMode] = useState<TargetMode>(
    picks.length > 0 ? 'picks' : 'selected',
  );
  const [recipe, setRecipe] = useState<Recipe>('web');
  const [destination, setDestination] = useState<ExportDestination | null>(null);
  const [exportState, setExportState] = useState<ExportState>('configure');
  const [progress, setProgress] = useState(0);
  const [lastPath, setLastPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canceledRef = useRef(false);
  const targets = targetMode === 'picks' ? picks : selected;

  useEffect(() => {
    if (open) {
      setTargetMode(picks.length > 0 ? 'picks' : 'selected');
      setExportState('configure');
      setProgress(0);
      setError(null);
      canceledRef.current = false;
    }
  }, [open, picks.length]);

  const chooseDirectory = async () => {
    const value = await desktopBridge.chooseExportDirectory();
    if (value) setDestination(value);
  };

  const beginExport = async () => {
    if (!destination || targets.length === 0) return;
    canceledRef.current = false;
    setError(null);
    setExportState('exporting');
    setProgress(0);
    try {
      for (let index = 0; index < targets.length; index += 1) {
        if (canceledRef.current) {
          setExportState('configure');
          return;
        }
        const photo = targets[index]!;
        const version = getActiveVersion(photo);
        const source = await getPhotoImageResource(
          photo,
          recipe === 'web' ? 'preview' : 'export',
        );
        let bytes: Uint8Array;
        try {
          bytes = await renderPhotoToJpeg(
            source.url,
            version.adjustments,
            recipe === 'web' ? 2048 : null,
            recipe === 'web' ? 0.86 : 0.94,
          );
        } finally {
          source.release();
        }
        const result = await desktopBridge.saveExport({
          photoId: photo.id,
          versionId: version.id,
          destinationToken: destination.token,
          fileName: outputName(photo.fileName, version.name, photo.versions.length > 1),
          bytes,
        });
        if (!result.canceled && result.path) setLastPath(result.path);
        setProgress(index + 1);
      }
      setExportState('complete');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export failed');
      setExportState('error');
    }
  };

  return (
    <Dialog.Root
      onOpenChange={(next) => {
        if (exportState !== 'exporting') setOpen(next);
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          aria-describedby="export-description"
          className="dialog-content export-dialog"
          data-feedback="export.dialog"
        >
          <div className="dialog-heading">
            <div className="dialog-icon">
              <Send size={17} />
            </div>
            <div>
              <Dialog.Title>
                {exportState === 'complete' ? 'Delivery ready' : 'Export photographs'}
              </Dialog.Title>
              <Dialog.Description id="export-description">
                {exportState === 'complete'
                  ? `${progress} JPEG${progress === 1 ? '' : 's'} written successfully.`
                  : 'Rendered copies only. Originals remain untouched.'}
              </Dialog.Description>
            </div>
            {exportState !== 'exporting' ? (
              <Dialog.Close asChild>
                <button aria-label="Close export" className="dialog-close" type="button">
                  <X size={15} />
                </button>
              </Dialog.Close>
            ) : null}
          </div>

          {exportState === 'configure' || exportState === 'error' ? (
            <div className="export-config">
              <p className="export-label">Photographs</p>
              <SegmentedControl
                ariaLabel="Photos to export"
                onChange={setTargetMode}
                options={[
                  { value: 'selected', label: `Selected · ${selected.length}` },
                  { value: 'picks', label: `Picks · ${picks.length}` },
                ]}
                value={targetMode}
              />

              <p className="export-label">Recipe</p>
              <div className="recipe-options">
                <button
                  data-active={recipe === 'web'}
                  onClick={() => setRecipe('web')}
                  type="button"
                >
                  <Image size={17} />
                  <span>
                    <strong>Web JPEG</strong>
                    <small>2048 px · sRGB · 86%</small>
                  </span>
                  <i />
                </button>
                <button
                  data-active={recipe === 'full'}
                  onClick={() => setRecipe('full')}
                  type="button"
                >
                  <Image size={17} />
                  <span>
                    <strong>Full-size JPEG</strong>
                    <small>Original dimensions · sRGB · 94%</small>
                  </span>
                  <i />
                </button>
              </div>

              <p className="export-label">Destination</p>
              <button
                className="destination-picker"
                onClick={() => void chooseDirectory()}
                type="button"
              >
                <FolderOpen size={15} />
                <span>{destination?.label ?? 'Choose a folder'}</span>
                <small>Choose</small>
              </button>
              {error ? <p className="export-error">{error}</p> : null}

              <div className="export-trust">
                <ShieldCheck size={15} />
                <span>
                  {targets.length} file{targets.length === 1 ? '' : 's'} →{' '}
                  {destination?.label ?? 'No destination yet'}
                  <small>Existing names are kept with a numbered copy.</small>
                </span>
              </div>
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <Button variant="ghost">Cancel</Button>
                </Dialog.Close>
                <Button
                  disabled={!destination || targets.length === 0}
                  onClick={() => void beginExport()}
                  variant="primary"
                >
                  Export {targets.length || ''}
                </Button>
              </div>
            </div>
          ) : null}

          {exportState === 'exporting' ? (
            <div aria-live="polite" className="export-progress">
              <div className="progress-orb">
                <LoaderCircle size={22} />
              </div>
              <strong>
                Rendering {progress + 1} of {targets.length}
              </strong>
              <span>{targets[Math.min(progress, targets.length - 1)]?.fileName}</span>
              <div className="progress-track">
                <i
                  style={{
                    transform: `scaleX(${targets.length ? progress / targets.length : 0})`,
                  }}
                />
              </div>
              <Button
                onClick={() => {
                  canceledRef.current = true;
                }}
                variant="ghost"
              >
                Cancel after this file
              </Button>
            </div>
          ) : null}

          {exportState === 'complete' ? (
            <div className="export-complete">
              <div className="complete-mark">
                <Check size={24} />
              </div>
              <strong>
                {progress} finished photograph{progress === 1 ? '' : 's'}
              </strong>
              <span>{destination?.label}</span>
              <div className="complete-summary">
                <span>Recipe</span>
                <strong>{recipe === 'web' ? 'Web JPEG · 2048 px' : 'Full-size JPEG'}</strong>
                <span>Originals</span>
                <strong>Untouched</strong>
              </div>
              <div className="dialog-actions">
                <Dialog.Close asChild>
                  <Button variant="secondary">Done</Button>
                </Dialog.Close>
                <Button
                  disabled={!lastPath}
                  onClick={() => lastPath && void desktopBridge.showInFolder(lastPath)}
                  variant="primary"
                >
                  Show in folder
                </Button>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
