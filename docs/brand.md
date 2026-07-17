# Oriel brand system

## Status and idea

**Oriel is a working name.** It has not received trademark, company-name, app-store, package-name, or
domain clearance. Treat it as replaceable until that work is complete.

An oriel is a window that projects from a building. That is the useful metaphor: a considered frame
that gives a clearer view while the underlying structure remains yours. The mark uses two offset
frames instead of a camera, lens, or aperture cliché.

- Product name: **Oriel**
- Tagline: **From card to final. Fully yours.**
- Short description: **A fast, local-first photo workspace.**
- Core promise: one coherent path from a local shoot to finished JPEGs, without an account or cloud
  dependency.

The brand must never imply that RAW processing, professional color parity, Lightroom catalog
migration, or production-grade releases exist before they do.

## Personality

Oriel should feel:

- calm, exact, and quietly opinionated;
- made for practiced photographers, without demanding that they relearn familiar concepts;
- contemporary without novelty controls or decorative motion;
- trustworthy about files, reversibility, progress, and failure.

It should not feel luxurious for its own sake, playful during high-volume work, or mysterious about
where data lives.

## Voice

Use short, concrete language. Name the object and consequence.

| Prefer                                        | Avoid                            | Reason                                          |
| --------------------------------------------- | -------------------------------- | ----------------------------------------------- |
| “Open a photo folder”                         | “Start your creative journey”    | The user knows the job they came to do.         |
| “12 JPEGs written to Exports”                 | “Export successful”              | Feedback should answer what happened and where. |
| “Originals remain untouched”                  | “Non-destructive workflow” alone | Explain the consequence, not only the category. |
| “RAW decoding is not available in this build” | “Some files were skipped”        | Failure must be specific and actionable.        |
| “Cancel after this file”                      | “Cancel” during an active write  | Set the correct expectation about timing.       |

## Visual foundation

The editor is a neutral viewing environment. Color belongs to photographs first and interface state
second.

| Token          | Value     | Use                                                   |
| -------------- | --------- | ----------------------------------------------------- |
| Ink            | `#0B0D0C` | Window chrome and deepest background                  |
| Canvas         | `#0E100F` | Photo viewing field                                   |
| Surface        | `#131614` | Sidebars and large panels                             |
| Raised         | `#1B1F1C` | Controls and elevated regions                         |
| Hover          | `#242925` | Local interaction feedback                            |
| Divider        | `#303631` | Strong boundaries                                     |
| Text           | `#F2F1EC` | Primary copy and active labels                        |
| Secondary text | `#A8AEA8` | Supporting labels                                     |
| Muted text     | `#737A74` | Metadata and quiet explanations                       |
| Coral          | `#FF7061` | Primary action, focus, and the active workflow accent |
| Success        | `#70D39A` | Saved/complete/online state                           |
| Warning        | `#E8B462` | Ratings and recoverable caution                       |
| Danger         | `#F05F64` | Errors and destructive state                          |

Coral is a signal, not decoration. Large neutral areas should dominate the desktop app. Marketing may
use a restrained coral atmosphere, but never tint a photograph to make the interface look branded.

## Type and shape

- Primary typeface: **Geist Variable**.
- Metadata and keyboard labels: **Geist Mono Variable**.
- Use tabular numerals for adjustment values, counts, and progress.
- Default control radius: 6 px; popover: 8 px; dialog: 12 px.
- Controls are compact, but every interaction still needs a visible focus state and an adequate hit
  target.
- The offset-window mark should retain at least one quarter of its width as clear space. Do not place
  it on a noisy photograph without a solid container.

## Interaction grammar

These rules apply across desktop and public surfaces:

- Repeated keyboard actions are immediate. Do not animate the command palette, culling, navigation,
  or before/after toggle.
- Buttons press to `scale(0.97)` for immediate acknowledgment.
- Hover treatment is gated behind hover-capable, fine-pointer devices.
- UI transitions name exact properties and stay below 300 ms.
- Never use `transition: all`, `ease-in`, or an entry animation from `scale(0)`.
- Popovers originate from their trigger; centered dialogs remain centered.
- Rare onboarding or marketing moments may use restrained explanatory motion.
- `prefers-reduced-motion` removes spatial motion and smooth scrolling while preserving necessary
  state feedback.

## Everyday feedback rules

The interface applies the core lessons of _The Design of Everyday Things_ through visible mapping and
feedback:

1. **Make the next action legible.** Stable stages map directly to Library → Select → Edit → Deliver.
2. **Show system state.** Selection, flags, ratings, active version, save status, export destination,
   progress, and errors remain visible.
3. **Constrain invalid actions.** Export is disabled until there is a destination and at least one
   target.
4. **Make consequences predictable.** Import review separates ready and skipped files; export states
   that originals remain untouched and collisions create numbered copies.
5. **Make exploration reversible.** Undo, versions, reset, and original preview support safe trials.

## Photography

Marketing should show one believable shoot as a sequence, not a collage of unrelated hero images.
Prefer quiet documentary, travel, editorial, and portrait work with natural color. Product captures
must show the actual build and label unsupported capabilities honestly. Fixture image attribution is
maintained in [fixture-credits.md](./fixture-credits.md).
