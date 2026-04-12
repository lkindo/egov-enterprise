import { test, expect } from './fixtures/base-test';
import { z } from 'zod';
import { validateContract } from './fixtures/contract-validator';

/**
 * 🟡 GOLD TEST: User Management Full Integration & Contract Validation
 * 이 테스트는 모킹(Mocking) 없이 실제 백엔드와 통신하며, API 응답 스키마를 실시간 검증합니다.
 */

// UserManage Schema (Sync with src/lib/validation/schemas.ts)
const userManageSchema = z.object({
  userId: z.string().min(1),
  userNm: z.string().min(1),
  emailAdres: z.string().email().or(z.string().length(0)), // Standardized to emailAdres
  userSttusCode: z.enum(['P', 'A', 'D', 'N']),
  emplNo: z.string().optional().nullable(),
  ofcpsNm: z.string().optional().nullable(),
});

const userListResponseSchema = z.object({
  list: z.array(userManageSchema),
  totalPage: z.number().optional(), // Standardized to PageResponse format
});

test.describe('Admin User Management - Gold Flow (No-Mock & Contract)', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('Full Lifecycle: Create -> Search -> Validate -> Delete', async ({ page }) => {
        const testId = `gold_${Date.now()}`;
        const testName = `Gold User ${Date.now()}`;

        // 1. Monitor API Responses for Contract Validation
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/v1/admin/system/users')) {
                if (response.request().method() === 'GET' && !url.includes('/check-id')) {
                    await validateContract(response, userListResponseSchema);
                }
            }
        });

        console.log('>>> Step 1: Navigate to User Management');
        await page.goto('/admin/user/manage', { waitUntil: 'networkidle' });

        console.log('>>> Step 2: Open Create Form');
        await page.getByRole('button', { name: /신규 등록|Create/i }).click();
        
        console.log('>>> Step 3: Fill Identity Data');
        await page.locator('input[id="userId"]').fill(testId);
        await page.locator('input[id="userNm"]').fill(testName);
        await page.locator('input[type="email"]').fill(`gold_${testId}@example.com`);
        await page.locator('input[type="password"]').fill('Gold1234!');

        console.log('>>> Step 4: Execute Provisioning (Submit)');
        const [response] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/users') && res.request().method() === 'POST'),
            page.getByRole('button', { name: /실행|Save|Confirm/i }).click()
        ]);

        expect(response.status()).toBe(200);
        console.log('>>> SUCCESS: User provisioned on backend');

        console.log('>>> Step 5: Verify in List with Search');
        const searchInput = page.getByPlaceholder(/사용자명 또는 고유 ID/i);
        await searchInput.fill(testId);
        await page.keyboard.press('Enter');

        await page.waitForResponse(res => res.url().includes('/users') && res.request().method() === 'GET');
        
        const row = page.locator('tr').filter({ hasText: testId });
        await expect(row).toBeVisible();
        console.log('>>> SUCCESS: User visible in real database-backed list');

        console.log('>>> Step 6: Cleanup (Delete)');
        await row.locator('button').filter({ has: page.locator('svg') }).nth(1).click(); // Delete button is usually second
        
        // Confirm Modal
        await page.getByRole('button', { name: /삭제|Confirm/i }).click();
        
        await page.waitForResponse(res => res.url().includes(`/users/${testId}`) && res.request().method() === 'DELETE');
        console.log('>>> SUCCESS: Gold Flow completed and cleaned up');
    });
});
