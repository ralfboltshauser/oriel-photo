import {
  createFeedbackIssueUrl,
  type CatalogDocument,
  type OrielDesktopBridge,
} from '@oriel/domain';

const STORAGE_KEY = 'oriel-browser-catalog-v1';

const browserBridge: OrielDesktopBridge = {
  platform: 'web',
  importFolder: () => Promise.resolve(null),
  loadCatalog: () => {
    const value = localStorage.getItem(STORAGE_KEY);
    return Promise.resolve(value ? (JSON.parse(value) as CatalogDocument) : null);
  },
  saveCatalog: (catalog) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
    return Promise.resolve();
  },
  chooseExportDirectory: () =>
    Promise.resolve({ token: 'browser-download', label: 'Downloads' }),
  saveExport: (request) => {
    const copiedBytes = new Uint8Array(request.bytes.byteLength);
    copiedBytes.set(request.bytes);
    const blob = new Blob([copiedBytes.buffer], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = request.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    return Promise.resolve({ canceled: false, path: `Downloads/${request.fileName}` });
  },
  showInFolder: () => Promise.resolve(),
  openFeedbackIssue: (draft) => {
    const anchor = document.createElement('a');
    anchor.href = createFeedbackIssueUrl(draft);
    anchor.rel = 'noopener noreferrer';
    anchor.target = '_blank';
    anchor.click();
    return Promise.resolve();
  },
  getDiagnostics: () =>
    Promise.resolve({
      appVersion: 'browser harness',
      platform: navigator.platform,
      renderer: navigator.userAgent,
    }),
  registerCloseHandler: () => () => undefined,
};

const nativeBridgeError = new Error(
  'The native desktop bridge did not load. Oriel stopped before granting file access.',
);
const rejectNativeBridge = <T>(): Promise<T> => Promise.reject(nativeBridgeError);
const unavailableBridge: OrielDesktopBridge = {
  platform: 'web',
  importFolder: rejectNativeBridge,
  loadCatalog: rejectNativeBridge,
  saveCatalog: rejectNativeBridge,
  chooseExportDirectory: rejectNativeBridge,
  saveExport: rejectNativeBridge,
  showInFolder: rejectNativeBridge,
  openFeedbackIssue: rejectNativeBridge,
  getDiagnostics: rejectNativeBridge,
  registerCloseHandler: () => () => undefined,
};

export const desktopBridge: OrielDesktopBridge =
  window.oriel ?? (import.meta.env.DEV ? browserBridge : unavailableBridge);
