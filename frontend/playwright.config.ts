import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
    testDir: './e2e',
    globalTeardown: './e2e/scripts/cleanup-db.ts',
    timeout: 120000, // 2 minutes for CI stability
    expect: {
        timeout: 30000,
        toHaveScreenshot: {
            maxDiffPixels: 100, // Allow minor differences (anti-aliasing, etc.)
            threshold: 0.1, // Pixel comparison threshold (0-1)
        },
    },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 3 : 1, // Increase retries for flaky CI
    workers: process.env.CI ? 2 : undefined, // Allow some parallelism in CI if possible
    reporter: 'html',
    use: {
        baseURL: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3001',
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
            name: 'tier-1-core',
            testMatch: /01-core-base\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-2-admin',
            testMatch: /02-admin-system\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-3-business',
            testMatch: /03-board-community\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-4-quality',
            testMatch: /04-quality-resilience\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-5-public',
            testMatch: /05-public-experience\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-6-ops',
            testMatch: /06-ops-governance\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-7-productivity',
            testMatch: /07-productivity-suite\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-8-collaboration',
            testMatch: /08-advanced-collaboration\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-9-observability',
            testMatch: /09-admin-observability-workspace\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-10-extension',
            testMatch: /10-operational-extension\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-11-workflow',
            testMatch: /11-enterprise-workflow\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-12-notification',
            testMatch: /12-notification\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-13-mail',
            testMatch: /13-mail\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-14-admin-workflow',
            testMatch: /14-admin-workflow\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-15-collaboration-ext',
            testMatch: /15-collaboration-extension\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'tier-16-system-obs',
            testMatch: /16-system-observability\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        },
        {
            name: 'full-suite',
            testMatch: /.*\.spec\.ts/,
            use: { ...devices['Desktop Chrome'] },
            dependencies: ['setup'],
        }
    ],
});
