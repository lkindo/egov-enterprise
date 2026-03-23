import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: './e2e',
    timeout: 120000, // 2 minutes for CI stability
    expect: {
        timeout: 30000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 3 : 1, // Increase retries for flaky CI
    workers: process.env.CI ? 2 : undefined, // Allow some parallelism in CI if possible
    reporter: 'html',
    use: {
        baseURL: 'http://127.0.0.1:3001',
        trace: 'retain-on-failure',
        video: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'admin-tests',
            testIgnore: /.*rbac_rigorous\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: path.resolve(__dirname, 'playwright/.auth/admin.json'),
            },
            dependencies: ['setup'],
        },
        {
            name: 'user-tests',
            testMatch: /.*rbac_rigorous\.spec\.ts/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: path.resolve(__dirname, 'playwright/.auth/user.json'),
            },
            dependencies: ['setup'],
        },
    ],
});

