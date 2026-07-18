# Oriel landing site

This is the static public-site surface for Oriel. It is intentionally separate from the Electron
renderer: it may reuse brand tokens and fixture assets, but it must not import desktop process code
or catalog state.

```bash
pnpm dev:landing
pnpm --filter @oriel/landing build
pnpm --filter @oriel/landing typecheck
pnpm --filter @oriel/landing test:e2e
pnpm --filter @oriel/landing test:a11y
```

## Page structure

- `src/pages/index.astro` only assembles the narrative.
- Section components own their markup and responsive styling.
- `ProductFrame.astro` renders real visual-test captures from the desktop app.
- `src/scripts/motion.ts` owns the small progressive-enhancement layer: reveal state, page progress,
  pointer lighting/tilt, workflow-stage mapping, and the before/after control.
- The page remains complete without client JavaScript. Reduced motion removes spatial animation,
  and hover treatment is limited to fine-pointer devices.

Playwright covers desktop, mobile, reduced motion, no-JavaScript content, keyboard interaction,
horizontal overflow, cursor/scroll feedback, console errors, and automated WCAG A/AA checks. The
desktop app's visual suite owns the product screenshots used by the site, including the dedicated
Select capture.

## Publishing contract

The site is an honest early-build story, not a download page. Keep these constraints intact:

- RAW claims must match the fixture-backed contract in `docs/raw-support.md`. Never imply broad
  camera certification, professional color, Lightroom migration, production stability, or signed
  cross-platform releases before there is evidence.
- Refer to Lightroom only for factual product-fit comparison. Do not use Adobe logos, screenshots,
  icons, or trade dress; preserve the attribution and independence disclaimer.
- Add download links only after signed artifacts and update channels exist.
- Oriel remains a working name pending trademark and domain clearance.
- Demo photography provenance lives in `docs/fixture-credits.md`; re-check it before a materially new
  campaign.
- `public/og.jpg` is a crop of the reviewed hero and should be regenerated when the hero changes.
- Do not add analytics without an explicit privacy decision.
