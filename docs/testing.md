# Testing and release gates

The highest-risk Oriel defects are silent: a missing file, a changed original, a preview/export
mismatch, a lost catalog write, or a packaged build that opens differently from development. The test
strategy prioritizes those contracts over raw test count.

## Feedback layers

| Layer                 | Purpose                                                                 | Expected command                 |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------- |
| Formatting and lint   | Keep diffs legible and catch unsafe/UI patterns                         | `pnpm format:check`, `pnpm lint` |
| Type boundaries       | Keep domain and preload contracts aligned                               | `pnpm typecheck`                 |
| Domain unit tests     | Catalog defaults, merge, versions, filters, recipes                     | `pnpm test:unit`                 |
| Browser product tests | Fast onboarding, culling, editing, commands, feedback, and export flows | `pnpm test:e2e`                  |
| Accessibility scan    | Semantics, focusability, and obvious violations                         | `pnpm test:a11y`                 |
| Visual snapshots      | Stable key screens at standard and compact sizes                        | `pnpm test:visual`               |
| Electron smoke        | Real preload bridge, persistence, protocols, and app launch             | desktop test target              |
| Packaged smoke        | Install/launch/import/export/reopen the distributable                   | each release OS                  |

Commands describe the intended repository interface; a command is not evidence of a passing gate
until it has run in the current revision.

## Required vertical-slice scenarios

1. First run → sample shoot → Library.
2. Open a folder → review ready/skipped → cancel leaves catalog unchanged.
3. Open a folder → confirm → source and photos survive restart.
4. Navigate with arrows; pick/reject/unflag/rate; Shift action advances exactly once.
5. Filter counts and visible results agree after flag/rating changes.
6. Move an adjustment → preview changes → undo/redo restores the exact recipe.
7. Hold original → label and pixels revert → release restores the active version.
8. Create/rename/select version; original asset count remains one.
9. Copy/paste multiple selections; crop remains photo-specific.
10. Export selected/picks → inspect output dimensions and JPEG decoding → existing name yields numbered
    copy → no `.oriel-partial` remains.
11. Interrupt export → current file finishes, future files do not start, UI explains the result.
12. Rename/unmount a source → clear offline handling and relink path (this remains a missing scenario).
13. Enter Feedback mode by shortcut and command palette → pointer click is intercepted → selected
    target opens the composer → GitHub draft contains the expected template, note, target, and chosen
    safe context → no issue is claimed to exist before browser submission.
14. Navigate Feedback mode with arrows and Enter; Escape returns from composing to targeting and then
    exits; the ordinary product shortcuts do not leak through while the mode is active.

Feedback tests must treat privacy as a negative contract. Seed the page with a distinctive filename,
filesystem path, DOM text, EXIF value, and catalog value, then assert that none appears in the target
snapshot or GitHub URL. Assert that no image bytes or screenshot are created. Test both context-on and
context-off drafts, the required-field limits, control-character cleaning, and the 7,500-character URL
limit.

Browser tests may intercept the GitHub popup and inspect its URL. At the Electron boundary, capture
the constructed URL instead of opening a real browser, then assert the exact host and path are
`github.com/ralfboltshauser/oriel-photo/issues/new`; arbitrary renderer-provided destinations must be
impossible. These tests prove draft construction and handoff, not GitHub authentication or issue
submission.

For filesystem scenarios, tests must hash originals before and after import/edit/export. UI assertions
alone cannot prove the non-destructive contract.

## Visual review

Automated snapshots detect change; they do not judge quality. Every material interface change should
capture and inspect at least:

- onboarding;
- Library grid;
- Select photo with filmstrip and shortcut hint;
- Edit with inspector and original state;
- command palette;
- Feedback mode target highlight, composer, optional-context state, and browser-opened confirmation;
- export configuration, progress, error, and completion;
- a compact window size and reduced-motion mode.

Review hierarchy, photograph neutrality, clipped labels, selection visibility, focus, dialog context,
and whether feedback appears next to the action that caused it. Keyboard-triggered surfaces must feel
instant. Hover effects need a hover-capable pointer media query.

## Cross-platform release gate

A platform is supported only after its packaged artifact passes on a clean current OS installation:

- install and first launch without developer tools;
- onboarding and native folder picker;
- import from internal and removable storage;
- edit/export/reveal in file manager;
- restart persistence and source-offline behavior;
- keyboard labels and platform-specific modifiers;
- color and scaling checks on standard and high-DPI displays;
- update, uninstall, and catalog-preservation behavior;
- signature/notarization verification.

At present the repository has packaging configuration for all three desktop families; that does not
mean these release gates have passed.

## Current Linux evidence

On 2026-07-17, the current tree passed formatting, ESLint, TypeScript, unit tests, four browser product
flows, five automated WCAG surface scans, visual regression, the production Electron preload/restart
test, and a packaged AppImage launch through Playwright. Electron Builder also produced AppImage and
Debian artifacts. macOS and Windows remain configuration/CI targets rather than locally verified
release claims.
