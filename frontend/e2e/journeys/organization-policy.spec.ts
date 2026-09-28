import { expect, test } from '../fixtures/browser-test';
import { randomUUID } from 'node:crypto';
import { OpsGovernancePage } from '../pages/OpsGovernancePage';
/**
 * Ops Governance
 * 시스템의 보안과 운영 효율성을 극대화하는 영역 검증
 */
test.describe('Ops Governance', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });
    test("조직 정책 별칭이 정본 화면으로 이동하고 조직 정책 탭이 선택된다", async ({ adminPage }) => {
        const opsPage = new OpsGovernancePage(adminPage);
        await test.step('Admin: Navigate to Login Policy Hub', async () => {
            await opsPage.gotoLoginPolicy();
        });
        await test.step('Admin: Verify Policies Tab Accessibility', async () => {
            await opsPage.verifyPolicyTab();
        });
    });
    test('새 정책을 화면에서 등록하고 다시 열어 업무 키와 내용을 확인한다', async ({ adminPage, adminRequest }) => {
        // 정책 삭제 API는 없다. 자동 isolatedTarget fixture가 검증한 폐기용 DB에만 새 합성 행을 남긴다.
        const code = `E2E${randomUUID().replaceAll('-', '').slice(0, 9).toUpperCase()}`;
        const title = `E2E policy ${code}`;
        const content = `Policy created through the browser ${code}`;
        await adminPage.goto('/admin/system/policies');
        await adminPage.getByRole('button', { name: '새 정책 등록', exact: true }).click();
        const dialog = adminPage.getByRole('dialog');
        await dialog.getByRole('textbox', { name: '정책 유형 코드 (필수)', exact: true }).fill(code);
        await dialog.getByRole('textbox', { name: '정책 제목 (필수)', exact: true }).fill(title);
        await dialog.locator('.ProseMirror').fill(content);
        const created = adminPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/admin/system/policies/${code}`
            && response.request().method() === 'POST');
        await dialog.getByRole('button', { name: '정책 등록하기', exact: true }).click();
        expect((await created).status()).toBe(200);
        await expect(dialog).toBeHidden();
        const persisted = await adminRequest.get(`/api/v1/admin/system/policies/${code}`);
        expect(persisted.status()).toBe(200);
        const saved = (await persisted.json()).data;
        expect(saved).toMatchObject({ plcyTypeCd: code, plcyTtl: title });
        expect(saved.plcyCn).toContain(content);
        await adminPage.reload();
        await adminPage.getByRole('button', { name: `${title} 정책 수정`, exact: true }).click();
        await expect(dialog.getByRole('textbox', { name: '정책 제목 (필수)', exact: true })).toHaveValue(title);
        await expect(dialog.locator('.ProseMirror')).toContainText(content);
        await expect(dialog.getByRole('textbox', { name: '정책 유형 코드 (필수)', exact: true })).toHaveCount(0);
        await expect(dialog).toContainText(code);
        const updatedTitle = `${title} updated`;
        const updatedContent = `Policy updated through the browser ${code}`;
        await dialog.getByRole('textbox', { name: '정책 제목 (필수)', exact: true }).fill(updatedTitle);
        await dialog.locator('.ProseMirror').fill(updatedContent);
        const updated = adminPage.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/admin/system/policies/${code}`
            && response.request().method() === 'PUT');
        await dialog.getByRole('button', { name: '변경 사항 반영하기', exact: true }).click();
        expect((await updated).status()).toBe(200);
        await expect(dialog).toBeHidden();
        const reread = await adminRequest.get(`/api/v1/admin/system/policies/${code}`);
        expect(reread.status()).toBe(200);
        const modified = (await reread.json()).data;
        expect(modified).toMatchObject({ plcyTypeCd: code, plcyTtl: updatedTitle });
        expect(modified.plcyCn).toContain(updatedContent);
        await adminPage.reload();
        await expect(adminPage.getByRole('button', { name: `${updatedTitle} 정책 수정`, exact: true })).toBeVisible();
    });
});
