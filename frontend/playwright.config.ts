import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: './e2e',
    timeout: 60000,
    expect: {
        timeout: 10000,
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:3001',
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },
        {
            name: 'admin-tests',
            use: {
                ...devices['Desktop Chrome'],
                storageState: path.resolve(__dirname, 'playwright/.auth/admin.json'),
            },
            dependencies: ['setup'],
            testIgnore: /.*rbac_rigorous\.spec\.ts/,
        },
        {
            name: 'rbac-check',
            use: {
                ...devices['Desktop Chrome'],
                storageState: path.resolve(__dirname, 'playwright/.auth/user.json'),
            },
            dependencies: ['setup'],
            testMatch: /.*rbac_rigorous\.spec\.ts/,
        },
    ],
});
