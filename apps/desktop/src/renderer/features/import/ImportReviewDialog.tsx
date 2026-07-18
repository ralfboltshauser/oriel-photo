import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@oriel/ui';
import { AlertTriangle, CheckCircle2, FileWarning, FolderOpen, X } from 'lucide-react';

import { useCatalogStore } from '../../store/catalog-store';

export function ImportReviewDialog() {
  const scan = useCatalogStore((state) => state.importScan);
  const cancelImport = useCatalogStore((state) => state.cancelImport);
  const confirmImport = useCatalogStore((state) => state.confirmImport);
  const rawCount = scan?.ready.filter((file) => file.mediaKind === 'camera-raw').length ?? 0;

  return (
    <Dialog.Root open={scan !== null} onOpenChange={(open) => !open && cancelImport()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        {scan ? (
          <Dialog.Content
            aria-describedby="import-description"
            className="dialog-content import-dialog"
            data-feedback="import.dialog"
          >
            <div className="dialog-heading">
              <div className="dialog-icon">
                <FolderOpen size={17} />
              </div>
              <div>
                <Dialog.Title>Review “{scan.source.name}”</Dialog.Title>
                <Dialog.Description id="import-description">
                  Referenced in place. No files will be moved or changed.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button aria-label="Close import review" className="dialog-close" type="button">
                  <X size={15} />
                </button>
              </Dialog.Close>
            </div>

            <div className="import-summary">
              <div className="import-stat ready">
                <CheckCircle2 size={17} />
                <strong>{scan.ready.length}</strong>
                <span>ready to add</span>
              </div>
              <div className="import-stat skipped">
                <FileWarning size={17} />
                <strong>{scan.skipped.length}</strong>
                <span>not supported</span>
              </div>
            </div>

            {rawCount > 0 ? (
              <div className="raw-import-note">
                <CheckCircle2 size={15} />
                <span>
                  <strong>
                    {rawCount} camera RAW {rawCount === 1 ? 'file' : 'files'}
                  </strong>
                  <small>
                    Processed locally after import; original sensor files stay untouched.
                  </small>
                </span>
              </div>
            ) : null}

            {scan.skipped.length > 0 ? (
              <details className="import-warnings">
                <summary>
                  <AlertTriangle size={14} /> Review unsupported files
                </summary>
                <div>
                  {scan.skipped.map((file) => (
                    <p key={file.id}>
                      <span>{file.fileName}</span>
                      <small>{file.reason}</small>
                    </p>
                  ))}
                </div>
              </details>
            ) : null}

            {scan.warnings.length > 0 ? (
              <details className="import-warnings">
                <summary>
                  <AlertTriangle size={14} /> Review folder warnings
                </summary>
                <div>
                  {scan.warnings.map((warning) => (
                    <p key={warning}>
                      <span>{warning}</span>
                    </p>
                  ))}
                </div>
              </details>
            ) : null}

            <div className="safety-callout">
              <AlertTriangle size={16} />
              <div>
                <strong>This is not a backup.</strong>
                <span>Oriel references this folder where it is.</span>
              </div>
            </div>

            <div className="dialog-actions">
              <Dialog.Close asChild>
                <Button variant="ghost">Cancel</Button>
              </Dialog.Close>
              <Button
                disabled={scan.ready.length === 0}
                onClick={confirmImport}
                variant="primary"
              >
                Add {scan.ready.length} photos
              </Button>
            </div>
          </Dialog.Content>
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
