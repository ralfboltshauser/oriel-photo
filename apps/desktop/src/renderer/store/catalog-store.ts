import {
  cloneAdjustments,
  createEmptyCatalog,
  DEFAULT_ADJUSTMENTS,
  filterPhotos,
  getActiveVersion,
  mergeImportedSource,
  type CatalogDocument,
  type FilterMode,
  type ImportScanResult,
  type PhotoAdjustments,
  type PhotoAsset,
  type PhotoFlag,
  type Workspace,
} from '@oriel/domain';
import { create } from 'zustand';

import { desktopBridge } from '../lib/bridge';
import { buildDemoLibrary, refreshDemoUrls } from '../lib/demo-library';

interface CatalogStoreState {
  catalog: CatalogDocument;
  hydrated: boolean;
  loadError: string | null;
  saveStatus: 'saved' | 'saving' | 'error';
  importScan: ImportScanResult | null;
  showOriginal: boolean;
  commandOpen: boolean;
  exportOpen: boolean;
  copiedAdjustments: PhotoAdjustments | null;
  history: CatalogDocument[];
  future: CatalogDocument[];
  continuousStart: CatalogDocument | null;
  initialize: () => Promise<void>;
  flushCatalog: () => Promise<void>;
  startDemo: () => void;
  scanFolder: () => Promise<void>;
  cancelImport: () => void;
  confirmImport: () => void;
  setWorkspace: (workspace: Workspace) => void;
  setViewMode: (viewMode: 'grid' | 'photo') => void;
  setFilter: (filter: FilterMode) => void;
  setMinimumRating: (rating: 1 | 2 | 3 | 4 | 5) => void;
  selectPhoto: (id: string, options?: { additive?: boolean; range?: boolean }) => void;
  flagSelected: (flag: PhotoFlag, advance?: boolean) => void;
  rateSelected: (rating: 0 | 1 | 2 | 3 | 4 | 5, advance?: boolean) => void;
  advance: (direction: -1 | 1) => void;
  updateAdjustment: <K extends keyof PhotoAdjustments>(
    key: K,
    value: PhotoAdjustments[K],
  ) => void;
  commitContinuousEdit: () => void;
  resetAdjustments: (keys?: (keyof PhotoAdjustments)[]) => void;
  copyEdits: () => void;
  pasteEdits: () => void;
  createVersion: () => void;
  selectVersion: (versionId: string) => void;
  renameVersion: (versionId: string, name: string) => void;
  toggleOriginal: (show?: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  dismissShortcutHint: () => void;
  togglePanels: () => void;
  undo: () => void;
  redo: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveGeneration = 0;

function catalogSnapshot(catalog: CatalogDocument): CatalogDocument {
  // Every catalog update in this store is immutable. Keeping the previous root preserves undo
  // state while structurally sharing unchanged photo records, instead of cloning a whole shoot.
  return catalog;
}

function refreshLoadedCatalog(catalog: CatalogDocument): CatalogDocument {
  return {
    ...catalog,
    photos: refreshDemoUrls(catalog.photos),
    lastOpenedAt: new Date().toISOString(),
  };
}

export const useCatalogStore = create<CatalogStoreState>((set, get) => {
  const scheduleSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    set({ saveStatus: 'saving' });
    const generation = ++saveGeneration;
    saveTimer = setTimeout(() => {
      const catalog = get().catalog;
      void desktopBridge
        .saveCatalog(catalog)
        .then(() => {
          if (generation === saveGeneration) set({ saveStatus: 'saved' });
        })
        .catch(() => {
          if (generation === saveGeneration) set({ saveStatus: 'error' });
        });
    }, 260);
  };

  const applyCatalog = (catalog: CatalogDocument, withHistory = false) => {
    const current = get().catalog;
    set({
      catalog,
      history: withHistory
        ? [...get().history.slice(-39), catalogSnapshot(current)]
        : get().history,
      future: withHistory ? [] : get().future,
    });
    scheduleSave();
  };

  const mutateSelectedPhotos = (
    mutation: (photo: PhotoAsset, catalog: CatalogDocument) => PhotoAsset,
    withHistory = true,
  ) => {
    const state = get();
    const selected = new Set(state.catalog.selectedPhotoIds);
    if (selected.size === 0) return;
    const catalog = {
      ...state.catalog,
      photos: state.catalog.photos.map((photo) =>
        selected.has(photo.id) ? mutation(photo, state.catalog) : photo,
      ),
    };
    applyCatalog(catalog, withHistory);
  };

  return {
    catalog: createEmptyCatalog(),
    hydrated: false,
    loadError: null,
    saveStatus: 'saved',
    importScan: null,
    showOriginal: false,
    commandOpen: false,
    exportOpen: false,
    copiedAdjustments: null,
    history: [],
    future: [],
    continuousStart: null,

    initialize: async () => {
      try {
        const catalog = await desktopBridge.loadCatalog();
        set({
          catalog: catalog ? refreshLoadedCatalog(catalog) : createEmptyCatalog(),
          hydrated: true,
          loadError: null,
        });
      } catch (error) {
        set({
          hydrated: true,
          loadError:
            error instanceof Error ? error.message : 'The local catalog could not be opened.',
          saveStatus: 'error',
        });
      }
    },

    flushCatalog: async () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      const generation = ++saveGeneration;
      set({ saveStatus: 'saving' });
      try {
        await desktopBridge.saveCatalog(get().catalog);
        if (generation === saveGeneration) set({ saveStatus: 'saved' });
      } catch (error) {
        if (generation === saveGeneration) set({ saveStatus: 'error' });
        throw error;
      }
    },

    startDemo: () => {
      const { source, photos } = buildDemoLibrary();
      applyCatalog(
        {
          ...createEmptyCatalog(),
          onboardingComplete: true,
          sources: [source],
          photos,
          selectedPhotoIds: photos[0] ? [photos[0].id] : [],
          anchorPhotoId: photos[0]?.id ?? null,
        },
        false,
      );
    },

    scanFolder: async () => {
      const scan = await desktopBridge.importFolder();
      if (scan) set({ importScan: scan });
    },

    cancelImport: () => set({ importScan: null }),

    confirmImport: () => {
      const scan = get().importScan;
      if (!scan) return;
      applyCatalog(mergeImportedSource(get().catalog, scan.source, scan.ready), true);
      set({ importScan: null });
    },

    setWorkspace: (workspace) => {
      const viewMode =
        workspace === 'library' ? 'grid' : workspace === 'deliver' ? 'grid' : 'photo';
      applyCatalog({ ...get().catalog, workspace, viewMode }, false);
      set({ showOriginal: false });
    },

    setViewMode: (viewMode) => applyCatalog({ ...get().catalog, viewMode }, false),
    setFilter: (filter) => {
      const catalog = get().catalog;
      const visible = filterPhotos(catalog.photos, filter, catalog.minimumRating);
      const visibleIds = new Set(visible.map((photo) => photo.id));
      const retainedSelection = catalog.selectedPhotoIds.filter((id) => visibleIds.has(id));
      const selectedPhotoIds =
        retainedSelection.length > 0 ? retainedSelection : visible[0] ? [visible[0].id] : [];
      applyCatalog(
        {
          ...catalog,
          filter,
          selectedPhotoIds,
          anchorPhotoId: selectedPhotoIds.at(-1) ?? null,
        },
        false,
      );
    },
    setMinimumRating: (minimumRating) => {
      const catalog = get().catalog;
      const visible = filterPhotos(catalog.photos, 'rated', minimumRating);
      const visibleIds = new Set(visible.map((photo) => photo.id));
      const retainedSelection = catalog.selectedPhotoIds.filter((id) => visibleIds.has(id));
      const selectedPhotoIds =
        retainedSelection.length > 0 ? retainedSelection : visible[0] ? [visible[0].id] : [];
      applyCatalog(
        {
          ...catalog,
          minimumRating,
          filter: 'rated',
          selectedPhotoIds,
          anchorPhotoId: selectedPhotoIds.at(-1) ?? null,
        },
        false,
      );
    },

    selectPhoto: (id, options = {}) => {
      const catalog = get().catalog;
      let selectedPhotoIds = [id];
      if (options.additive) {
        selectedPhotoIds = catalog.selectedPhotoIds.includes(id)
          ? catalog.selectedPhotoIds.filter((photoId) => photoId !== id)
          : [...catalog.selectedPhotoIds, id];
      } else if (options.range && catalog.anchorPhotoId) {
        const filtered = filterPhotos(catalog.photos, catalog.filter, catalog.minimumRating);
        const from = filtered.findIndex((photo) => photo.id === catalog.anchorPhotoId);
        const to = filtered.findIndex((photo) => photo.id === id);
        if (from >= 0 && to >= 0) {
          selectedPhotoIds = filtered
            .slice(Math.min(from, to), Math.max(from, to) + 1)
            .map((photo) => photo.id);
        }
      }
      applyCatalog(
        {
          ...catalog,
          selectedPhotoIds,
          anchorPhotoId: options.range ? catalog.anchorPhotoId : id,
        },
        false,
      );
    },

    flagSelected: (flag, shouldAdvance = false) => {
      mutateSelectedPhotos((photo) => ({ ...photo, flag }));
      if (shouldAdvance) get().advance(1);
    },

    rateSelected: (rating, shouldAdvance = false) => {
      mutateSelectedPhotos((photo) => ({ ...photo, rating }));
      if (shouldAdvance) get().advance(1);
    },

    advance: (direction) => {
      const catalog = get().catalog;
      const photos = filterPhotos(catalog.photos, catalog.filter, catalog.minimumRating);
      const currentId = catalog.selectedPhotoIds.at(-1);
      const index = photos.findIndex((photo) => photo.id === currentId);
      const next = photos[Math.max(0, Math.min(photos.length - 1, index + direction))];
      if (next) get().selectPhoto(next.id);
    },

    updateAdjustment: (key, value) => {
      if (!get().continuousStart) set({ continuousStart: catalogSnapshot(get().catalog) });
      mutateSelectedPhotos(
        (photo) => ({
          ...photo,
          versions: photo.versions.map((version) =>
            version.id === photo.activeVersionId
              ? {
                  ...version,
                  adjustments: {
                    ...version.adjustments,
                    [key]: key === 'crop' ? { ...(value as PhotoAdjustments['crop']) } : value,
                  },
                }
              : version,
          ),
        }),
        false,
      );
    },

    commitContinuousEdit: () => {
      const start = get().continuousStart;
      if (!start) return;
      set({ history: [...get().history.slice(-39), start], future: [], continuousStart: null });
      scheduleSave();
    },

    resetAdjustments: (keys) => {
      const keysToReset = keys ?? [
        'exposure',
        'contrast',
        'highlights',
        'shadows',
        'whites',
        'blacks',
        'temperature',
        'tint',
        'vibrance',
        'saturation',
        'monochrome',
        'crop',
      ];
      mutateSelectedPhotos((photo) => ({
        ...photo,
        versions: photo.versions.map((version) => {
          if (version.id !== photo.activeVersionId) return version;
          const adjustments = cloneAdjustments(version.adjustments);
          for (const key of keysToReset) {
            if (key === 'crop') adjustments.crop = { ...DEFAULT_ADJUSTMENTS.crop };
            else if (key === 'monochrome')
              adjustments.monochrome = DEFAULT_ADJUSTMENTS.monochrome;
            else adjustments[key] = DEFAULT_ADJUSTMENTS[key];
          }
          return { ...version, adjustments };
        }),
      }));
    },

    copyEdits: () => {
      const photo = get().catalog.photos.find(
        (item) => item.id === get().catalog.selectedPhotoIds.at(-1),
      );
      if (photo)
        set({ copiedAdjustments: cloneAdjustments(getActiveVersion(photo).adjustments) });
    },

    pasteEdits: () => {
      const copied = get().copiedAdjustments;
      if (!copied) return;
      mutateSelectedPhotos((photo) => ({
        ...photo,
        versions: photo.versions.map((version) =>
          version.id === photo.activeVersionId
            ? {
                ...version,
                adjustments: {
                  ...cloneAdjustments(copied),
                  crop: cloneAdjustments(version.adjustments).crop,
                },
              }
            : version,
        ),
      }));
    },

    createVersion: () => {
      mutateSelectedPhotos((photo) => {
        const current = getActiveVersion(photo);
        const id = crypto.randomUUID();
        return {
          ...photo,
          activeVersionId: id,
          versions: [
            ...photo.versions,
            {
              id,
              name: `Version ${photo.versions.length + 1}`,
              createdAt: new Date().toISOString(),
              adjustments: cloneAdjustments(current.adjustments),
            },
          ],
        };
      });
    },

    selectVersion: (versionId) => {
      const catalog = get().catalog;
      const primaryId = catalog.selectedPhotoIds.at(-1);
      if (!primaryId) return;
      const primary = catalog.photos.find((photo) => photo.id === primaryId);
      if (!primary?.versions.some((version) => version.id === versionId)) return;
      applyCatalog(
        {
          ...catalog,
          photos: catalog.photos.map((photo) =>
            photo.id === primaryId ? { ...photo, activeVersionId: versionId } : photo,
          ),
        },
        false,
      );
    },

    renameVersion: (versionId, name) => {
      const catalog = get().catalog;
      const primaryId = catalog.selectedPhotoIds.at(-1);
      if (!primaryId) return;
      applyCatalog(
        {
          ...catalog,
          photos: catalog.photos.map((photo) =>
            photo.id === primaryId
              ? {
                  ...photo,
                  versions: photo.versions.map((version) =>
                    version.id === versionId
                      ? { ...version, name: name.trim() || version.name }
                      : version,
                  ),
                }
              : photo,
          ),
        },
        true,
      );
    },

    toggleOriginal: (show) => set({ showOriginal: show ?? !get().showOriginal }),
    setCommandOpen: (commandOpen) => set({ commandOpen }),
    setExportOpen: (exportOpen) => set({ exportOpen }),
    dismissShortcutHint: () =>
      applyCatalog({ ...get().catalog, shortcutHintDismissed: true }, false),
    togglePanels: () =>
      applyCatalog({ ...get().catalog, panelsHidden: !get().catalog.panelsHidden }, false),

    undo: () => {
      const previous = get().history.at(-1);
      if (!previous) return;
      set({
        catalog: previous,
        history: get().history.slice(0, -1),
        future: [catalogSnapshot(get().catalog), ...get().future.slice(0, 39)],
        continuousStart: null,
      });
      scheduleSave();
    },

    redo: () => {
      const next = get().future[0];
      if (!next) return;
      set({
        catalog: next,
        history: [...get().history.slice(-39), catalogSnapshot(get().catalog)],
        future: get().future.slice(1),
        continuousStart: null,
      });
      scheduleSave();
    },
  };
});
