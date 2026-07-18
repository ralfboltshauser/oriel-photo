# Known limits

Last reviewed: 2026-07-18.

This file is part of the product contract. Remove an item only after the behavior exists and has
evidence appropriate to its risk.

## Image support and quality

- Folder import accepts JPEG/JPG, PNG, WebP, ARW, CR2, CR3, DNG, NEF, ORF, RAF, RAW, and RW2.
- RAW compatibility is provided by pinned LibRaw 0.22.1 WebAssembly. Sony ILCE-6700 compressed and
  lossless-compressed ARW are verified with real fixtures; the other admitted extensions and camera
  variants are not yet certified. A recognized extension can still fail during decode.
- RAW previews use camera white balance/matrix, AHD demosaic, basic highlight handling, and 8-bit sRGB
  output before Oriel's adjustments. This is a compatibility baseline, not a high-precision
  scene-linear pipeline.
- There is no measured camera-profile system, lens correction, production highlight reconstruction,
  RAW-aware denoise, capture sharpening, or selectable rendering profile.
- Adjustments use an approximate Canvas 2D sRGB pixel transform. Their numbers do not have Lightroom
  parity and are not scientifically calibrated.
- There is no ICC display transform, wide-gamut working space, monitor soft proof, HDR, or output
  profile selection.
- Preview and export share the same recipe code, but visual parity has not been established across OS,
  browser engine, GPU, and image codec versions.
- Web/full JPEG settings are fixed. Export does not retain EXIF/IPTC/GPS metadata or embedded editing
  history.
- Crop currently supports center-constrained Original, 1:1, 4:5, and 16:9 plus 90-degree rotation;
  there is no free crop, straighten, perspective, or orientation-metadata validation.

## Catalog and file management

- Catalog storage is a schema-v2 JSON document with a rotating last-known-good backup, automatic
  fallback, and a schema-1 media-kind migration. There is no user-facing backup browser, restore, or
  repair tool.
- Imported files are referenced in place and are not backed up. The app does not yet offer copy/move
  import, duplicate byte detection, or a backup verification workflow.
- File identity uses path, size, and modification time during scan. Rename/move tracking and source
  relinking are not implemented.
- Normal restart persistence, serialized atomic writes, close-time flush, and single-instance
  protection exist. Disk removal, path permission changes, total corruption of both catalog copies,
  and abrupt power-loss recovery still need broader destructive testing.
- RAW decode persists width, height, camera, lens, and capture time when available. Bitmap metadata
  and broader EXIF/IPTC/GPS/orientation ingestion remain incomplete; placeholders and filesystem
  timestamps are still used where metadata is unavailable.
- There are no albums, stacks, smart collections beyond basic flags/ratings, text search, face
  recognition, or advanced metadata filters.
- Folder review is intentionally capped at 5,000 relevant files per import, the Library grid is
  row-virtualized, and the filmstrip is windowed. End-to-end performance is still not characterized
  for Lightroom-sized catalogs; do not infer it from the 12-photo demo.

## Editing and workflow

- The global adjustment set is limited to exposure, contrast, highlights, shadows, whites, blacks,
  temperature, tint, vibrance, saturation, monochrome, crop ratio, and rotation.
- There are no local masks, healing/clone, red-eye, curves, HSL/color mixer, calibration, presets,
  history browser, snapshots beyond versions, panorama/HDR merge, or plugin API.
- Copy/paste intentionally excludes crop, but there is not yet a detailed “choose adjustments” dialog.
- Undo history is session memory; it is not restored after restart.
- Source-offline display and relinking are incomplete.
- Accessibility checks and keyboard coverage cannot substitute for testing with photographers using
  assistive technology and different input devices.

## Migration and interoperability

- Lightroom Classic catalogs cannot be imported.
- XMP sidecars, Lightroom presets/profiles, keywords, collections, flags, virtual copies, and edit
  histories are not read or written.
- There is no dry-run migration report, rollback, catalog compatibility matrix, or validation against
  exported Lightroom references.

Migration is one of the largest switching objections. Until it exists, Oriel is best evaluated on a
new shoot, not as the sole home for an established archive.

## Distribution and operations

- Electron Builder has macOS, Windows, and Linux targets, but current local testing is Linux-only.
- Linux AppImage and Debian artifacts build. The AppImage passes the complete two-file Sony A6700
  fixture workflow through full-size export. This is not a signed release or a broad distro
  compatibility claim.
- Signed/notarized releases, auto-update, reproducible-build evidence, release channels, crash report
  consent, telemetry policy, and vulnerability response process are not established.
- The application identity, working name, icons, domain, and store metadata are not legally cleared.
- Package metadata points to the public GitHub repository and a GitHub noreply maintainer address;
  this does not imply that the Oriel name or broader product identity has been legally cleared.
- The project is not claiming production stability, archival safety, or feature parity with Lightroom.

## Interface feedback

- Feedback mode opens a prefilled public issue draft in the system browser. It does not automatically
  create an issue, and the user must review and submit the form on GitHub.
- Opening the draft sends the prefilled fields to GitHub in the URL before an issue exists, and the
  browser may retain that URL in its history.
- Oriel has no GitHub account integration and never handles a GitHub token. Submitting as the user
  therefore depends on the browser being signed in to a GitHub account that can create an issue in
  the public repository.
- Feedback is text-only. Oriel deliberately does not attach screenshots, photos, filenames,
  filesystem paths, EXIF, catalog content, visible DOM text, or a DOM copy.
- Safe app, operating-system, workspace, view, viewport, and bounds context is optional. The semantic
  interface-target description is always included so maintainers can locate the element.
- The feedback note is limited to 1,200 characters, individual prefill fields have defensive limits,
  and the complete encoded URL is limited to 7,500 characters. Very long or heavily encoded feedback
  must be shortened before GitHub can be opened.
- Draft opening depends on the operating system's browser handoff and GitHub availability. Oriel
  cannot confirm whether the user ultimately submitted, edited, abandoned, or duplicated the issue.

## Deliberate non-goals for the first slice

Cloud sync, accounts, mobile apps, web galleries, team collaboration, Photoshop round-trip, tethering,
printing, maps, and generative AI are outside the current target. Their absence is deliberate;
professional RAW color, migration, source recovery, and scale are still missing fundamentals rather
than optional polish.
