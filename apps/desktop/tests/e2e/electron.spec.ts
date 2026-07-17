import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { expect, test } from '@playwright/test';
import { _electron as electron, type ElectronApplication } from 'playwright';

const desktopRoot = resolve(process.cwd());
const mainEntry = resolve(desktopRoot, 'out/main/index.js');

function launchEnvironment(
  userDataPath: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
    ORIEL_E2E_USER_DATA: userDataPath,
    ...overrides,
  };
}

async function launchOriel(
  userDataPath: string,
  overrides: Record<string, string> = {},
): Promise<ElectronApplication> {
  return electron.launch({
    args: [mainEntry],
    env: launchEnvironment(userDataPath, overrides),
  });
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(path))
    .digest('hex');
}

test('@electron production bundle uses the preload boundary and restores its catalog', async () => {
  const userDataPath = await mkdtemp(join(tmpdir(), 'oriel-electron-e2e-'));
  let application: ElectronApplication | undefined;

  try {
    application = await launchOriel(userDataPath);
    let page = await application.firstWindow();
    await expect(page.getByTestId('try-sample')).toBeVisible();

    const exposedBridge = await page.evaluate(() => ({
      keys: Object.keys(window.oriel ?? {}).sort(),
      platform: window.oriel?.platform,
    }));
    expect(exposedBridge.platform).not.toBe('web');
    expect(exposedBridge.keys).toEqual([
      'chooseExportDirectory',
      'getDiagnostics',
      'importFolder',
      'loadCatalog',
      'openFeedbackIssue',
      'platform',
      'registerCloseHandler',
      'saveCatalog',
      'saveExport',
      'showInFolder',
    ]);

    await page.getByTestId('try-sample').click();
    await page.getByTestId('open-sample').click();
    const first = page.getByTestId('photo-oriel-001');
    await first.click();
    await page.keyboard.press('p');
    await expect
      .poll(async () => {
        try {
          const catalog = JSON.parse(
            await readFile(join(userDataPath, 'catalog-v1.json'), 'utf8'),
          ) as { photos: { id: string; flag: string }[] };
          return catalog.photos.find((photo) => photo.id === 'oriel-001')?.flag ?? null;
        } catch {
          return null;
        }
      })
      .toBe('pick');
    await expect(page.getByText('Saved locally')).toBeVisible();

    await application.close();
    application = undefined;

    const persisted = JSON.parse(
      await readFile(join(userDataPath, 'catalog-v1.json'), 'utf8'),
    ) as {
      onboardingComplete: boolean;
      photos: { id: string; flag: string }[];
    };
    expect(persisted.onboardingComplete).toBe(true);
    expect(persisted.photos.find((photo) => photo.id === 'oriel-001')?.flag).toBe('pick');

    application = await launchOriel(userDataPath);
    page = await application.firstWindow();
    await expect(page.getByRole('grid', { name: 'Photo grid' })).toBeVisible();
    await expect(page.getByTestId('try-sample')).toHaveCount(0);
    await expect(page.getByTestId('photo-oriel-001')).toHaveAttribute('data-flag', 'pick');
  } finally {
    if (application) await application.close();
    await rm(userDataPath, { force: true, recursive: true });
  }
});

test('@electron imports and exports through real main-process file boundaries', async () => {
  const userDataPath = await mkdtemp(join(tmpdir(), 'oriel-native-e2e-'));
  const exportPath = await mkdtemp(join(tmpdir(), 'oriel-export-e2e-'));
  const fixturePath = resolve(desktopRoot, '../../packages/fixtures/assets');
  const originalPath = join(fixturePath, 'photo-10.jpg');
  const originalHash = await sha256(originalPath);
  let application: ElectronApplication | undefined;

  try {
    application = await launchOriel(userDataPath, {
      ORIEL_E2E_EXPORT_PATH: exportPath,
      ORIEL_E2E_IMPORT_PATH: fixturePath,
    });
    const page = await application.firstWindow();
    await page.getByRole('button', { name: 'Open a folder' }).click();
    await expect(page.getByRole('heading', { name: 'Review “assets”' })).toBeVisible();
    await page.getByRole('button', { name: 'Add 12 photos' }).click();
    await expect(page.getByRole('gridcell')).toHaveCount(12);

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.getByRole('button', { name: /Choose a folder/ }).click();
    await page.getByRole('button', { name: 'Export 1' }).click();
    await expect(page.getByRole('heading', { name: 'Delivery ready' })).toBeVisible({
      timeout: 30_000,
    });

    const outputFiles = (await readdir(exportPath)).filter((name) => name.endsWith('.jpg'));
    expect(outputFiles).toHaveLength(1);
    const outputBytes = await readFile(join(exportPath, outputFiles[0]!));
    expect([...outputBytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect((await readdir(exportPath)).some((name) => name.includes('.oriel-partial'))).toBe(
      false,
    );
    expect(await sha256(originalPath)).toBe(originalHash);
  } finally {
    if (application) await application.close();
    await Promise.all([
      rm(userDataPath, { force: true, recursive: true }),
      rm(exportPath, { force: true, recursive: true }),
    ]);
  }
});

test('@electron opens only a privacy-safe Oriel GitHub issue draft', async () => {
  const userDataPath = await mkdtemp(join(tmpdir(), 'oriel-feedback-e2e-'));
  const capturePath = join(userDataPath, 'feedback-url.txt');
  let application: ElectronApplication | undefined;

  try {
    application = await launchOriel(userDataPath, {
      ORIEL_E2E_FEEDBACK_CAPTURE_PATH: capturePath,
    });
    const page = await application.firstWindow();
    await page.getByTestId('try-sample').click();
    await page.getByTestId('open-sample').click();

    await page.keyboard.press('Control+Shift+f');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Feedback on Export' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Export photographs' })).toHaveCount(0);
    await page
      .getByLabel('What should change?')
      .fill('Make the export destination clearer before opening this dialog.');
    await page.getByRole('button', { name: 'Review on GitHub' }).click();

    await expect
      .poll(async () => {
        try {
          return await readFile(capturePath, 'utf8');
        } catch {
          return '';
        }
      })
      .not.toBe('');

    const issueUrl = new URL(await readFile(capturePath, 'utf8'));
    expect(`${issueUrl.origin}${issueUrl.pathname}`).toBe(
      'https://github.com/ralfboltshauser/oriel-photo/issues/new',
    );
    expect(issueUrl.searchParams.get('template')).toBe('interface-feedback.yml');
    expect(issueUrl.searchParams.get('feedback')).toBe(
      'Make the export destination clearer before opening this dialog.',
    );
    expect(issueUrl.searchParams.get('target')).toContain('topbar.export');
    expect(issueUrl.searchParams.get('context')).toContain('Workspace: library');
    expect(decodeURIComponent(issueUrl.toString())).not.toMatch(/ORL_|\/home\/|\.jpg/i);
    await expect(page.getByRole('heading', { name: 'GitHub draft opened' })).toBeVisible();
    await expect(page.getByText(/No issue exists until/)).toBeVisible();
  } finally {
    if (application) await application.close();
    await rm(userDataPath, { force: true, recursive: true });
  }
});
