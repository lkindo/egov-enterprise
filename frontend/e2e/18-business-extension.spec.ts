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
        await businessPage.approveFirstPendingSanction();
    });

    // [2026-07-17] LSM(간부일정) 도메인 제거 — 0행·계약파손·사경화 실측(A그룹 leader b). 케이스 삭제.

    test('HPCM: Help Content Management Access', async ({ businessPage }) => {
        await businessPage.gotoHpcm();
        await expect(businessPage.page.getByRole('heading', {
            level: 1,
            name: '도움말 콘텐츠 관리(HPCM)',
        })).toBeVisible();
        await expect(businessPage.page.getByRole('table', {
            name: '도움말 콘텐츠 목록',
        })).toBeVisible();
    });
});
