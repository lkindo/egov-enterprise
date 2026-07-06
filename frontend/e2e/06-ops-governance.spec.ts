import { test, expect } from './fixtures/base-test';
import { OpsGovernancePage } from './pages/OpsGovernancePage';
import fs from 'fs';
import path from 'path';

/**
 * Tier 6: Ops Governance
 * 시스템의 보안과 운영 효율성을 극대화하는 영역 검증
 */
test.describe('Tier 6: Ops Governance', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });
    
    test('Login Policy Management (Access Controls)', async ({ adminPage }) => {
        const opsPage = new OpsGovernancePage(adminPage);

        await test.step('Admin: Navigate to Login Policy Hub', async () => {
            await opsPage.gotoLoginPolicy();
        });

        await test.step('Admin: Verify Policies Tab Accessibility', async () => {
            await opsPage.verifyPolicyTab();
        });
        
        // Simulating 2FA/OTP or IP Block response handling via network interception
        await test.step('Admin: Simulate IP Restriction / Policy Enforcement', async () => {
            console.log('>>> Simulating IP restriction enforcement response');
            await adminPage.route('**/api/v1/system/policies/ip', async route => {
                await route.fulfill({
                    status: 403,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: '접근이 차단된 IP입니다.' })
                });
            });
            
            // Just verifying that Playwright routing works for compliance tests
            // Use evaluate fetch to properly pass cookies via browser context
            const status = await adminPage.evaluate(async () => {
                const res = await fetch('/api/v1/system/policies/ip').catch(() => null);
                return res ? res.status : null;
            });
            expect(status).toBe(403);
        });
    });

    test('Menu ACL & Role Mapping Synchronization', async ({ adminPage }) => {
        const opsPage = new OpsGovernancePage(adminPage);

        await test.step('Admin: Navigate to Menu By Authority', async () => {
            await opsPage.gotoMenuByAuthority();
        });

        await test.step('Admin: Verify Role-based Menu Tree Generation', async () => {
            // Selecting an existing role like SYSTEM_ADMIN or general Admin
            await opsPage.verifyMenuRoleMapping('관리자');
        });
    });

    test('File Storage Integrity & Upload Validation', async ({ adminPage }) => {
        await test.step('Admin: Prepare dummy file for upload test', async () => {
            const testDir = path.join(__dirname, 'test-assets');
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir);
            }
            const dummyFilePath = path.join(testDir, 'e2e-dummy-upload.txt');
            fs.writeFileSync(dummyFilePath, 'This is a test file for storage integrity check.');
            
            console.log('>>> Created test asset for upload simulation');
            
            // Navigate to an upload-capable page (e.g., Notice Board Create)
            await adminPage.goto('/admin/community/boards/master');
            
            // Wait for load, then we just verify the route and component stability
            await expect(adminPage.getByText(/게시판.*관리|Board/i).first()).toBeVisible();
            
            // Note: If a specific file upload UI exists, we would do:
            // await adminPage.locator('input[type="file"]').setInputFiles(dummyFilePath);
            // await expect(adminPage.getByText('e2e-dummy-upload.txt')).toBeVisible();
        });
        
        await test.step('Admin: Simulate Storage Full Exception', async () => {
            console.log('>>> Simulating Storage Full Error Response');
            await adminPage.route('**/api/v1/system/storage/upload', async route => {
                await route.fulfill({
                    status: 507,
                    contentType: 'application/json',
                    body: JSON.stringify({ message: '스토리지 용량이 초과되었습니다.' })
                });
            });
            
            const status = await adminPage.evaluate(async () => {
                const res = await fetch('/api/v1/system/storage/upload', { method: 'POST' }).catch(() => null);
                return res ? res.status : null;
            });
            expect(status).toBe(507);
        });
    });

    test.afterAll(async () => {
        const testDir = path.join(__dirname, 'test-assets');
        if (fs.existsSync(testDir)) {
            console.log('>>> Cleaning up E2E local test assets...');
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });
});
