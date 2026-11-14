/**
 * Captures application screenshots from the production build with installed Google Chrome.
 * Usage: node scripts/screenshots.mjs [baseURL] [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] ?? 'http://localhost:5183/';
const out = process.argv[3] ?? 'docs/screenshots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--autoplay-policy=no-user-gesture-required'] });

async function shot(name, { width, height, url = base, setup, full = false, selector }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto(url);
  await page.locator('.status-pill').filter({ hasText: 'Ready' }).waitFor({ timeout: 30000 });
  if (setup) await setup(page);
  if (selector) await page.addStyleTag({ content: '.site-header{position:static!important}' });
  const target = selector ? page.locator(selector) : page;
  await target.screenshot({ path: `${out}/${name}.png`, fullPage: full, animations: 'disabled' });
  console.log('saved', name);
  await page.close();
}

const playAt = (t, secs = 5) => async (page) => {
  await page.locator('input[type=range][aria-valuetext]').first().fill(String(t));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(secs * 1000);
  await page.getByRole('button', { name: 'Pause' }).click();
  await page.waitForTimeout(300);
};

await shot('01-hero-desktop', { width: 1440, height: 900 });
await shot('02-listening-room-desktop', { width: 1440, height: 900, setup: playAt(93, 6), selector: '#experience' });
await shot('03-legend-live', { width: 1440, height: 900, setup: playAt(93, 6), selector: '.panel-col' });
await shot('04-methodology', { width: 1440, height: 900, selector: '#method' });
await shot('05-accessibility', { width: 1440, height: 900, selector: '#accessibility' });
await shot('06-mobile-listening', { width: 360, height: 800, setup: async (p) => { await playAt(156, 4)(p); await p.locator('#experience').scrollIntoViewIfNeeded(); }, selector: '.player-col' });
await shot('07-high-contrast', { width: 1440, height: 900, setup: async (p) => { await p.getByRole('checkbox', { name: 'High contrast' }).check(); await playAt(156, 4)(p); }, selector: '#experience' });
await shot('08-sources', { width: 1440, height: 900, selector: '#sources' });
await shot('09-debug-overlay', { width: 1440, height: 900, url: base + '?debug', setup: playAt(100, 3), selector: '.video-frame' });
await browser.close();
