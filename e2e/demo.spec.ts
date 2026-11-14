import { expect, test } from '@playwright/test';

test('demo deck has exactly seven slides, all images load, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('./demo/');
  await expect(page.locator('section.slide')).toHaveCount(7);
  await expect(page.locator('.num').last()).toHaveText('7 / 7');
  const broken = await page.evaluate(async () => {
    const imgs = [...document.images];
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
    return imgs.filter((i) => !i.naturalWidth || !i.alt).map((i) => i.src);
  });
  expect(broken).toEqual([]);
  await page.keyboard.press('ArrowRight');
  expect(errors).toEqual([]);
});
