# Oriel landing site

This is the static public-site surface for Oriel. It is intentionally separate from the Electron
renderer: it may reuse brand tokens and fixture assets, but it must not import desktop process code
or catalog state.

```bash
pnpm dev:landing
pnpm --filter @oriel/landing build
pnpm --filter @oriel/landing typecheck
```

The current page is an honest early-build announcement, not a download page. Before publishing it:

- replace the repository placeholder only when a stable public URL exists;
- add real download links only after signed artifacts and update channels exist;
- add trademark/domain clearance and a real privacy statement;
- replace fixture photography if the final marketing usage needs different licensing;
- add social-card artwork and production analytics only with an explicit privacy decision.
