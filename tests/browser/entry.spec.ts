import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [375, 768, 1440]) {
  test(`owner can unlock, reload, and lock at ${width}px without layout or accessibility violations`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.getByLabel('Access code', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(async () => {
      await Promise.all(
        document.getAnimations().map((animation) => animation.finished),
      );
    });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/login-${width}.png`,
      fullPage: true,
    });
    await page.getByLabel('Access code', { exact: true }).fill('026491');
    await page.getByRole('button', { name: 'Unlock workspace' }).click();
    await expect(
      page.getByRole('heading', { name: /Room for your next/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add your first source' }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `test-results/workspace-${width}.png`,
      fullPage: true,
    });
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Lock workspace' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Lock workspace' }).click();
    await expect(page.getByLabel('Access code', { exact: true })).toBeFocused();
    await page.reload();
    await expect(
      page.getByRole('button', { name: 'Unlock workspace' }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('keyboard navigation, input validation, help dialog, and reduced motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const code = page.getByLabel('Access code', { exact: true });
  await code.fill('12');
  await code.press('Enter');
  await expect(page.getByRole('alert')).toHaveText(
    'Enter your six-digit access code.',
  );
  await expect(code).toBeFocused();
  await code.fill('999999');
  await code.press('Enter');
  await expect(page.getByRole('alert')).toHaveText(
    'That code is not correct. Please try again.',
  );
  await expect(code).toHaveValue('');
  await page.getByRole('button', { name: 'Where do I find my code?' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Where do I find my code?' }),
  ).toBeFocused();
  expect(
    await page
      .locator('.entry-card')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});

test('shows pending and network failure states without losing the ability to retry', async ({
  page,
}) => {
  await page.goto('/');
  await page.route('**/api/auth/login', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.abort('failed');
  });
  await page.getByLabel('Access code', { exact: true }).fill('026491');
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await expect(page.getByRole('button', { name: 'Unlocking…' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText(
    'Connection interrupted.',
  );
  await expect(
    page.getByRole('button', { name: 'Unlock workspace' }),
  ).toBeEnabled();
});

test('removes the private shell when server access is invalidated', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByLabel('Access code', { exact: true }).fill('026491');
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await expect(
    page.getByRole('button', { name: 'Lock workspace' }),
  ).toBeVisible();
  const invalidation = await page.request.post('/api/auth/logout', {
    headers: { origin: 'http://localhost:4173' },
    data: {},
  });
  expect(invalidation.ok()).toBe(true);
  await page.clock.fastForward(60_001);
  await expect(page.getByRole('alert')).toHaveText(
    'Your session has ended. Unlock your workspace again.',
  );
});

test('throttling is explained accessibly and the unlock action is temporarily disabled', async ({
  page,
}) => {
  await page.goto('/');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByLabel('Access code', { exact: true }).fill('999999');
    await page.getByRole('button', { name: 'Unlock workspace' }).click();
    await expect(page.getByLabel('Access code', { exact: true })).toHaveValue(
      '',
    );
  }
  await page.getByLabel('Access code', { exact: true }).fill('026491');
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await expect(page.getByRole('alert')).toContainText('Too many attempts.');
  await expect(
    page.getByRole('button', { name: 'Unlock workspace' }),
  ).toBeDisabled();
});
