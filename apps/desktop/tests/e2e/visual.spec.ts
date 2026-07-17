import { expect, test } from '@playwright/test';

import { openFreshOnboarding, waitForVisualReady } from './support/app';

test('@visual captures the critical product surfaces', async ({ page }) => {
  await openFreshOnboarding(page);
  await waitForVisualReady(page);
  await expect(page).toHaveScreenshot('01-onboarding-welcome.png');

  await page.getByTestId('try-sample').click();
  await expect(
    page.getByRole('heading', { name: 'Your hands already know it.' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('02-onboarding-shortcuts.png');

  await page.getByTestId('open-sample').click();
  await expect(page.getByRole('gridcell')).toHaveCount(12);
  await expect(page.getByText('Saved locally')).toBeVisible();
  await waitForVisualReady(page);
  await expect(page).toHaveScreenshot('03-library.png');

  await page.keyboard.press('d');
  await expect(page.getByRole('img', { name: /Edited ORL_1042\.jpg/ })).toBeVisible();
  await expect(page.locator('.canvas-status')).toHaveCount(0);
  await waitForVisualReady(page);
  await expect(page).toHaveScreenshot('04-edit.png');

  await page.keyboard.press('Control+k');
  await expect(page.getByPlaceholder('Find a tool or action…')).toBeVisible();
  await expect(page).toHaveScreenshot('05-command-palette.png');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Export photographs' })).toBeVisible();
  await expect(page).toHaveScreenshot('06-export.png');
  await page.getByRole('button', { name: 'Close export' }).click();

  await page.setViewportSize({ width: 1100, height: 740 });
  await waitForVisualReady(page);
  await expect(page).toHaveScreenshot('07-edit-compact.png');
});
