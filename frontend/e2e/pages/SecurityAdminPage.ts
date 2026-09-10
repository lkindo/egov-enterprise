import { Page,  expect } from '@playwright/test';

export class SecurityAdminPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async gotoAuthorities() {
        await this.page.goto('/admin/security/authority');
        await expect(this.page.getByRole('heading', { name: '권한 그룹 관리', level: 1, exact: true })).toBeVisible();
    }

    async createAuthority(authCode: string, authNm: string) {
        await this.page.getByRole('button', { name: '그룹 추가', exact: true }).click();
        const form = this.page.getByRole('form', { name: '권한 그룹 등록' });
        await form.getByRole('textbox', { name: '그룹 코드' }).fill(authCode);
        await form.getByRole('textbox', { name: '그룹명' }).fill(authNm);
        await form.getByRole('textbox', { name: '설명' }).fill(authNm + ' E2E');
        const [response] = await Promise.all([
            this.page.waitForResponse((entry) => entry.request().method() === 'POST' && entry.url().endsWith('/api/v1/admin/authorization/groups')),
            form.getByRole('button', { name: '그룹 등록', exact: true }).click(),
        ]);
        expect(response.status()).toBe(200);
        await expect(this.page.getByRole('region', { name: authNm + ' 권한 설정' })).toBeVisible();
    }

    async gotoGroups() {
        console.log('>>> Navigating to Group Management');
        await this.page.goto('/admin/security/group');
        // [2026-08-24 A1 이행] 마케팅 제목('보안 그룹 아키텍처 거버넌스')을 업무 제목으로 바꿨다(G14).
        await expect(this.page.getByRole('heading', { name: '보안 그룹 관리', exact: true })).toBeVisible();
    }

    async createGroup(groupId: string, groupNm: string) {
        console.log(`>>> Creating Group: ${groupId}`);
        await this.page.getByRole('button', { name: /신규 보안 그룹 설정/i }).click();
        await expect(this.page.locator('#groupId')).toBeVisible({ timeout: 10000 });

        await this.page.locator('#groupId').fill(groupId);
        await this.page.locator('#groupNm').fill(groupNm);
        await this.page.locator('#groupDc').fill(`${groupNm} description for E2E`);
        
        console.log(`>>> Clicking '신규 그룹 배포' button`);
        await this.page.getByRole('button', { name: /신규 그룹 배포/i }).click({ force: true });
        console.log(`>>> Waiting for success toast`);
        await expect(this.page.getByText(/성공|완료|되었습니다|저장|반영/i).first()).toBeVisible({ timeout: 10000 });
        console.log(`>>> Group Created Successfully`);
    }

    async gotoRoles() {
        await this.page.goto('/admin/security/role');
        await expect(this.page).toHaveURL(/\/admin\/security\/authority$/);
        await expect(this.page.getByRole('heading', { name: '권한 그룹 관리', exact: true })).toBeVisible();
    }
}
