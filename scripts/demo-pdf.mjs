/**
 * Renders the seven-slide demo to PDF and per-slide PNGs with installed Google Chrome.
 * Usage: node scripts/demo-pdf.mjs [demoURL] [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5183/demo/';
const out = process.argv[3] ?? 'docs/demo';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: `${out}/EarthBeat-demo-7-slides.pdf`, width: '1600px', height: '900px', printBackground: true });
const n = await page.locator('section.slide').count();
for (let i = 0; i < n; i++) {
  await page.locator('section.slide').nth(i).screenshot({ path: `${out}/slide-${i + 1}.png` });
}
console.log(`slides: ${n}`);
await browser.close();
