import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { LAB_CONTEXT } from './e2e/helpers/enterprise-task-observation';

const output = process.env.E2E_ENTERPRISE_LAB_OUTPUT_DIR;
if (!output || !process.env.E2E_ENTERPRISE_LAB_RECEIPT) {
  throw new Error('Enterprise task lab requires the owned runtime output and build receipt.');
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/fixtures/global-setup.ts',
  globalTeardown: './e2e/scripts/cleanup-db.ts',
  timeout: 300_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'html',
  outputDir: resolve(__dirname, '..', output, 'trace'),
  use: {
    baseURL: process.env.NEXT_PUBLIC_WEB_URL,
    actionTimeout: 20_000,
    ...LAB_CONTEXT,
    // Traces/video/DOM screenshots would include authentication and synthetic user values.
    trace: 'off', video: 'off', screenshot: 'off',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'full-suite', testMatch: /enterprise-task-lab\/enterprise-task-quality\.spec\.ts/,
      use: { browserName: 'chromium', ...LAB_CONTEXT }, dependencies: ['setup'] },
  ],
});
