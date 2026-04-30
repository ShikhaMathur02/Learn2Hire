// @ts-check
const { defineConfig } = require('@playwright/test');
const path = require('path');

/** Base URL for the Vite app (must proxy /api to the backend). */
/** Default `localhost` (not `127.0.0.1`) — on Windows, Vite may only accept the hostname. */
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

module.exports = defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    screenshot: 'off',
    video: 'off',
    trace: 'off',
  },
});
