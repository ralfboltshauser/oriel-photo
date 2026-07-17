# Oriel

**From card to final. Fully yours.**

Oriel is an early, local-first photo workspace for photographers who want a coherent desktop workflow
without an account, cloud dependency, or subscription. **Oriel is a working name** and still requires
trademark and domain clearance.

This repository is proving one honest vertical slice:

1. begin with a deterministic sample shoot or open a local image folder;
2. cull with keyboard-first flags and ratings;
3. make non-destructive essential edits;
4. create and compare versions;
5. export a rendered JPEG while leaving the original untouched;
6. reopen the app and recover catalog state;
7. point to an interface element and open a reviewable, prefilled GitHub feedback draft without
   giving Oriel GitHub credentials.

The current image engine handles JPEG, PNG, and WebP with approximate Canvas-based adjustments. RAW
decoding, professional color parity, Lightroom migration, and production releases do not exist yet.
See [known limits](./docs/known-limits.md) before evaluating the build.

## Repository

```text
apps/desktop     Electron desktop product
apps/landing     Static Astro public-site surface
packages/domain  Shared catalog vocabulary and pure operations
packages/fixtures Deterministic sample shoot
packages/ui      Shared brand tokens and React controls
```

The public site is intentionally separate from the Electron renderer so it can evolve without gaining
desktop or filesystem privileges.

## Development

Prerequisites: Node 22.12 or newer within the supported range in `package.json`, Corepack, and pnpm.

```bash
corepack enable
pnpm install
pnpm dev          # desktop
pnpm dev:landing  # public-site scaffold
```

Useful feedback loops:

```bash
pnpm quality
pnpm test:e2e
pnpm test:visual
pnpm build:desktop
pnpm package:linux
```

Packaging targets are configured for macOS, Windows, and Linux; local validation is currently
Linux-only. Configuration is not a release claim.

Press `Cmd+Shift+F` on macOS or `Ctrl+Shift+F` elsewhere to enter Feedback mode. The same action is
available as “Give interface feedback” in the command palette. Feedback mode opens a public GitHub
draft in the default browser; the user reviews and submits it there, so opening the draft does not
itself create an issue.

## Project notes

- [Product scope and user flows](./docs/product.md)
- [Brand and interface system](./docs/brand.md)
- [Architecture boundaries](./docs/architecture.md)
- [Known limits](./docs/known-limits.md)
- [Testing and release gates](./docs/testing.md)
- [Fixture photography credits](./docs/fixture-credits.md)

## License

Code is declared AGPL-3.0-or-later. Fixture photography is separately sourced and credited; the code
license does not relicense it. See [LICENSE](./LICENSE) for the complete license text.
