# Desktop test strategy

Oriel keeps the feedback loop layered so a product change does not require booting Electron for
every assertion:

- `pnpm test:unit` checks deterministic native helpers such as recursive import classification.
- `pnpm test:e2e:browser` runs the real renderer, fixture photographs, canvas image pipeline, and
  browser persistence/export bridge in Chromium. It covers onboarding through culling, editing,
  versions, copy/paste, undo, persistence, export, and automated accessibility checks.
- `pnpm test:e2e:electron` builds the production app, launches it with an isolated `userData`
  directory, verifies the narrow preload API, writes a real catalog, and proves restart recovery.
- `pnpm test:e2e:raw` fetches two CC0 Sony ILCE-6700 ARW fixtures by byte count and SHA-256,
  exercises compressed and lossless-compressed thumbnails/previews, edits one, exports a full-size
  JPEG, persists camera metadata, and proves the originals remain byte-identical.
- `pnpm test:visual` compares the welcome, shortcuts, library, editor, command palette, export, and
  compact editor surfaces with committed Linux/Chromium baselines.

From the repository root, install Chromium once with
`pnpm --filter @oriel/desktop exec playwright install chromium`. On a headless Linux machine, run
the Electron suite through `xvfb-run -a pnpm --filter @oriel/desktop test:e2e:electron`.

After an intentional visual change, run
`pnpm --filter @oriel/desktop test:visual:update`, inspect every changed PNG in
`apps/desktop/tests/e2e/__screenshots__/visual/`, then run
`pnpm --filter @oriel/desktop test:visual` again. Snapshot updates are review artifacts, not an
automatic fix.
