# RAW support: contract, architecture, and roadmap

Last verified: 2026-07-18

## Product claim

Oriel has an early, end-to-end camera RAW workflow. It can discover, reference, thumbnail, preview,
edit, and export supported RAW originals without changing the source file. This is a useful baseline,
not a claim of Lightroom-quality rendering or broad camera certification.

The strongest compatibility claim currently backed by checked, reproducible fixtures is:

| Camera         | Container | Camera mode         | Workflow proof                        |
| -------------- | --------- | ------------------- | ------------------------------------- |
| Sony ILCE-6700 | ARW       | compressed          | import → preview → edit → JPEG export |
| Sony ILCE-6700 | ARW       | lossless compressed | import → preview → edit → JPEG export |

Both files are real CC0 samples from [raw.pixls.us](https://raw.pixls.us/). Their byte counts,
source URLs, and SHA-256 hashes live in
[`apps/desktop/tests/fixtures/raw/manifest.json`](../apps/desktop/tests/fixtures/raw/manifest.json).
The 66 MB of fixture data is fetched into the ignored `.cache/raw-fixtures` directory rather than
committed to Git.

Extensions currently admitted by the import review are ARW, CR2, CR3, DNG, NEF, ORF, RAF, RAW,
and RW2. An admitted extension is not a promise that every camera, firmware, compression mode, or
malformed file using it will decode. Decode success is determined by the pinned engine and is
reported in context if it fails.

## Ground truth used for the decision

- [LibRaw 0.22's supported-camera list](https://www.libraw.org/supported-cameras) explicitly includes
  Sony ILCE-6700. Camera support belongs to a specific compiled LibRaw version, not to the word
  “ARW” in general.
- [Sony's ILCE-6700 guide](https://helpguide.sony.net/ilc/2320/v1/en/contents/0404I_raw_file_type.html)
  documents compressed and lossless-compressed RAW modes. Both therefore need fixtures.
- [LibRaw's own project description](https://github.com/LibRaw/LibRaw) says its focus is RAW sample
  extraction, metadata, and camera-format coverage; it describes its RGB conversion as basic and not
  production-quality rendering. A successful LibRaw decode cannot honestly establish Lightroom
  color parity.
- [RawSpeed](https://github.com/darktable-org/rawspeed) is a strong stage-one decoder, but explicitly
  leaves metadata, color conversion, white balance, demosaic, and thumbnails to its host. It is not a
  complete drop-in image engine.
- [darktable's pixelpipe documentation](https://docs.darktable.org/usermanual/development/en/darkroom/pixelpipe/the-pixelpipe-and-module-order/)
  establishes essential ordering constraints: highlight reconstruction precedes demosaic, which
  precedes the input color profile; most scene-referred work happens in linear RGB; export uses a
  separate full-quality pipe.

darktable and RawTherapee are valuable reference applications, but neither is treated as a stable
embedded API. Shelling out to an installed application would make behavior, packaging, errors, and
cross-platform support depend on external state. Oriel instead owns its product contract and keeps
the decoder behind a replaceable boundary.

## Current architecture

The current milestone deliberately reuses the existing edit/export surface while isolating RAW
specific work:

1. The trusted main process scans only approved folders and classifies a file as `bitmap` or
   `camera-raw` from a small, explicit extension table.
2. The catalog persists that media kind in schema version 2. Schema version 1 is migrated on read,
   preserving selection, flags, ratings, versions, and recipes.
3. The `oriel-media://` protocol exposes only files below roots the user approved. The renderer does
   not receive general filesystem access.
4. Production UI assets load through `oriel-app://`. Both custom protocols set the cross-origin
   isolation headers required for the threaded WebAssembly worker; Node integration stays disabled.
5. `raw-engine.ts` is the compatibility adapter around the pinned `libraw-wasm` package. At most two
   decodes run concurrently. Source files over 250 MB and decoded images over 120 megapixels fail
   explicitly rather than exhausting memory without a useful message.
6. Library thumbnails prefer the camera's embedded JPEG. They are lazy-loaded near the viewport and
   held in a bounded LRU-style cache.
7. Edit previews use LibRaw's half-size path, camera white balance, camera matrix, AHD demosaic,
   basic highlight handling, and 8-bit sRGB output. The result enters Oriel's existing reversible
   Canvas recipe engine.
8. Full-size export performs a separate full-resolution decode, applies the active Oriel recipe,
   writes a JPEG atomically, and releases the temporary object URL. The original is never rewritten.

Cache identity includes the stable photo id and approved media URL, so replacing a file at the same
path does not silently retain a prior photo's rendered result. Metadata discovered by decoding is
written into the local catalog only when it changes.

## Non-negotiable invariants

- Opening, rating, editing, and exporting may never write to the original.
- Decoder failure is per photo. It must not corrupt or block the catalog.
- Import acceptance and decode certification are separate concepts.
- Thumbnail, preview, and export may use different quality/performance pipes but must share the same
  recipe semantics.
- A camera is called “verified” only when a redistributable or fetchable fixture exercises import,
  preview, metadata, edit, and export in the real Electron renderer.
- The UI and website must distinguish “works end to end” from “professional color parity.”
- Decoder, camera data, and recipe versions must eventually be recorded so an old edit remains
  reproducible after the engine changes.

## Why the result is not yet a professional RAW engine

The current adapter converts the sensor data to an 8-bit, display-referred sRGB image before Oriel's
sliders operate. That throws away much of the latitude photographers expect from RAW and makes the
existing highlight, shadow, white-balance, and saturation controls approximations. It also lacks:

- a versioned scene-linear working space and high-precision internal buffers;
- measured camera profiles and selectable rendering profiles;
- ICC-managed display and export transforms;
- robust highlight reconstruction before demosaic;
- lens distortion, vignetting, chromatic-aberration, and geometry profiles;
- RAW-aware denoise, hot-pixel correction, sharpening, and capture sharpening;
- orientation/crop edge-case certification across camera families;
- deterministic render-version migration and visual regression targets.

The current implementation is therefore a compatibility bridge that unlocks real user testing. It
is not the final rendering foundation.

## Roadmap to a competitive rendering foundation

### Milestone 1 — compatibility baseline (implemented)

- Versioned media-kind catalog migration.
- Secure local media and isolated app protocols.
- Worker-based LibRaw 0.22.1 decode.
- Lazy embedded thumbnails, bounded preview cache, full-size export path.
- Sony ILCE-6700 compressed and lossless-compressed fixture proof.
- Honest UI and site support language.

### Milestone 2 — measurement harness

- Establish a fixture matrix by sensor family, bit depth, compression mode, orientation, high-ISO
  case, clipped-highlight case, and embedded-preview variant.
- Store expected dimensions, metadata, source hashes, output hashes, timings, and peak memory.
- Add color targets photographed under known illuminants and compare patches in a perceptual color
  space. Define tolerances before choosing algorithms.
- Compare Oriel output against camera JPEG, darktable, RawTherapee, and Lightroom using identical
  neutral settings. Comparisons are evidence, not golden truth; disagreements must be explained.
- Add corrupted/truncated/oversized inputs and ensure failures remain bounded and actionable.

### Milestone 3 — scene-linear core

Build a replaceable native rendering service behind the existing photo-resource boundary:

1. decode mosaic, black/white levels, CFA, orientation, and camera metadata;
2. correct sensor defects and reconstruct clipped highlights before demosaic;
3. demosaic to a high-precision scene-linear working buffer;
4. apply camera white balance and a versioned input color transform;
5. perform exposure, tone, color, local masks, denoise, and lens operations in their documented
   spaces and order;
6. tone-map for the target medium;
7. apply display or output ICC transform;
8. resample, sharpen for output, and encode.

Preview and export should call the same graph at different scale/quality settings. The recipe stores
intent, not a cached bitmap, and names the render-graph version.

### Milestone 4 — photographer-grade controls

- White balance in temperature/tint units with camera/as-shot/auto choices.
- Exposure and tone controls whose ranges and behavior remain stable across cameras.
- Camera and creative profiles with an explicit default rendering choice.
- Lens correction, chromatic aberration, denoise, sharpening, crop/straighten, healing, and masks.
- Before/after, reset, copy/paste, versions, and batch behavior verified on RAW, not merely shared UI.
- Background preview generation, invalidation, and visible render progress for large shoots.

### Milestone 5 — camera certification and release gate

- Publish a support matrix generated from passing fixtures, never a hand-written list of extensions.
- Exercise packaged macOS, Windows, and Linux artifacts on representative Intel/ARM hardware and
  GPUs. Linux-only success is not cross-platform verification.
- Make cache location/size observable and rebuildable; corrupted caches must be disposable.
- Complete third-party license review, source-offer/relinking obligations, code signing, and update
  provenance before distributing binaries.

## Verification commands

```sh
pnpm --filter @oriel/desktop fixtures:raw
pnpm --filter @oriel/desktop test:e2e:raw
```

The fetch command verifies both byte length and SHA-256. The Electron test verifies cross-origin
isolation, two-file import, thumbnails, each edit preview, a recipe change, full-size JPEG export,
the exported 6240×4168 dimensions, catalog schema/metadata, and unchanged source hashes. On Linux the
same test can take `ORIEL_E2E_EXECUTABLE_PATH` to exercise a packaged directory or AppImage. Normal
unit, accessibility, visual, packaging, and cross-platform gates still apply.

## Dependency and licensing boundary

Oriel currently pins `libraw-wasm` 1.6.0. Its tagged build script pins LibRaw 0.22.1 and LittleCMS
2.19.1. LibRaw is offered under LGPL-2.1 or CDDL-1.0; the wrapper declares ISC; LittleCMS declares
MIT. Exact upstream source and notices are recorded in [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md).

This is an engineering inventory, not legal advice. No binary release should be published until the
chosen LibRaw license path, corresponding-source delivery, replacement/relinking mechanism, and
complete license-text packaging have been reviewed and tested in the produced artifact.
