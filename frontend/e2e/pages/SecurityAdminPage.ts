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
        // Use a more specific locator for the header button to avoid tooltip conflicts
        await this.page.locator('button:has-text("신규 보안 아키텍처 설정")').first().click();
        await this.page.waitForTimeout(1000); // Wait for modal animation
        
        await this.page.locator('#authrtCd').fill(authCode);
        await this.page.locator('#authrtNm').fill(authNm);
        await this.page.locator('#authrtExpln').fill(`${authNm} description for E2E`);
        
        console.log(`>>> Clicking '권한 배포' button`);
        await this.page.locator('button:has-text("권한 배포")').click({ force: true });
        
        console.log(`>>> Waiting for success toast`);
        // The toast message in AuthorForm is "보안 권한 아키텍처가 성공적으로 반영되었습니다."
        await expect(this.page.getByText(/성공적으로 반영되었습니다/i)).toBeVisible({ timeout: 15000 });
        console.log(`>>> Authority Created Successfully`);
    }

    async gotoGroups() {
        console.log('>>> Navigating to Group Management');
        await this.page.goto('/admin/security/group');
        await expect(this.page.getByRole('heading', { name: /그룹.*거버넌스/i }).first()).toBeVisible();
    }

    async createGroup(groupId: string, groupNm: string) {
        console.log(`>>> Creating Group: ${groupId}`);
        await this.page.getByRole('button', { name: /신규 보안 그룹 설정/i }).click();
        await this.page.waitForTimeout(1000); // Wait for modal animation
        
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
        await expect(this.page.getByRole('heading', { name: /롤.*아키텍처/i }).first()).toBeVisible();
    }

    async createRole(roleCode: string, roleNm: string) {
        console.log(`>>> Creating Role: ${roleCode}`);
        await this.page.locator('button:has-text("신규 보안 롤 설정")').first().click();
        await this.page.waitForTimeout(1000); // Wait for modal animation
        
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
