import { BOARD_DRAFT_PREFIX } from '../../src/lib/drafts/board-draft-storage';
import { expect,test } from '../fixtures/browser-test';
test.describe('Quality & Resilience', () => {
    test.describe('Advanced UX & Performance', () => {
        test.use({ storageState: 'playwright/.auth/admin.json' });
        test("같은 탭의 초안을 복구하고 새로고침 뒤에는 보관하지 않는다", async ({ page }) => {
            await page.goto('/admin/community/boards/select-board-list?bbsId=BBSMSTR_AAAAAAAAAAAA');
            await page.getByRole('link', { name: '글쓰기', exact: true }).click();
            page.on('dialog', dialog => dialog.accept());
            const draftTitle = `Draft_${Date.now()}`;
            await page.locator('input[name="pstTtl"]').fill(draftTitle);
            await page.locator('.ProseMirror').fill('This is a test content for auto-save verification.');
            await expect(page.getByRole('status').filter({ hasText: '현재 탭에 초안을 임시 보관했습니다.' }))
                .toBeVisible({ timeout: 10000 });
            const persistentDraftKeys = () => page.evaluate(prefix => [localStorage, sessionStorage].flatMap(storage => Array.from({ length: storage.length }, (_, index) => storage.key(index))
                .filter(key => key?.startsWith(prefix))), BOARD_DRAFT_PREFIX);
            expect(await persistentDraftKeys()).toEqual([]);
            // Next 클라이언트 이동으로 같은 문서 안에서만 복구한다.
            await page.getByRole('button', { name: '취소', exact: true }).click();
            // [2026-10-26 ADR-0043 1차 UX-07] 고친 입력이 있으면 앱 안 이동 전에 묻는다 — 앱의 확인 창이라 위 dialog 수락이 닿지 않는다.
            //   변경을 버리고 나가도 같은 탭의 초안은 남아, 다시 들어오면 복구를 묻는다.
            await page.getByRole('dialog', { name: '저장하지 않은 변경', exact: true })
                .getByRole('button', { name: '변경 버리고 이동', exact: true }).click();
            await page.getByRole('link', { name: '글쓰기', exact: true }).click();
            const restoreDialog = page.getByRole('dialog').filter({ hasText: '임시저장 데이터 복구' });
            await expect(restoreDialog).toBeVisible();
            await restoreDialog.getByRole('button', { name: '복구', exact: true }).click();
            await expect(page.locator('input[name="pstTtl"]')).toHaveValue(draftTitle);
            await expect(page.locator('.ProseMirror')).toContainText('auto-save verification');
            await page.reload();
            await expect(page.locator('input[name="pstTtl"]')).toHaveValue('');
            await expect(restoreDialog).toHaveCount(0);
            expect(await persistentDraftKeys()).toEqual([]);
        });
    });
});
