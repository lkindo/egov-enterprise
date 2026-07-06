import { test, expect } from './fixtures/base-test';

/**
 * Tier 18: Business Extensions
 * 특화 비즈니스 모듈(약식결재, 간부일정, 도움말콘텐츠)에 대한 정밀 검증
 */
test.describe('Tier 18: Business Extensions & Identity Governance', () => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    test('ISM: Informal Sanction Lifecycle', async ({ businessPage }) => {
        await businessPage.gotoIsm();
        await businessPage.verifyIsmMetrics();
        await businessPage.approveFirstPendingSanction('E2E Automated Decision: Operational Validation');
    });

    test('LSM: Leader Schedule Management Access', async ({ businessPage }) => {
        await businessPage.gotoLsm();
        // Verify dashboard components
        await expect(businessPage.page.getByText(/실시간 일정 매트릭스|간부 상태 모니터링/i).first()).toBeVisible();
        await expect(businessPage.page.getByText(/전체_등록_일정|활성_간부_수/i).first()).toBeVisible();
    });

    test('HPCM: Help Content Management Access', async ({ businessPage }) => {
        await businessPage.gotoHpcm();
        // Verify content inventory
        await expect(businessPage.page.getByText(/콘텐츠 인벤토리|도움말_자산/i).first()).toBeVisible();
        await expect(businessPage.page.getByText(/도움말 콘텐츠 아키텍처/i).first()).toBeVisible();
    });
});
