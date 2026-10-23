import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const [topic, sourceText, goal] of [
  [
    'Closures',
    'A closure retains lexical scope.',
    'Use a closure in a callback',
  ],
  [
    'Simple interest',
    'Simple interest is principal multiplied by annual rate and years.',
    'Calculate interest on my savings',
  ],
] as const) {
  test(`learns ${topic} through an explanation, simpler example, exercise and feedback`, async ({
    page,
  }) => {
    await page.setViewportSize({
      width: topic === 'Closures' ? 375 : 1440,
      height: 1000,
    });
    await page.goto('/');
    await page.getByLabel('Access code', { exact: true }).fill('026491');
    await page.getByRole('button', { name: 'Unlock workspace' }).click();
    await page.getByRole('button', { name: 'Add source', exact: true }).click();
    await page.getByRole('tab', { name: 'Paste text' }).click();
    await page.getByLabel('Source title').fill(`Teaching: ${topic}`);
    await page.getByLabel('Educational text').fill(sourceText);
    await page.getByRole('button', { name: 'Save text source' }).click();
    await page
      .getByRole('button', { name: new RegExp(`Teaching: ${topic}`) })
      .click();
    await page.getByRole('button', { name: 'Ask about this source' }).click();
    await page.getByText('Learning preferences', { exact: true }).click();
    await page.getByLabel('Learning goal').fill(goal);
    await page.getByLabel('Familiarity').selectOption('beginner');
    await page.getByText('Learning preferences', { exact: true }).click();
    await page.getByLabel('I agree to send').check();
    await page.getByLabel('Your question').fill('لطفاً قدم به قدم توضیح بده');
    await page.getByRole('button', { name: 'Send question' }).click();
    await expect(page.locator('.message-assistant').last()).toContainText(
      'بر اساس منبع',
    );
    await expect(
      page
        .locator('.message-assistant')
        .last()
        .locator('bdi')
        .filter({ hasText: '[page 1]' }),
    ).toHaveText('[page 1]');
    await expect(
      page.locator('.message-assistant').last().locator('bdi').first(),
    ).toHaveAttribute('dir', 'ltr');
    if (topic === 'Closures') {
      await expect(
        page
          .locator('.message-assistant bdi')
          .filter({ hasText: 'https://example.com/learn' }),
      ).toHaveAttribute('dir', 'ltr');
      await expect(
        page
          .locator('.message-assistant .inline-code')
          .filter({ hasText: 'lexical scope' }),
      ).toBeVisible();
    }
    await page.getByLabel('Response mode').selectOption('simplify');
    await page.getByRole('button', { name: 'Explain more simply' }).click();
    await expect(page.locator('.message-assistant').last()).toContainText(
      'تشبیه',
    );
    await page.getByLabel('Response mode').selectOption('practice');
    await page.getByRole('button', { name: 'Give me an exercise' }).click();
    await expect(page.locator('.message-assistant').last()).toContainText(
      'تمرین',
    );
    await page.getByLabel('Response mode').selectOption('feedback');
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(page.locator('#chat-error')).toContainText('attempt');
    await page
      .getByLabel('Your question')
      .fill(
        topic === 'Closures'
          ? 'متغیر محلی تابع را نگه می‌دارد.'
          : 'برای ۱۰۰۰ با نرخ ۵ درصد در دو سال، ۱۰۰ سود می‌شود.',
      );
    await page.getByRole('button', { name: 'Check my answer' }).click();
    await expect(page.locator('.message-assistant').last()).toContainText(
      'بازخورد',
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/teaching-${topic.replaceAll(' ', '-')}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Close conversation' }).click();
    await page
      .getByRole('button', { name: new RegExp(`Teaching: ${topic}`) })
      .click();
    await page
      .getByRole('button', { name: 'Delete source', exact: true })
      .click();
    await page.getByRole('button', { name: 'Delete permanently' }).click();
    await expect(page.locator('#source-preview')).not.toBeVisible();
  });
}
