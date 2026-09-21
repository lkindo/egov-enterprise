import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    // Verify the disposable stack before authentication or destructive fixtures.
    globalSetup: './e2e/fixtures/global-setup.ts',
    globalTeardown: './e2e/scripts/cleanup-db.ts',
    timeout: 180000,
    expect: {
        timeout: 20000,
        toHaveScreenshot: { maxDiffPixels: 100, threshold: 0.1 },
    },
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    // Retries collect evidence; the result contract still requires flaky=0.
    retries: process.env.CI ? 1 : 0,
    // Keep measured CI concurrency while the reorganized suite is remeasured.
    workers: process.env.CI ? 2 : 1,
    reporter: 'html',
    use: {
        baseURL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    // Disjoint populations; default invocation executes each test exactly once.
    // full-suite remains the browser name to preserve visual baseline filenames.
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'api-contract',
            testMatch: /contracts\/.*\.spec\.ts/,
            dependencies: ['setup'],
        },
        {
            name: 'full-suite',
            testMatch: /(?:journeys|quality)\/.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
    ],
});
