import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/** Smoke tests against the production build (vite preview) or a deployed URL (EARTHBEAT_URL). */

const errors: string[] = [];
function watchConsole(page: Page) {
  errors.length = 0;
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
}

async function waitReady(page: Page) {
  await expect(page.locator('.status-pill')).toContainText('Ready', { timeout: 30_000 });
}

test('first visit: loads, ready state, no console errors', async ({ page }) => {
  watchConsole(page);
  await page.goto('./');
  await expect(page).toHaveTitle(/EarthBeat/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Earth data should not be seen only.');
  await waitReady(page);
  expect(errors).toEqual([]);
});

test('play with sound, NASA frames drive features, pause/seek/resume/stop leave no errors', async ({ page }) => {
  watchConsole(page);
  await page.goto('./');
  await waitReady(page);
  const controls = page.getByRole('group', { name: 'Playback and sound controls' });
  await page.locator('input[type=range][aria-valuetext]').first().fill('94');
  await controls.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('.status-pill')).toHaveText(/Playing with sound/, { timeout: 15_000 });
  await page.waitForTimeout(4500);
  const t1 = await page.evaluate(() => document.querySelector('video')!.currentTime);
  expect(t1).toBeGreaterThan(95);
  const coverage = await page.locator('.legend-row').nth(2).locator('.readout').innerText();
  expect(parseInt(coverage.replace(/\D/g, ''), 10)).toBeGreaterThan(10);
  await expect(page.locator('.now-summary')).toContainText(/activity/i);

  for (let i = 0; i < 4; i++) {
    await controls.getByRole('button', { name: 'Pause' }).click();
    await expect(page.locator('.status-pill')).toHaveText(/Paused/);
    await controls.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('.status-pill')).toHaveText(/Playing/);
  }
  await page.locator('input[type=range][aria-valuetext]').first().fill('150');
  await page.waitForTimeout(1500);
  await expect(page.locator('.status-pill')).toHaveText(/Playing/);
  await page.keyboard.press('Escape');
  await expect(page.locator('.status-pill')).toHaveText(/Paused/);
  await expect(page.getByText('Sound stopped and playback paused.')).toBeAttached();
  await controls.getByRole('button', { name: 'Restart' }).click();
  await expect.poll(() => page.evaluate(() => document.querySelector('video')!.currentTime)).toBeLessThan(1);
  expect(errors).toEqual([]);
});

test('browser analysis matches the offline FFmpeg profile at sample times', async ({ page }) => {
  const csv = readFileSync(new URL('../docs/validation/profile-full.csv', import.meta.url), 'utf8').trim().split('\n');
  const head = csv[0].split(',');
  const rows = csv.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [head[i], Number(v)])));
  await page.goto('./?debug');
  await waitReady(page);
  const results: string[] = [];
  for (const t of [30, 60, 95, 110, 145, 160, 205]) {
    await page.evaluate((tt) => {
      const v = document.querySelector('video')!;
      v.currentTime = tt;
    }, t);
    await page.waitForFunction((tt) => Math.abs(document.querySelector('video')!.currentTime - tt) < 0.01 && !document.querySelector('video')!.seeking, t);
    await page.waitForTimeout(400);
    const text = await page.locator('.debug pre').innerText();
    const raw = Number(/rawRatio\s+([\d.]+)/.exec(text)![1]);
    const ref = rows.find((r) => Math.abs(r.t - t) < 0.05)!.rawRatio;
    results.push(`t=${t}s browser=${raw.toFixed(4)} offline=${ref.toFixed(4)}`);
    expect(Math.abs(raw - ref)).toBeLessThan(Math.max(0.004, ref * 0.35));
  }
  console.log('PARITY ' + results.join(' | '));
});

test('keyboard: skip link first, controls reachable', async ({ page }) => {
  await page.goto('./');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to the listening room' })).toBeFocused();
  let found = false;
  for (let i = 0; i < 40 && !found; i++) {
    await page.keyboard.press('Tab');
    found = await page.evaluate(() => document.activeElement?.textContent?.trim() === 'Play');
  }
  expect(found).toBe(true);
});

for (const [w, h, name] of [
  [360, 800, 'mobile'],
  [768, 1024, 'tablet'],
  [1440, 900, 'desktop'],
] as const) {
  test(`no horizontal overflow at ${name} ${w}x${h}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('./');
    await waitReady(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('200% zoom equivalent (720px CSS width) keeps controls usable', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 450 });
  await page.goto('./');
  await waitReady(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('reduced-motion system preference is honored', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(test.info().project.use.baseURL!);
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.motion)).toBe('reduce');
  const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.wave i')!).animationName);
  expect(anim).toBe('none');
  await ctx.close();
});

test('video failure shows a readable error with recovery', async ({ page }) => {
  await page.route('**/media/iss-lightning-web.mp4', (r) => r.abort());
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('could not be loaded');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('slow network: loading state then ready', async ({ page }) => {
  await page.route('**/media/iss-lightning-web.mp4', async (r) => {
    await new Promise((res) => setTimeout(res, 2500));
    await r.continue();
  });
  await page.goto('./');
  await expect(page.locator('.status-pill')).toContainText('Loading');
  await waitReady(page);
});
