import { Page,  expect } from '@playwright/test';

export class SecurityAdminPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async gotoAuthorities() {
        console.log('>>> Navigating to Authority Management');
        await this.page.goto('/admin/security/authority');
        await expect(this.page.getByRole('heading', { name: /보안.*거버넌스/i }).first()).toBeVisible();
    }

    async createAuthority(authCode: string, authNm: string) {
        console.log(`>>> Creating Authority: ${authCode}`);
        await this.page.getByRole('button', { name: '신규 보안 아키텍처 설정', exact: true }).click();
        const dialog = this.page.getByRole('dialog', { name: '신규 권한 등록' });
        const codeInput = dialog.getByRole('textbox', { name: /보안 역할 식별자/ });
        const nameInput = dialog.getByRole('textbox', { name: /역할 레이블 명칭/ });
        const descriptionInput = dialog.getByRole('textbox', { name: /보안 정책 정보 명세/ });
        await expect(codeInput).toBeVisible({ timeout: 10000 });

        await codeInput.fill(authCode);
        await nameInput.fill(authNm);
        await descriptionInput.fill(`${authNm} description for E2E`);
        
        console.log(`>>> Clicking '권한 배포' button`);
        await dialog.getByRole('button', { name: '권한 배포', exact: true }).click();
        
        console.log(`>>> Waiting for success toast`);
        // The toast message in AuthorForm is "보안 권한 아키텍처가 성공적으로 반영되었습니다."
        await expect(this.page.getByText(/성공적으로 반영되었습니다/i)).toBeVisible({ timeout: 15000 });
        console.log(`>>> Authority Created Successfully`);
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
        console.log('>>> Navigating to Role Management');
        await this.page.goto('/admin/security/role');
        // [2026-08-24 A1 이행] 마케팅 제목('세분화 보안 롤(Role) 아키텍처')을 업무 제목으로 바꿨다(G14).
        await expect(this.page.getByRole('heading', { name: '보안 롤 관리', exact: true })).toBeVisible();
    }

    async createRole(roleCode: string, roleNm: string) {
        console.log(`>>> Creating Role: ${roleCode}`);
        await this.page.locator('button:has-text("신규 보안 롤 설정")').first().click();
        await expect(this.page.locator('#roleId')).toBeVisible({ timeout: 10000 });

        await this.page.locator('#roleId').fill(roleCode);
        await this.page.locator('#roleNm').fill(roleNm);
        await this.page.locator('#rolePatrn').fill('/**'); 
        await this.page.locator('#roleExpln').fill(`${roleNm} description for E2E`);
        
        // Select type (e.g., URL)
        await this.page.locator('#roleTypeCd').selectOption('url');
        await this.page.locator('#roleSort').fill('1');
        
        console.log(`>>> Clicking '롤 아키텍처 배포' button`);
        await this.page.getByRole('button', { name: /롤 아키텍처 배포/i }).click({ force: true });
        console.log(`>>> Waiting for success toast`);
        await expect(this.page.getByText(/성공|완료|되었습니다|저장|반영/i).first()).toBeVisible({ timeout: 10000 });
        console.log(`>>> Role Created Successfully`);
    }
}
