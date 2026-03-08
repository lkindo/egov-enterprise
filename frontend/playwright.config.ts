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
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: path.resolve(__dirname, 'playwright/.auth/user.json'),
            },
            dependencies: ['setup'],
        },
    ],
    /* Run your local dev server before starting the tests */
    // webServer: {
    //   command: 'npm run dev',
    //   url: 'http://127.0.0.1:3000',
    //   reuseExistingServer: !process.env.CI,
    // },
});
