import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Automated accessibility scan (axe-core, WCAG 2.0/2.1/2.2 A and AA rules). Not a substitute for manual testing. */
for (const [label, setup] of [
  ['default theme', async () => {}],
  ['high contrast', async (page: import('@playwright/test').Page) => page.getByRole('checkbox', { name: 'High contrast' }).check()],
] as const) {
  test(`axe: no WCAG A/AA violations (${label})`, async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('.status-pill')).toContainText('Ready', { timeout: 30_000 });
    await setup(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    console.log(`AXE ${label}: ${results.passes.length} rules passed, ${results.violations.length} violations, ${results.incomplete.length} need review`);
    if (summary.length) console.log(summary.join('\n'));
    console.log('REVIEW ' + results.incomplete.map((v) => `${v.id}: ${v.nodes.length} — ${v.nodes.slice(0, 4).map((n) => n.target.join(' ')).join(' | ')}`).join(' ; '));
    expect(results.violations).toEqual([]);
  });
}
