import { app, BrowserWindow, ipcMain, session } from 'electron';
import { join } from 'node:path';

import log from 'electron-log/main';

import { CatalogStore } from './catalog-store';
import { registerIpc } from './ipc';
import { installMediaProtocol, registerMediaScheme } from './media-protocol';

registerMediaScheme();
log.initialize();

// Playwright launches the production bundle against an isolated catalog. This must be set
// before app readiness because Electron locks the userData path once the app has initialized.
if (process.env.ORIEL_E2E_USER_DATA) {
  app.setPath('userData', process.env.ORIEL_E2E_USER_DATA);
}

let mainWindow: BrowserWindow | null = null;

function createMainWindow(catalogStore: CatalogStore): BrowserWindow {
  const window = new BrowserWindow({
    title: 'Oriel',
    width: 1440,
    height: 920,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#0B0D0C',
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0B0D0C',
      symbolColor: '#A8AEA8',
      height: 46,
    },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  let closeAuthorized = false;
  let closeTimeout: ReturnType<typeof setTimeout> | null = null;
  const onCloseReady = (event: Electron.IpcMainEvent) => {
    if (event.sender !== window.webContents) return;
    closeAuthorized = true;
    if (closeTimeout) clearTimeout(closeTimeout);
    void catalogStore.flush().finally(() => window.close());
  };
  ipcMain.on('oriel:app:close-ready', onCloseReady);
  window.on('close', (event) => {
    if (closeAuthorized) return;
    event.preventDefault();
    window.webContents.send('oriel:app:before-close');
    closeTimeout ??= setTimeout(() => {
      closeAuthorized = true;
      void catalogStore.flush().finally(() => window.destroy());
    }, 2500);
  });
  window.on('closed', () => {
    if (closeTimeout) clearTimeout(closeTimeout);
    ipcMain.removeListener('oriel:app:close-ready', onCloseReady);
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    const allowed =
      (process.env.NODE_ENV === 'development' && url.startsWith('http://localhost:')) ||
      url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'));
  }
  return window;
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else
  void app.whenReady().then(() => {
    const catalogStore = new CatalogStore();
    installMediaProtocol(catalogStore);
    registerIpc(catalogStore);
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, _permission, callback) => {
        callback(false);
      },
    );
    mainWindow = createMainWindow(catalogStore);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0)
        mainWindow = createMainWindow(catalogStore);
    });
  });

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

process.on('uncaughtException', (error) => log.error('Uncaught main-process error', error));
process.on('unhandledRejection', (error) =>
  log.error('Unhandled main-process rejection', error),
);
