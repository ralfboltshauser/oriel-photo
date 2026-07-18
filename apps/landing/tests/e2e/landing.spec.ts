import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openLanding(page: Page): Promise<void> {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  expect(errors, 'landing page console and runtime errors').toEqual([]);
}

test('communicates the complete local workflow', async ({ page }) => {
  await openLanding(page);

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#workflow')).toBeVisible();

  for (const stage of ['Library', 'Select', 'Edit', 'Deliver']) {
    const stageId = stage.toLowerCase();
    const step = page
      .locator(`[data-workflow-step][data-stage="${stageId}"], #workflow :is(article, li)`)
      .filter({ hasText: stage })
      .first();
    await expect(step).toBeVisible();
  }

  const sourceLink = page.getByRole('link', { name: /source|github/i }).last();
  await expect(sourceLink).toHaveAttribute(
    'href',
    'https://github.com/ralfboltshauser/oriel-photo',
  );
});

test('fits the viewport without horizontal page overflow', async ({ page }) => {
  await openLanding(page);

  await expect
    .poll(() =>
      page.evaluate(() => ({
        body: document.body.scrollWidth - document.body.clientWidth,
        document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      })),
    )
    .toEqual({ body: 0, document: 0 });
});

test('keeps an interactive comparison keyboard reachable when present', async ({ page }) => {
  await openLanding(page);

  const comparison = page
    .locator('[data-comparison-control], input[type="range"]')
    .filter({ visible: true })
    .first();

  if ((await comparison.count()) === 0) return;

  await comparison.focus();
  await expect(comparison).toBeFocused();
  await expect(comparison).toBeEnabled();

  const role = await comparison.getAttribute('role');
  const type = await comparison.getAttribute('type');
  if (role === 'slider' || type === 'range') {
    const valueBefore = await comparison.inputValue();
    await page.keyboard.press('ArrowLeft');
    const valueAfter = await comparison.inputValue();
    expect(valueAfter).not.toBe(valueBefore);
  }
});

test('maps fine-pointer and scroll input to visible product feedback', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await openLanding(page);

  const pointerStage = page.locator('[data-pointer-stage]');
  const tilt = pointerStage.locator('[data-tilt]');
  const bounds = await pointerStage.boundingBox();
  expect(bounds).not.toBeNull();
  if (!bounds) return;

  await page.mouse.move(bounds.x + bounds.width * 0.78, bounds.y + bounds.height * 0.24);
  await expect
    .poll(() => tilt.evaluate((element) => element.style.getPropertyValue('--tilt-y')))
    .not.toBe('');
  await expect(pointerStage).not.toHaveCSS('cursor', 'none');

  const selectStep = page.locator('[data-workflow-step][data-stage="select"]');
  await selectStep.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect(selectStep).toHaveAttribute('data-active', 'true');
  await expect(page.locator('[data-workflow-frame][data-stage="select"]')).toHaveAttribute(
    'aria-hidden',
    'false',
  );
});

test('keeps the complete story available without client JavaScript', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4323',
    colorScheme: 'dark',
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'One shoot. Four rooms.' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Not a clone. A smaller contract.' }),
  ).toBeVisible();

  await context.close();
});

test('honors the reduced-motion preference', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'reduced-motion');
  await openLanding(page);

  await expect
    .poll(() =>
      page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
  ).toBe('auto');

  const spatialMotion = await page
    .locator('[data-motion], [data-motion] *')
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const style = getComputedStyle(element);
        const seconds = (value: string): number =>
          value.endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
        const transitionProperties = style.transitionProperty
          .split(',')
          .map((value) => value.trim());
        const hasActiveTransition = style.transitionDuration
          .split(',')
          .some((duration) => seconds(duration) > 0.01);
        const hasTransformTransition =
          hasActiveTransition &&
          (transitionProperties.includes('all') || transitionProperties.includes('transform'));
        const hasNamedAnimation =
          style.animationDuration.split(',').some((duration) => seconds(duration) > 0.01) &&
          style.animationName.split(',').some((name) => name.trim() !== 'none');

        return hasTransformTransition || hasNamedAnimation
          ? [
              {
                animationName: style.animationName,
                element: element.getAttribute('data-motion'),
                transitionProperty: style.transitionProperty,
              },
            ]
          : [];
      }),
    );
  expect(spatialMotion, 'spatial motion remains active in reduced-motion mode').toEqual([]);
});

test('@a11y has no automated WCAG A or AA violations', async ({ page }) => {
  await openLanding(page);

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

  expect(summary, 'landing page accessibility violations').toEqual([]);
});
