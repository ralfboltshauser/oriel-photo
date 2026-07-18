import { app, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'node:crypto';
import { access, constants, rename, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

import {
  createFeedbackIssueUrl,
  type CatalogDocument,
  type ExportDestination,
  type ExportRequest,
  type ExportResult,
  type FeedbackIssueDraft,
  type ImportScanResult,
} from '@oriel/domain';
import log from 'electron-log/main';

import type { CatalogStore } from './catalog-store';
import { scanFolder } from './importer';

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  const url = frame?.url ?? '';
  const developmentOrigin = process.env.ELECTRON_RENDERER_URL
    ? new URL(process.env.ELECTRON_RENDERER_URL).origin
    : null;
  const trusted =
    frame === event.sender.mainFrame &&
    ((developmentOrigin !== null && new URL(url).origin === developmentOrigin) ||
      (developmentOrigin === null && url.startsWith('oriel-app://app/')));
  if (!trusted) throw new Error(`Rejected IPC sender: ${url}`);
}

function safeFileName(fileName: string): string {
  let safe = basename(fileName)
    .split('')
    .map((character) =>
      character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character) ? '-' : character,
    )
    .join('')
    .replace(/[ .]+$/g, '')
    .trim();
  if (!safe.toLowerCase().endsWith('.jpg') && !safe.toLowerCase().endsWith('.jpeg')) {
    safe = `${safe || 'Oriel-export'}.jpg`;
  }
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(safe)) safe = `_${safe}`;
  return safe;
}

async function resolveCollision(directory: string, fileName: string): Promise<string> {
  const parsedExtension = extname(fileName);
  const base = basename(fileName, parsedExtension);
  let candidate = join(directory, fileName);
  let counter = 2;
  for (;;) {
    try {
      await access(candidate, constants.F_OK);
      candidate = join(directory, `${base}-${counter}${parsedExtension}`);
      counter += 1;
    } catch {
      return candidate;
    }
  }
}

export function registerIpc(catalogStore: CatalogStore): void {
  const exportDestinations = new Map<string, string>();

  ipcMain.handle('oriel:catalog:load', async (event): Promise<CatalogDocument | null> => {
    assertTrustedSender(event);
    return catalogStore.load();
  });

  ipcMain.handle(
    'oriel:catalog:save',
    async (event, catalog: CatalogDocument): Promise<void> => {
      assertTrustedSender(event);
      await catalogStore.save(catalog);
    },
  );

  ipcMain.handle('oriel:import:folder', async (event): Promise<ImportScanResult | null> => {
    assertTrustedSender(event);
    let path: string | undefined;
    if (process.env.ORIEL_E2E_USER_DATA && process.env.ORIEL_E2E_IMPORT_PATH) {
      path = process.env.ORIEL_E2E_IMPORT_PATH;
    } else {
      const result = await dialog.showOpenDialog({
        title: 'Choose a photo folder',
        buttonLabel: 'Review folder',
        properties: ['openDirectory'],
      });
      path = result.filePaths[0];
      if (result.canceled) return null;
    }
    if (!path) return null;
    const approvedRoot = await catalogStore.addAllowedRoot(path);
    const scan = await scanFolder(approvedRoot);
    return scan;
  });

  ipcMain.handle(
    'oriel:export:choose-directory',
    async (event): Promise<ExportDestination | null> => {
      assertTrustedSender(event);
      let path: string | undefined;
      if (process.env.ORIEL_E2E_USER_DATA && process.env.ORIEL_E2E_EXPORT_PATH) {
        path = process.env.ORIEL_E2E_EXPORT_PATH;
      } else {
        const result = await dialog.showOpenDialog({
          title: 'Choose export destination',
          buttonLabel: 'Use this folder',
          properties: ['openDirectory', 'createDirectory'],
        });
        path = result.filePaths[0];
        if (result.canceled) return null;
      }
      if (!path) return null;
      const token = randomUUID();
      exportDestinations.set(token, path);
      return { token, label: path };
    },
  );

  ipcMain.handle(
    'oriel:export:save',
    async (event, request: ExportRequest): Promise<ExportResult> => {
      assertTrustedSender(event);
      if (!(request.bytes instanceof Uint8Array) || request.bytes.byteLength > 250_000_000) {
        throw new Error('Export payload is invalid');
      }
      const directory = exportDestinations.get(request.destinationToken);
      if (!directory) throw new Error('Export destination is no longer authorized');
      const details = await stat(directory);
      if (!details.isDirectory()) throw new Error('Export destination is not a folder');
      const outputPath = await resolveCollision(directory, safeFileName(request.fileName));
      const temporaryPath = `${outputPath}.oriel-partial-${randomUUID()}`;
      try {
        await writeFile(temporaryPath, request.bytes, { flag: 'wx' });
        await rename(temporaryPath, outputPath);
      } finally {
        await rm(temporaryPath, { force: true });
      }
      log.info('Exported photo', { outputPath, photoId: request.photoId });
      return { canceled: false, path: outputPath };
    },
  );

  ipcMain.handle('oriel:platform:show-item', (event, path: string): void => {
    assertTrustedSender(event);
    shell.showItemInFolder(path);
  });

  ipcMain.handle(
    'oriel:feedback:open-issue',
    async (event, draft: FeedbackIssueDraft): Promise<void> => {
      assertTrustedSender(event);
      const url = createFeedbackIssueUrl(draft);
      if (process.env.ORIEL_E2E_USER_DATA && process.env.ORIEL_E2E_FEEDBACK_CAPTURE_PATH) {
        await writeFile(process.env.ORIEL_E2E_FEEDBACK_CAPTURE_PATH, url, 'utf8');
        return;
      }
      await shell.openExternal(url);
    },
  );

  ipcMain.handle('oriel:diagnostics:get', (event): Record<string, string> => {
    assertTrustedSender(event);
    return {
      appVersion: app.getVersion(),
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      platform: `${process.platform} ${process.arch}`,
      gpu: app.getGPUFeatureStatus().gpu_compositing,
      rawDecoder: 'LibRaw 0.22.1 · WebAssembly',
    };
  });
}
