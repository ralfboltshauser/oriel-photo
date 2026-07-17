# Architecture boundaries

## Repository map

```text
apps/
  desktop/     Electron main, preload, and React renderer
  landing/     Static Astro public site
packages/
  domain/      Catalog types and pure domain operations
  fixtures/    Deterministic sample shoot and its development images
  ui/          Brand tokens and reusable React controls
docs/          Product, brand, architecture, testing, and limitations
```

The monorepo is coordinated by pnpm workspaces and Turborepo. Apps may depend on packages; packages
must not depend on apps. The landing site may reuse brand tokens and fixture assets, but it must never
import Electron, desktop catalog state, or native bridges.

## Desktop process boundary

The desktop app has three security domains:

```text
local filesystem / OS dialogs
           │
           ▼
Electron main process ── validated IPC operations
           │
           ▼
sandboxed preload ────── narrow window.oriel bridge
           │
           ▼
React renderer ───────── product UI and Canvas image recipes
```

### Main process owns

- native folder and destination pickers;
- recursive file discovery;
- serialized catalog disk persistence and recovery;
- canonicalizing approved source roots and serving only contained local images through
  `oriel-media:`;
- collision-safe, temporary-then-rename export writes;
- revealing files in the OS and gathering diagnostics.

### Preload owns

- one typed `OrielDesktopBridge` exposed through `contextBridge`;
- no raw `ipcRenderer`, filesystem module, or general command execution.

### Renderer owns

- onboarding and the Library → Select → Edit → Deliver flow;
- ephemeral selection and interaction state;
- reversible catalog operations and save scheduling;
- the current Canvas 2D preview/export recipe;
- an explicit development-only browser bridge used by product and visual tests. A production preload
  failure stops with a visible recovery error instead of silently falling back to browser storage.

The renderer must be treated as untrusted. Native operations validate the sender and arguments. The
window keeps `contextIsolation`, sandboxing, `webSecurity`, and disabled Node integration. New-window
creation and permission requests are denied by default.

## Domain boundary

`@oriel/domain` is the stable vocabulary shared across processes:

- `CatalogDocument` is versioned (`schemaVersion: 1`).
- a `PhotoAsset` references one original and contains one or more `PhotoVersion` recipes;
- flags and ratings belong to the photo; adjustments belong to a version;
- `ImportScanResult` separates ready and skipped candidates;
- `OrielDesktopBridge` is the only renderer-to-native contract.

Pure catalog functions belong in the domain package and should have unit tests. React state, Electron
objects, paths from `app.getPath`, and browser globals do not belong there.

## Data flows

### Import

1. Renderer requests a folder review through the bridge.
2. Main opens a native picker, canonicalizes the root, skips symbolic links, and scans recognized
   extensions with bounded metadata work and a 5,000-file review ceiling.
3. Main returns supported and unsupported candidates without mutating the catalog.
4. The user confirms.
5. Domain logic merges new paths and the catalog store persists the document atomically.
6. Main serves allowed originals through a custom protocol; arbitrary filesystem paths are rejected.

The original files are referenced in place. Import is not a backup operation.

### Edit

1. The active photo version supplies a recipe.
2. The same renderer module applies that recipe to a preview canvas.
3. Continuous slider movement updates visual feedback immediately.
4. Release commits a single history entry and schedules catalog persistence.

Edits never write to the original. The current recipe is an approximate sRGB Canvas implementation,
not a professional RAW/color engine.

### Export

1. Renderer produces JPEG bytes from the active version.
2. A native picker issues an opaque, main-owned destination grant; the renderer never gains an
   arbitrary output path capability.
3. The typed bridge sends bytes, the destination grant, and a sanitized proposed name to main.
4. Main validates payload size, resolves name collisions, writes a unique `.oriel-partial` file, then
   renames it to the final path and cleans up on failure.
5. UI reports progress, failure, or completion.

This prevents a canceled or failed write from masquerading as a complete JPEG. A future native image
pipeline may move rendering out of the renderer without changing the product flow.

## Catalog durability

The catalog is JSON under Electron's per-user application-data directory. Saves are serialized,
written to unique temporary files, rotated through a last-known-good backup, and flushed before a
normal window close. A single-instance lock prevents two Oriel processes from writing the same
catalog. Runtime validation rejects malformed catalogs and the UI stops before overwriting an
unrecoverable one. This is still not a complete archival story: explicit migrations, user-managed
backup/restore, power-loss fault injection, large-catalog indexing, and documented sidecars remain
future work.

Any schema change must add an explicit migration. Never reinterpret existing adjustment numbers in
place without a versioned conversion and golden-image evidence.

## Cross-platform distribution

Electron Builder is configured for:

- Linux: AppImage and Debian package;
- macOS: DMG and ZIP;
- Windows: NSIS installer.

Configuration is not verification. Linux packaging is the current local validation target. macOS and
Windows need CI runners, native smoke tests, code signing, notarization where applicable, icons,
update-channel policy, and install/uninstall testing before release claims.

## Where the architecture must grow

The first major replacement boundary is the image engine. Professional competitiveness needs a
native, deterministic pipeline for RAW decoding, demosaic, camera and lens profiles, working color
spaces, ICC display transforms, GPU acceleration, metadata, and stable export. Keep that pipeline
behind recipe and render contracts rather than leaking native types into product components.

The second is catalog scale and interoperability: indexes, source health/relinking, backups, XMP or a
documented sidecar, and a migration report. Those should extend the domain model without granting the
renderer arbitrary filesystem access.
