import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { _electron as electron, type ElectronApplication } from 'playwright';

const desktopRoot = resolve(process.cwd());
const mainEntry = resolve(desktopRoot, 'out/main/index.js');
const fixtureRoot = resolve(desktopRoot, '../../.cache/raw-fixtures');
const compressedPath = join(fixtureRoot, 'sony-a6700-compressed.arw');
const losslessPath = join(fixtureRoot, 'sony-a6700-lossless-compressed.arw');
const fixturesAvailable = existsSync(compressedPath) && existsSync(losslessPath);
const packagedExecutable = process.env.ORIEL_E2E_EXECUTABLE_PATH;

function environment(overrides: Record<string, string>): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
    ...overrides,
  };
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

function jpegDimensions(bytes: Uint8Array): { height: number; width: number } {
  const startOfFrameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  for (let index = 0; index < bytes.length - 8; index += 1) {
    if (bytes[index] !== 0xff || !startOfFrameMarkers.has(bytes[index + 1] ?? 0)) continue;
    return {
      height: ((bytes[index + 5] ?? 0) << 8) | (bytes[index + 6] ?? 0),
      width: ((bytes[index + 7] ?? 0) << 8) | (bytes[index + 8] ?? 0),
    };
  }
  throw new Error('Exported JPEG has no start-of-frame marker');
}

test('Sony A6700 compressed and lossless ARW complete the local workflow', async () => {
  test.skip(!fixturesAvailable, 'Run pnpm --filter @oriel/desktop fixtures:raw first');
  test.setTimeout(240_000);
  const userDataPath = await mkdtemp(join(tmpdir(), 'oriel-raw-e2e-'));
  const exportPath = await mkdtemp(join(tmpdir(), 'oriel-raw-export-e2e-'));
  const originalHashes = await Promise.all([sha256(compressedPath), sha256(losslessPath)]);
  let application: ElectronApplication | undefined;

  try {
    application = await electron.launch({
      ...(packagedExecutable ? { executablePath: packagedExecutable } : { args: [mainEntry] }),
      env: environment({
        ORIEL_E2E_EXPORT_PATH: exportPath,
        ORIEL_E2E_IMPORT_PATH: fixtureRoot,
        ORIEL_E2E_USER_DATA: userDataPath,
      }),
    });
    const page = await application.firstWindow();
    const runtime = await page.evaluate(() => ({
      crossOriginIsolated,
      sharedArrayBuffer: typeof SharedArrayBuffer,
    }));
    expect(runtime).toEqual({ crossOriginIsolated: true, sharedArrayBuffer: 'function' });

    await page.getByRole('button', { name: 'Open a folder' }).click();
    const review = page.getByRole('dialog', { name: /Review/ });
    await expect(review.getByText('2 camera RAW files')).toBeVisible();
    await expect(review.locator('.import-stat.skipped strong')).toHaveText('0');
    await page.getByRole('button', { name: 'Add 2 photos' }).click();
    await expect(page.getByRole('gridcell')).toHaveCount(2);
    await expect(page.locator('.raw-format-badge')).toHaveCount(2);
    await expect(page.locator('img[data-raw-status="ready"]')).toHaveCount(2, {
      timeout: 90_000,
    });

    const photos = page.getByRole('gridcell');
    await photos.first().click();
    await page.keyboard.press('d');
    const canvas = page.locator('canvas[data-media-kind="camera-raw"]');
    await expect(canvas).toHaveAttribute('data-render-status', 'ready', { timeout: 90_000 });
    await expect(canvas).toHaveAttribute('data-source-width', '3120');
    await expect(canvas).toHaveAttribute('data-source-height', '2084');

    const firstPhotoId = await canvas.getAttribute('data-photo-id');
    await expect(canvas).toHaveAttribute('data-source-photo-id', firstPhotoId ?? '');
    await page.keyboard.press('ArrowRight');
    await expect(canvas).not.toHaveAttribute('data-photo-id', firstPhotoId ?? '', {
      timeout: 15_000,
    });
    const secondPhotoId = await canvas.getAttribute('data-photo-id');
    await expect(canvas).toHaveAttribute('data-source-photo-id', secondPhotoId ?? '', {
      timeout: 90_000,
    });
    await page.keyboard.press('ArrowLeft');
    await expect(canvas).toHaveAttribute('data-photo-id', firstPhotoId ?? '', {
      timeout: 15_000,
    });
    await expect(canvas).toHaveAttribute('data-source-photo-id', firstPhotoId ?? '', {
      timeout: 90_000,
    });

    const exposure = page.getByLabel('Exposure value');
    await exposure.fill('0.75');
    await exposure.press('Enter');
    await expect(exposure).toHaveValue('+0.75');
    const reviewCaptureDirectory = resolve(desktopRoot, 'screenshots/current');
    await mkdir(reviewCaptureDirectory, { recursive: true });
    await page.screenshot({
      animations: 'disabled',
      path: join(reviewCaptureDirectory, 'raw-a6700-edit.png'),
    });

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.getByRole('button', { name: 'Full-size JPEG' }).click();
    await page.getByRole('button', { name: /Choose a folder/ }).click();
    await page.getByRole('button', { name: 'Export 1' }).click();
    await expect(page.getByRole('heading', { name: 'Delivery ready' })).toBeVisible({
      timeout: 150_000,
    });

    const outputs = (await readdir(exportPath)).filter((name) => name.endsWith('.jpg'));
    expect(outputs).toHaveLength(1);
    const output = await readFile(join(exportPath, outputs[0]!));
    expect([...output.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(output.byteLength).toBeGreaterThan(500_000);
    expect(jpegDimensions(output)).toEqual({ height: 4168, width: 6240 });

    await expect
      .poll(async () => {
        const catalog = JSON.parse(
          await readFile(join(userDataPath, 'catalog-v1.json'), 'utf8'),
        ) as {
          photos: { camera: string; height: number; lens: string; width: number }[];
          schemaVersion: number;
        };
        return {
          cameras: catalog.photos.map((photo) => photo.camera),
          dimensions: catalog.photos.map((photo) => [photo.width, photo.height]),
          lenses: catalog.photos.map((photo) => photo.lens),
          schemaVersion: catalog.schemaVersion,
        };
      })
      .toEqual({
        cameras: ['Sony ILCE-6700', 'Sony ILCE-6700'],
        dimensions: [
          [6240, 4168],
          [6240, 4168],
        ],
        lenses: ['E 16-55mm F2.8 G', 'E 16-55mm F2.8 G'],
        schemaVersion: 2,
      });
    expect(await Promise.all([sha256(compressedPath), sha256(losslessPath)])).toEqual(
      originalHashes,
    );
  } finally {
    if (application) await application.close();
    await Promise.all([
      rm(userDataPath, { force: true, recursive: true }),
      rm(exportPath, { force: true, recursive: true }),
    ]);
  }
});
