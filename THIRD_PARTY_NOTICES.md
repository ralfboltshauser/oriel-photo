# Third-party notices

This file records direct non-JavaScript runtime code introduced by Oriel's RAW compatibility
baseline. The lockfile is the source of truth for the complete JavaScript dependency graph.

## libraw-wasm 1.6.0

- Project: <https://github.com/ybouane/LibRaw-Wasm>
- Exact source: <https://github.com/ybouane/LibRaw-Wasm/tree/v1.6.0>
- Tag commit: `32fd36a9883a10c1632bc20073f1ea88cc60487a`
- Declared package license: ISC
- Authors/contributors named by the package: ybouane, BeseBarni, lexluthor0304, gwennlbh, hrueger

The npm artifact contains generated JavaScript, a worker, and WebAssembly. The tagged source includes
the wrapper and reproducible build script.

## LibRaw 0.22.1

- Project: <https://github.com/LibRaw/LibRaw>
- Exact source: <https://github.com/LibRaw/LibRaw/tree/0.22.1>
- Copyright: 2008–2025 LibRaw LLC, plus upstream authors identified by LibRaw
- License choice exposed by upstream: LGPL-2.1 or CDDL-1.0
- LGPL text: <https://github.com/LibRaw/LibRaw/blob/0.22.1/LICENSE.LGPL>
- CDDL text: <https://github.com/LibRaw/LibRaw/blob/0.22.1/LICENSE.CDDL>
- Copyright and acknowledgements: <https://github.com/LibRaw/LibRaw/blob/0.22.1/COPYRIGHT>

Oriel's current engineering assumption is the LGPL-2.1 path. That assumption must receive a release
compliance review before binaries are distributed; see `docs/raw-support.md`.

## LittleCMS 2.19.1

- Project: <https://github.com/mm2/Little-CMS>
- Exact source: <https://github.com/mm2/Little-CMS/tree/lcms2.19.1>
- Copyright: 2023 Marti Maria Saguer
- License: MIT
- License text: <https://github.com/mm2/Little-CMS/blob/lcms2.19.1/LICENSE>

## Fixture data

The two Sony ILCE-6700 files used by the optional RAW E2E suite come from
<https://raw.pixls.us/> under CC0-1.0. They are downloaded into an ignored cache and are not shipped
in the application artifact. Exact URLs and hashes are in
`apps/desktop/tests/fixtures/raw/manifest.json`.
