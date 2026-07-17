import { expect, type Page } from '@playwright/test';

export async function openFreshOnboarding(page: Page): Promise<void> {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Make the image\. Keep everything\./ }),
  ).toBeVisible();
}

export async function openSampleLibrary(page: Page): Promise<void> {
  await openFreshOnboarding(page);
  await page.getByTestId('try-sample').click();
  await expect(
    page.getByRole('heading', { name: 'Your hands already know it.' }),
  ).toBeVisible();
  await page.getByTestId('open-sample').click();
  await expect(page.getByRole('grid', { name: 'Photo grid' })).toBeVisible();
  await expect(page.getByRole('gridcell')).toHaveCount(12);
  await expect(page.getByText('Alpine weekend', { exact: true }).first()).toBeVisible();
  await waitForVisualReady(page);
}

export async function waitForVisualReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(
      images.map(async (image) => {
        if (image.complete) return;
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }),
    );
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
}
