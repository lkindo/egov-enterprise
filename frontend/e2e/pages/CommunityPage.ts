import { Page, expect } from '@playwright/test';

export class CommunityPage {
    constructor(private page: Page) {}

    async goto() {
        console.log('>>> [Community] Navigating to Community Matrix');
        await this.page.goto('/admin/community');
        // [2026-07-27 정정] 제목에서 '엔터프라이즈' 접두어가 제거됐다(브랜딩 정리 잔재). 실제 렌더는
        // KnowledgeHubClient 의 '지식 매트릭스' 이며, /admin/community 는 이 클라이언트를 그대로 렌더한다.
        await expect(this.page.getByRole('heading', { name: /지식 매트릭스/i })).toBeVisible({ timeout: 15000 });
    }

    async selectCategory(category: 'WIKI' | 'FAQ' | 'QNA' | 'COMMUNITY') {
        // [2026-07-27 정정] 두 겹으로 어긋나 있었다.
        //  ① 라벨: 'Global Wiki'·'고객지원' 은 저장소에 없는 팬텀. KnowledgeHubClient 의 CategoryCard 는
        //     '위키' · '자주 묻는 질문' · '기술 Q&A' · '커뮤니티' 로 렌더한다.
        //  ② 역할: CategoryCard 는 <button type="button" role="tab"> 이라 **명시적 role 이 암시적 button
        //     역할을 덮어쓴다** — getByRole('button') 으로는 원리적으로 잡히지 않아 5분 타임아웃까지 대기했다.
        //     (monitoring·collaboration 허브와 동일한 드리프트. 종전 스윕은 이 호출이 정규식 리터럴이 아니라
        //      변수(categoryMap[category])여서 걸러내지 못했다.)
        const categoryMap: Record<string, string> = {
            'WIKI': '위키',
            'FAQ': '자주 묻는 질문',
            'QNA': '기술 Q&A',
            'COMMUNITY': '커뮤니티'
        };
        console.log(`>>> [Community] Selecting category: ${category}`);
        const categoryTab = this.page.getByRole('tab', { name: categoryMap[category] });
        await categoryTab.click();
        await expect(categoryTab).toHaveAttribute('aria-selected', 'true');
    }

    async verifyCOPList() {
        console.log('>>> [Community] Verifying COP (Community) List');
        await this.selectCategory('COMMUNITY');
        await expect(this.page.locator('button:has-text("신규 등록")')).toBeVisible();
        
        // Check for "커뮤니티" specific items if any
        const articles = this.page.locator('button.group');
        const count = await articles.count();
        console.log(`>>> Found ${count} community units.`);
    }

    async gotoMaster() {
        console.log('>>> [Community] Navigating to Community Master Console');
        // 종전 /Master Console/i 는 실존하지 않는 문구. 실측 라벨은 '게시판 관리'(관리자에게만 노출).
        await this.page.getByRole('button', { name: /게시판 관리/ }).click();
        await expect(this.page).toHaveURL(/\/admin\/community\/boards\/master/);
    }
}
