import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { openFreshOnboarding, openSampleLibrary, waitForVisualReady } from './support/app';

async function expectNoA11yViolations(page: Page, surface: string): Promise<void> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const summary = result.violations.map(({ help, id, impact, nodes }) => ({
    help,
    id,
    impact,
    occurrences: nodes.length,
    targets: nodes.slice(0, 3).map((node) => node.target),
  }));
  expect(summary, `${surface} accessibility violations`).toEqual([]);
}

test('@a11y welcome and shortcut onboarding pass automated WCAG checks', async ({ page }) => {
  await openFreshOnboarding(page);
  await expectNoA11yViolations(page, 'Welcome onboarding');

  await page.getByTestId('try-sample').click();
  await expectNoA11yViolations(page, 'Shortcut onboarding');
});

test('@a11y library grid passes automated WCAG checks', async ({ page }) => {
  await openSampleLibrary(page);
  await expectNoA11yViolations(page, 'Library grid');
});

test('@a11y photo editor passes automated WCAG checks', async ({ page }) => {
  await openSampleLibrary(page);
  await page.keyboard.press('d');
  await expect(page.locator('.develop-inspector')).toBeVisible();
  await expect(page.locator('.canvas-status')).toHaveCount(0);
  await waitForVisualReady(page);
  await expectNoA11yViolations(page, 'Photo editor');
});

test('@a11y command palette passes automated WCAG checks', async ({ page }) => {
  await openSampleLibrary(page);
  await page.keyboard.press('Control+k');
  await expect(page.getByPlaceholder('Find a tool or action…')).toBeVisible();
  await expectNoA11yViolations(page, 'Command palette');
});

test('@a11y export dialog passes automated WCAG checks', async ({ page }) => {
  await openSampleLibrary(page);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Export photographs' })).toBeVisible();
  await expectNoA11yViolations(page, 'Export dialog');
});

test('@a11y feedback composer passes automated WCAG checks', async ({ page }) => {
  await openSampleLibrary(page);
  await page.keyboard.press('Control+Shift+f');
  await page.locator('[data-feedback="topbar.export"]').click();
  await expect(page.getByRole('dialog', { name: 'Feedback on Export' })).toBeVisible();
  await expectNoA11yViolations(page, 'Feedback composer');
});
