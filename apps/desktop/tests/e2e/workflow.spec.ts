import { expect, test, type Download } from '@playwright/test';

import { openFreshOnboarding, openSampleLibrary } from './support/app';

async function readJpegSignature(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  if (!stream) throw new Error(`Could not read ${download.suggestedFilename()}`);
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<string | Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).subarray(0, 3).toString('hex');
}

test.describe('local photo workflow', () => {
  test('onboards with a truthful local-first contract', async ({ page }) => {
    await openFreshOnboarding(page);

    await expect(page.getByText('Original files are never changed')).toBeVisible();
    await expect(page.getByText('Works entirely offline')).toBeVisible();
    await expect(page.getByText('Every edit is reversible')).toBeVisible();
    await expect(page.getByText(/RAW support is not claimed yet/)).toBeVisible();

    await page.getByTestId('try-sample').click();
    await expect(page.getByText('Pick', { exact: true })).toBeVisible();
    await expect(page.getByText('Find anything', { exact: true })).toBeVisible();
    await page.getByTestId('open-sample').click();

    await expect(page.getByRole('gridcell')).toHaveCount(12);
    await expect(page.getByText('Originals are referenced in place.')).toBeVisible();
    await expect(page.getByText('Not a backup')).toBeVisible();
  });

  test('culls, edits, compares, versions, copies, and undoes from the keyboard', async ({
    page,
  }) => {
    await openSampleLibrary(page);
    const first = page.getByTestId('photo-oriel-001');
    const second = page.getByTestId('photo-oriel-002');

    await first.click();
    await page.keyboard.press('p');
    await expect(first).toHaveAttribute('data-flag', 'pick');

    await page.keyboard.press('Shift+x');
    await expect(first).toHaveAttribute('data-flag', 'reject');
    await expect(second).toHaveAttribute('data-selected', 'true');

    await page.keyboard.press('4');
    await expect(second.getByLabel('4 stars')).toBeVisible();

    await page.keyboard.press('d');
    await expect(page.getByText('Editing', { exact: true })).toBeVisible();
    const exposure = page.getByLabel('Exposure value');
    await exposure.fill('1.25');
    await exposure.press('Enter');
    await expect(exposure).toHaveValue('+1.25');

    await page.getByRole('button', { name: 'Show full light controls' }).click();
    await expect(page.getByLabel('Whites value')).toBeVisible();

    await page.keyboard.press('Control+k');
    const commandInput = page.getByPlaceholder('Find a tool or action…');
    await commandInput.fill('virtual copy');
    await page.getByText('Create version', { exact: true }).click();
    await expect(page.getByLabel('Active version').locator('option')).toHaveCount(2);
    await expect(page.getByLabel('Active version')).toContainText('Version 2');

    await page.keyboard.press('\\');
    await expect(page.locator('.original-indicator')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.original-indicator')).toBeHidden();

    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.getByRole('option', { name: 'ORL_1042.jpg' }).click();
    await expect(page.getByLabel('Exposure value')).toHaveValue('0.00');
    await page.getByRole('button', { name: 'Paste', exact: true }).click();
    await expect(page.getByLabel('Exposure value')).toHaveValue('+1.25');

    await page.keyboard.press('Control+z');
    await expect(page.getByLabel('Exposure value')).toHaveValue('0.00');

    await page.locator('.photo-stage').click({ position: { x: 20, y: 20 } });
    await page.keyboard.press('Tab');
    await expect(page.locator('.develop-inspector')).toBeHidden();
    await page.keyboard.press('Tab');
    await expect(page.locator('.develop-inspector')).toBeVisible();
  });

  test('persists the local catalog across a renderer restart', async ({ page }) => {
    await openSampleLibrary(page);
    const first = page.getByTestId('photo-oriel-001');

    await first.click();
    await page.keyboard.press('p');
    await expect
      .poll(() =>
        page.evaluate(() => {
          const value = localStorage.getItem('oriel-browser-catalog-v1');
          if (!value) return null;
          const catalog = JSON.parse(value) as { photos: { id: string; flag: string }[] };
          return catalog.photos.find((photo) => photo.id === 'oriel-001')?.flag ?? null;
        }),
      )
      .toBe('pick');
    await expect(page.getByText('Saved locally')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('grid', { name: 'Photo grid' })).toBeVisible();
    await expect(page.getByTestId('photo-oriel-001')).toHaveAttribute('data-flag', 'pick');
    await expect(page.getByTestId('try-sample')).toHaveCount(0);
  });

  test('renders the delivery set and exports real JPEG downloads', async ({ page }) => {
    await openSampleLibrary(page);
    const downloads: Download[] = [];
    page.on('download', (download) => downloads.push(download));

    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Export photographs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Picks · 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('button', { name: 'Export 2' })).toBeDisabled();

    await page.getByRole('button', { name: /Choose a folder/ }).click();
    await expect(page.getByRole('button', { name: /Downloads/ })).toBeVisible();
    await page.getByRole('button', { name: 'Export 2' }).click();

    await expect(page.getByRole('heading', { name: 'Delivery ready' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('2 finished photographs')).toBeVisible();
    await expect.poll(() => downloads.length).toBe(2);
    expect(downloads.map((download) => download.suggestedFilename()).sort()).toEqual([
      'ORL_1051.jpg',
      'ORL_1216.jpg',
    ]);
    expect(await Promise.all(downloads.map(readJpegSignature))).toEqual(['ffd8ff', 'ffd8ff']);
    await expect(page.getByText('Originals').last()).toBeVisible();
    await expect(page.getByText('Untouched')).toBeVisible();
  });
});

test.describe('interface feedback', () => {
  test('captures a safe target and opens a truthful prefilled GitHub draft', async ({
    context,
    page,
  }) => {
    await context.route('https://github.com/**', async (route) => {
      await route.fulfill({
        body: '<!doctype html><title>GitHub issue draft</title>',
        contentType: 'text/html',
        status: 200,
      });
    });
    await openSampleLibrary(page);

    const exportButton = page.locator('[data-feedback="topbar.export"]');
    await page.keyboard.press('Control+Shift+f');
    await expect(page.getByRole('status')).toContainText('Feedback mode');

    await exportButton.hover();
    await expect(page.locator('.feedback-highlight span')).toHaveText('Export');
    await exportButton.click();

    const composer = page.getByRole('dialog', { name: 'Feedback on Export' });
    await expect(composer).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Export photographs' })).toHaveCount(0);

    const note = 'Keep this action visible while I compare several photographs.';
    await composer.getByLabel('What should change?').fill(note);
    await composer.getByText('Review captured context').click();

    const capturedContext = composer.locator('.feedback-context pre');
    await expect(capturedContext).toContainText('Semantic ID: topbar.export');
    await expect(capturedContext).toContainText('Workspace: library');
    await expect(capturedContext).toContainText(
      'Privacy: no photo, filename, path, EXIF, catalog content, or screenshot is attached.',
    );
    await expect(capturedContext).not.toContainText('ORL_');
    await expect(capturedContext).not.toContainText('Alpine weekend');

    const popupPromise = page.waitForEvent('popup');
    await composer.getByRole('button', { name: 'Review on GitHub' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');

    const issueUrl = new URL(popup.url());
    expect(issueUrl.origin).toBe('https://github.com');
    expect(issueUrl.pathname).toBe('/ralfboltshauser/oriel-photo/issues/new');
    expect(issueUrl.searchParams.get('template')).toBe('interface-feedback.yml');
    expect(issueUrl.searchParams.get('title')).toBe('[Interface feedback] Export');
    expect(issueUrl.searchParams.get('feedback')).toBe(note);
    expect(issueUrl.searchParams.get('target')).toContain('Semantic ID: topbar.export');
    expect(issueUrl.searchParams.get('context')).toContain('Workspace: library');
    expect(
      `${issueUrl.searchParams.get('target')}\n${issueUrl.searchParams.get('context')}`,
    ).not.toMatch(/ORL_|Alpine weekend/);

    const confirmation = page.getByRole('dialog', { name: 'GitHub draft opened' });
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText(
      'No issue exists until you press “Submit new issue.”',
    );

    await popup.close();
    await confirmation.getByRole('button', { name: 'Exit feedback' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('supports keyboard target selection and command palette discovery', async ({ page }) => {
    await openSampleLibrary(page);

    await page.keyboard.press('Control+Shift+f');
    await page.keyboard.press('Tab');
    await expect(page.locator('.feedback-highlight span')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.feedback-highlight span')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('.feedback-composer')).toBeVisible();
    await expect(page.locator('.feedback-target-card strong')).not.toBeEmpty();

    await page.keyboard.press('Escape');
    await expect(page.locator('.feedback-composer')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Point at anything');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('status')).toHaveCount(0);

    await page.keyboard.press('Control+k');
    const commandInput = page.getByPlaceholder('Find a tool or action…');
    await commandInput.fill('interface feedback');
    await page.getByText('Give interface feedback', { exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Feedback mode');
    await page.getByRole('button', { name: 'Exit feedback mode' }).click();
    await expect(page.getByRole('status')).toHaveCount(0);
  });
});
