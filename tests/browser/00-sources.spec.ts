import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { educationalPdf } from '../fixtures/pdf';

for (const width of [375, 768, 1440]) {
  test(`text sources can be read, survive reload, and be deleted at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await page.getByLabel('Access code', { exact: true }).fill('026491');
    await page.getByRole('button', { name: 'Unlock workspace' }).click();
    await page.getByRole('button', { name: 'Add source', exact: true }).click();
    await page.getByRole('tab', { name: 'Paste text' }).click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Save text source' }).click();
    await expect(page.locator('#import-error')).toContainText('Add a title');
    const title = `Closures ${width} <img src=x onerror=alert(1)>`;
    const text =
      'A closure keeps its lexical scope.\n<script>window.untrustedScriptRan = true;</script>\nتوضیح فارسی';
    await page.getByLabel('Source title').fill(title);
    await page.getByLabel('Educational text').fill(text);
    await page.getByRole('button', { name: 'Save text source' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: new RegExp(`Closures ${width}`) }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole('button', { name: new RegExp(`Closures ${width}`) })
      .click();
    await expect(page.locator('#preview-title')).toHaveText(title);
    await expect(page.locator('.source-page p')).toHaveText(text);
    expect(await page.evaluate(() => 'untrustedScriptRan' in window)).toBe(
      false,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/source-preview-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Delete source', exact: true })
      .click();
    await page.getByRole('button', { name: 'Keep source' }).click();
    await expect(page.locator('#source-preview')).toBeVisible();
    await page
      .getByRole('button', { name: 'Delete source', exact: true })
      .click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(page.locator('#source-preview')).not.toBeVisible();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Add source', exact: true }),
    ).toBeFocused();
  });
}

test('imports a real PDF with page references, handles invalid input, and exposes loading states', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Access code', { exact: true }).fill('026491');
  await page.getByRole('button', { name: 'Unlock workspace' }).click();
  await page.getByRole('button', { name: 'Add source', exact: true }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Save PDF source' }).click();
  await expect(page.locator('#import-error')).toContainText('Choose a PDF');
  await page.getByLabel('Text-based PDF').setInputFiles({
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\ninvalid'),
  });
  await page.getByRole('button', { name: 'Save PDF source' }).click();
  await expect(page.locator('#import-error')).toContainText(
    'could not be read',
  );
  await page.getByLabel('Text-based PDF').setInputFiles({
    name: 'Learning closures.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await educationalPdf()),
  });
  await page.getByRole('button', { name: 'Save PDF source' }).click();
  await expect(page.locator('#import-status')).toContainText('Saving');
  await page.getByRole('button', { name: /Learning closures/ }).click();
  await expect(page.getByRole('heading', { name: 'Page 1' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page 2' })).toBeVisible();
  await expect(page.locator('.source-page').nth(1)).toContainText(
    'Functions can return other functions.',
  );
  await page.getByRole('button', { name: 'Close source preview' }).click();
  await page.screenshot({
    path: 'test-results/source-library-1440.png',
    fullPage: true,
  });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: /Learning closures/ }).click();
  await page
    .getByRole('button', { name: 'Delete source', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
});
