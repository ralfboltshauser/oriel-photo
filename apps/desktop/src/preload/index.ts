import { contextBridge, ipcRenderer } from 'electron';

import type {
  CatalogDocument,
  ExportDestination,
  ExportRequest,
  ExportResult,
  ImportScanResult,
  OrielDesktopBridge,
} from '@oriel/domain';

const bridge: OrielDesktopBridge = {
  platform: process.platform as OrielDesktopBridge['platform'],
  importFolder: () =>
    ipcRenderer.invoke('oriel:import:folder') as Promise<ImportScanResult | null>,
  loadCatalog: () =>
    ipcRenderer.invoke('oriel:catalog:load') as Promise<CatalogDocument | null>,
  saveCatalog: (catalog) => ipcRenderer.invoke('oriel:catalog:save', catalog) as Promise<void>,
  chooseExportDirectory: () =>
    ipcRenderer.invoke('oriel:export:choose-directory') as Promise<ExportDestination | null>,
  saveExport: (request: ExportRequest) =>
    ipcRenderer.invoke('oriel:export:save', request) as Promise<ExportResult>,
  showInFolder: (path: string) =>
    ipcRenderer.invoke('oriel:platform:show-item', path) as Promise<void>,
  getDiagnostics: () =>
    ipcRenderer.invoke('oriel:diagnostics:get') as Promise<Record<string, string>>,
  registerCloseHandler: (handler) => {
    const listener = () => {
      void handler().finally(() => ipcRenderer.send('oriel:app:close-ready'));
    };
    ipcRenderer.on('oriel:app:before-close', listener);
    return () => ipcRenderer.removeListener('oriel:app:before-close', listener);
  },
};

contextBridge.exposeInMainWorld('oriel', bridge);
