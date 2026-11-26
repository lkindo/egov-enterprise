import { Page, expect, type Locator } from '@playwright/test';

export class NotificationPage {
    constructor(private page: Page) {}

    private drawer(): Locator {
        return this.page.getByRole('dialog', { name: /알림.*센터/i });
    }

    private notificationHeading(title: string | RegExp): Locator {
        return this.drawer().getByRole('heading', { level: 3, name: title }).first();
    }

    getUnreadNotificationCard(title: string | RegExp): Locator {
        if (typeof title === 'string') {
            return this.drawer().getByRole('button', { name: `알림: ${title}`, exact: true });
        }
        return this.drawer().getByRole('button', { name: title }).first();
    }

    async openNotificationDrawer() {
        const bellButton = this.page.locator('#e2e-bell-button');
        await bellButton.click();
        
        // Wait for drawer to appear and finish animation.
        // AppNotificationDrawer는 Radix DialogPrimitive(role="dialog", Title '알림 센터', z-[1000])로 렌더된다.
        // (과거 하드코딩 '[class*=z-[9999]]'는 실제 z-[1000]과 불일치해 항상 타임아웃했음.)
        const drawer = this.drawer();
        await expect(drawer).toBeVisible({ timeout: 15000 });
        
        // Wait for the header to be visible which indicates the drawer content is rendering.
        // 드로어엔 h2가 2개(Radix sr-only Title + 시각 헤더)라 strict-mode 회피 위해 first() 사용.
        await expect(drawer.locator('h2').first()).toContainText(/알림.*센터/i, { timeout: 10000 });
        
        // 목록 내용은 비동기로 갱신된다. 카드 태그나 빈 상태 문구에 묶지 않고,
        // 항상 렌더되는 드로어 제어가 준비됐는지만 확인한다. 각 시나리오는 고유 카드 자체를 기다린다.
        await expect(drawer.getByRole('button', { name: '알림 센터 닫기' })).toBeVisible({ timeout: 15000 });
    }

    async closeNotificationDrawer() {
        const closeButton = this.page.getByTestId('e2e-drawer-close');
        await closeButton.click();
        // Wait for drawer to animate out
        await this.page.locator('[data-testid="e2e-drawer-close"]').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }

    async getUnreadCount(): Promise<number> {
        // [2026-11-26 PR-3b] 알림 단추의 접근 이름('알림, 읽지 않음 N건' / '알림')에서 읽는다 — 종전에는 배지 후보 클래스 다섯 가지를
        //   묶어 첫 것을 읽어(대체 선택자) 다른 배지를 셀 수 있었고, 9+ 로 줄인 숫자를 9 로 읽었다.
        const bell = this.page.locator('#e2e-bell-button');
        await expect(bell).toBeVisible();
        // 접근 이름은 단추 안의 sr-only 글자다(header-notifications.tsx) — 화면에 보이는 9+ 배지가 아니라 정확한 건수를 싣는다.
        const name = await bell.locator('.sr-only').first().textContent() ?? '';
        const unread = /읽지 않음\s*(\d+)건/.exec(name);
        const count = unread ? Number(unread[1]) : 0;
        // 건수가 있으면 화면에 보이는 숫자 배지도 있어야 한다 — 접근 이름만 보면 배지가 사라져도 통과한다(Codex 검토).
        if (count > 0) await expect(bell.locator('[data-slot="badge"]')).toBeVisible();
        return count;
    }

    async verifyNotificationExists(title: string) {
        await expect(this.notificationHeading(title)).toBeVisible({ timeout: 15000 });
    }

    async markNotificationAsRead(title: string) {
        const notificationItem = this.getUnreadNotificationCard(title);
        await expect(notificationItem).toBeVisible({ timeout: 15000 });
        await notificationItem.scrollIntoViewIfNeeded();
        await notificationItem.click();

        // React가 읽음 처리 후 button을 정적 카드로 교체한다. 제목은 남고 읽음 액션만 사라져야 한다.
        await this.expectNotificationRead(title);
    }

    async expectNotificationRead(title: string) {
        await expect(this.notificationHeading(title)).toBeVisible({ timeout: 15000 });
        await expect(this.getUnreadNotificationCard(title)).toHaveCount(0, { timeout: 15000 });
    }

    async readAllNotifications() {
        // Use data-testid for stable targeting (bottom sticky button)
        const readAllButton = this.page.getByTestId('read-all-broadcasts-btn');
        await readAllButton.waitFor({ state: 'visible', timeout: 5000 });
        await readAllButton.click();
    }
}
