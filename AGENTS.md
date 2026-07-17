# Oriel contributor contract

Oriel is a local-first, cross-platform photo workspace. The product promise is that originals stay
untouched, actions explain their consequences, and the user can always recover or leave.

## Architecture boundaries

- `apps/desktop/src/main`: trusted Electron main process; filesystem and OS dialogs only.
- `apps/desktop/src/preload`: narrow, typed bridge. Never expose raw Electron or Node APIs.
- `apps/desktop/src/renderer`: browser-only product UI.
- `packages/domain`: platform-neutral photo/catalog/edit behavior and types.
- `packages/ui`: Oriel design primitives and tokens; no product/domain state.
- `packages/fixtures`: deterministic demo shoot and test data.

## Required checks

Run `pnpm quality`, `pnpm test:e2e`, and `pnpm build:desktop` before handoff. Visual changes must be
reviewed from screenshots at 1440×960 and 1280×800. Preserve screenshot baselines intentionally.

## Interaction craft

- Keyboard-repeated actions are instant and unanimated.
- Animate only transform and opacity unless there is a measured reason.
- Never use `transition: all`, `ease-in`, or entry from `scale(0)`.
- All pressable controls have visible focus and active feedback.
- Honor `prefers-reduced-motion`.
- Disabled controls explain why. Destructive actions state count and consequence.
- Use photographer language. Never hide original, protection, export, or task status.

## Product truth

Do not imply support for RAW decoding, Lightroom migration, AI masks, cloud sync, or production-scale
catalogs until those flows exist and have fixtures/tests. Label prototype capabilities honestly.
