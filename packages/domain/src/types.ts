export type PhotoFlag = 'unflagged' | 'pick' | 'reject';
export type Workspace = 'library' | 'select' | 'edit' | 'deliver';
export type ViewMode = 'grid' | 'photo';
export type FilterMode = 'all' | 'picks' | 'unflagged' | 'rejects' | 'rated';
export type SaveStatus = 'saved' | 'saving' | 'error';
export type SourceKind = 'demo' | 'folder';

export interface CropRecipe {
  aspect: 'original' | '1:1' | '4:5' | '16:9';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
}

export interface PhotoAdjustments {
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
  monochrome: boolean;
  crop: CropRecipe;
}

export interface PhotoVersion {
  id: string;
  name: string;
  createdAt: string;
  adjustments: PhotoAdjustments;
}

export interface PhotoAsset {
  id: string;
  sourceId: string;
  fileName: string;
  absolutePath: string | null;
  url: string;
  width: number;
  height: number;
  capturedAt: string;
  camera: string;
  lens: string;
  flag: PhotoFlag;
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  activeVersionId: string;
  versions: PhotoVersion[];
  online: boolean;
}

export interface SourceRoot {
  id: string;
  name: string;
  path: string | null;
  kind: SourceKind;
  photoCount: number;
  addedAt: string;
  online: boolean;
}

export interface CatalogDocument {
  schemaVersion: 1;
  onboardingComplete: boolean;
  shortcutHintDismissed: boolean;
  sources: SourceRoot[];
  photos: PhotoAsset[];
  selectedPhotoIds: string[];
  anchorPhotoId: string | null;
  workspace: Workspace;
  viewMode: ViewMode;
  filter: FilterMode;
  minimumRating: 1 | 2 | 3 | 4 | 5;
  panelsHidden: boolean;
  lastOpenedAt: string;
}

export interface ImportCandidate {
  id: string;
  sourceId: string;
  fileName: string;
  absolutePath: string;
  url: string;
  width: number;
  height: number;
  capturedAt: string;
  fileSize: number;
  supported: boolean;
  reason?: string;
}

export interface ImportScanResult {
  source: SourceRoot;
  ready: ImportCandidate[];
  skipped: ImportCandidate[];
  warnings: string[];
  truncated: boolean;
}

export interface ExportRequest {
  photoId: string;
  versionId: string;
  destinationToken: string;
  fileName: string;
  bytes: Uint8Array;
}

export interface ExportDestination {
  token: string;
  label: string;
}

export interface ExportResult {
  canceled: boolean;
  path: string | null;
}

export interface FeedbackIssueDraft {
  title: string;
  feedback: string;
  target: string;
  context: string;
}

export interface OrielDesktopBridge {
  platform: 'darwin' | 'win32' | 'linux' | 'web';
  importFolder: () => Promise<ImportScanResult | null>;
  loadCatalog: () => Promise<CatalogDocument | null>;
  saveCatalog: (catalog: CatalogDocument) => Promise<void>;
  chooseExportDirectory: () => Promise<ExportDestination | null>;
  saveExport: (request: ExportRequest) => Promise<ExportResult>;
  showInFolder: (path: string) => Promise<void>;
  openFeedbackIssue: (draft: FeedbackIssueDraft) => Promise<void>;
  getDiagnostics: () => Promise<Record<string, string>>;
  registerCloseHandler: (handler: () => Promise<void>) => () => void;
}
