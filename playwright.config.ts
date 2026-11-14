import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.EARTHBEAT_URL ?? 'http://localhost:5183/',
    ...devices['Desktop Chrome'],
    // Installed Google Chrome: Playwright's bundled Chromium cannot decode H.264.
    channel: 'chrome',
    viewport: { width: 1440, height: 900 },
  },
  webServer: process.env.EARTHBEAT_URL
    ? undefined
    : { command: 'npx vite preview --port 5183 --strictPort', port: 5183, reuseExistingServer: true },
});
