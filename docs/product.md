# Product scope and user flows

## The product bet

Oriel initially targets photographers who pay for Lightroom mainly to organize, cull, make essential
global adjustments, and export local shoots. It does not target people whose workflow depends on
Photoshop round-tripping, cloud sync, mobile editing, team review, or Adobe ecosystem integration.

The v1 promise is deliberately narrower than “replace every Lightroom feature”:

> Finish one local shoot quickly, confidently, and without surrendering ownership of the files or
> catalog.

The product wins only if that complete job is materially calmer and faster—not merely free.

## Product invariants

These are user-facing contracts, not optional implementation details:

1. Oriel never modifies or deletes an original photo during import, edit, or export.
2. A folder is reviewed before its supported files enter the catalog.
3. Every adjustment is a reversible recipe attached to a version.
4. The user can always tell which photos are selected and which version is active.
5. Export names collisions safely and reports the destination and per-file progress.
6. Catalog state survives a normal app restart.
7. Unsupported formats are named before import; they do not silently disappear.
8. The same adjustment recipe drives preview and JPEG export, within the limits of the current image
   engine.
9. Feedback mode never needs a GitHub token and never treats opening a browser draft as submitting an
   issue.

## Primary journey: finish one shoot

### 1. First run

**Entry:** a clean install or empty catalog.

- The first screen explains the local-file model in one sentence.
- The user can open a real folder or enter a deterministic sample shoot.
- A second onboarding step introduces the small set of high-value shortcuts.
- Finishing either route lands in Library with an obvious selected photograph.

**Feedback:** Oriel states supported formats and that the folder is referenced in place, not backed up.

### 2. Review a folder

- The native folder picker opens.
- Oriel scans recursively and presents a review with counts for ready and skipped files.
- Unsupported RAW files show their actual extension and the missing capability.
- Cancel changes nothing. Confirm adds only the ready files and leaves originals where they are.

**Recovery:** opening the same path again does not duplicate an already-cataloged file.

### 3. Cull at speed

- The user enters Select and sees one photograph at a time with a filmstrip.
- Arrow keys move; `P`, `X`, and `U` set pick, reject, and unflagged; `0`–`5` set rating.
- Holding Shift while flagging or rating applies the state and advances.
- Filters for picks, rejects, unflagged, and minimum rating update immediately.
- Grid selection supports single, additive, and contiguous range selection.

**Feedback:** flag, rating, selection outline, counts, and filtered result all agree. A shortcut hint
appears once and can be dismissed permanently.

### 4. Shape a keeper

- Edit begins with essential Light and Color controls.
- Whites and Blacks remain behind an explicit reveal until needed.
- Before/original preview is a held or toggled state and is unmistakably labeled.
- Crop uses constrained aspect options plus 90-degree rotation.
- Copy/paste transfers adjustments to selected photos but deliberately excludes crop.
- Reset, undo, and redo remain available.

**Feedback:** the photograph changes while the adjustment moves; releasing a continuous adjustment
creates one coherent undo step rather than dozens.

### 5. Explore versions

- “Create version” duplicates the current recipe without duplicating the original file.
- The user can select and rename versions.
- Export uses the active version and includes a version suffix when a photo has multiple versions.

**Feedback:** active version, adjusted state, and output name remain legible.

### 6. Deliver

- Deliver shows the picks and the exact count to be rendered.
- Export targets either current selection or all picks.
- The user chooses Web JPEG (2048 px, 86%) or full-size JPEG (94%) and a native destination.
- Export progresses one file at a time. Cancel means “after this file,” preventing partial writes.
- Existing filenames are preserved by creating numbered copies.
- Completion reports count and destination and can reveal the last file in the OS file manager.

**Feedback:** configuration → progress → completion/error are distinct states. Originals are explicitly
reported untouched.

### 7. Return

- Closing and reopening restores sources, flags, ratings, recipes, versions, current stage, filters,
  and selection.
- Missing-source handling is not complete yet; until it is, recovery claims must remain limited to
  normal restarts with source files still available.

### 8. Give interface feedback

**Entry:** press `Cmd+Shift+F` on macOS or `Ctrl+Shift+F` elsewhere, or choose “Give interface
feedback” from the command palette.

- Feedback mode highlights the interface target under the pointer. Clicking locks that target without
  activating its normal action.
- A keyboard user can move through registered targets with the arrow keys and press Enter to select
  one.
- The composer asks for one specific observation and shows the semantic target information that will
  be included.
- App version, operating system, workspace, view, viewport, and target bounds are optional context.
  The user can review this context and turn it off before continuing.
- “Review on GitHub” opens a prefilled issue draft in the default browser. Oriel does not request,
  store, or transmit a GitHub token.
- The browser's signed-in GitHub account owns the issue only after the user reviews the public form
  and presses “Submit new issue.” Opening the draft alone creates nothing.

**Privacy:** Oriel sends the user's note, a sanitized semantic target description, and only the safe
context the user chose. It does not attach a photo, screenshot, filename, filesystem path, EXIF,
catalog content, visible DOM text, or a DOM copy.

**Recovery:** Escape closes the composer back to targeting, then exits Feedback mode. After opening a
draft, the user can open it again, annotate another target, or exit.

## Progressive discovery model

Oriel reveals capability in layers:

| Layer          | What is visible                                                                 | When it appears                      |
| -------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| Orientation    | Four stages, selected photo, primary next action                                | Always                               |
| Immediate work | Pick/reject/rate; essential light/color; export target/recipe                   | In the relevant stage                |
| Context        | Shortcut hint, before/original label, multi-select state, export safety summary | When the state first matters         |
| Depth          | Whites/blacks, versions, crop, copy/paste, panel hiding                         | On explicit reveal or command search |
| Expert recall  | Command palette aliases and keyboard shortcuts                                  | On demand; never blocks pointer use  |

This is not feature hiding. Search terms include familiar Lightroom vocabulary where the behavior is
equivalent—for example, “virtual copy” can find “Create version”—while the visible interface uses the
clearest plain-language label.

## Switching objections the product must answer

| Objection                                 | Required answer before a broad v1 claim                                                                                                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “Will it make my RAW files look as good?” | A measured RAW/color pipeline across representative cameras and displays. Not implemented.                                                                                      |
| “Can I bring my Lightroom work?”          | A migration assistant with a dry-run report, mapping rules, unsupported-item report, and rollback. Not implemented.                                                             |
| “Will I lose my originals?”               | Referenced-in-place import, non-destructive recipes, explicit export-only writes, and tests of those contracts. Implemented for the current slice.                              |
| “Is culling actually faster?”             | Keyboard parity, instant feedback, advance-on-action, stable filters, and measured large-shoot performance. Interaction and bounded rendering exist; scale evidence is pending. |
| “Can I find everything later?”            | Metadata ingestion, folders/albums, search, resilient source relinking, and catalog backup. Mostly not implemented.                                                             |
| “Can I trust a free app to stay alive?”   | Open governance, reproducible builds, signed releases, documented catalog format, backups, and exportable sidecars. Not implemented yet.                                        |
| “Does it run on my computer?”             | Tested, signed, updating builds for current macOS, Windows, and Linux. Targets are configured; only Linux is in current test scope.                                             |

## Explicitly outside the current slice

- cloud accounts, sync, mobile clients, web galleries, and team review;
- Photoshop round-trip or plugin ecosystem compatibility;
- Lightroom catalog migration and XMP round-trip;
- RAW decoding, camera/lens profiles, ICC-managed color, HDR, soft proofing, and print;
- local masks, healing, perspective correction, panorama/HDR merge, tethering, and maps;
- AI selection, denoise, subject masks, generative tools, and face recognition;
- full metadata reading/writing, advanced search, albums, source relinking, and user-managed catalog
  backup/restore.

These may become product work later, but they must not dilute the “finish one local shoot” path before
it is robust.
