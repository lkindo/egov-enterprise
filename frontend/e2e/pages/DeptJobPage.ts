import { Page, Locator, expect } from '@playwright/test';

/**
 * 부서 업무(DeptJob) · 업무 보고(WorkReport) 화면의 셀렉터 집합.
 *
 * 두 기능은 같은 컴포넌트(WorkHubClient)의 탭으로 렌더되고, 부서 업무만 전용 등록/상세 라우트를
 * 따로 갖는다. 행(row)의 수정·삭제 버튼에는 data-testid 가 없어(일정 탭과 달리) 텍스트 기반
 * 셀렉터를 써야 하는데, 그 규칙을 스펙마다 되풀이하지 않도록 여기 한곳에 모은다.
 *
 * ⚠ StandardDataTable 은 데스크톱 <table> 과 모바일 카드(<div>)를 **둘 다 DOM 에 렌더**하고
 *   CSS(`hidden md:block` / `md:hidden`)로만 하나를 감춘다. 그래서 페이지 전역에서
 *   getByRole('button', { name: '수정' }) 같은 셀렉터를 쓰면 같은 버튼이 두 번 잡혀
 *   strict mode 위반이 난다. 행 조작은 반드시 <tr> 로 스코프를 좁힌다(= 데스크톱 표만 매칭).
 */
export class DeptJobPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 이동
    //
    // e2e=true 는 SmartOnboardingHub 투어를 억제하는 프로젝트 표준 플래그다
    // (smart-onboarding-hub.tsx 가 window.location.search 에서 직접 읽는다).
    // 이 투어는 z-[10000] 전면 오버레이라 붙이지 않으면 클릭이 가로막힌다.
    // ─────────────────────────────────────────────────────────────────────────

    /** 부서 업무(워크플로우) 탭. */
    async gotoJobList() {
        console.log('>>> Navigating to Dept Job list (work-hub job tab)');
        await this.page.goto('/smart-toolkit/dept-job?e2e=true');
        await expect(this.page.getByText('업무 워크플로우 매트릭스').first()).toBeVisible({ timeout: 30000 });
    }

    /** 업무 보고 탭. */
    async gotoReportList() {
        console.log('>>> Navigating to Work Report list (work-hub report tab)');
        await this.page.goto('/smart-toolkit/work-report?e2e=true');
        await expect(this.page.getByText('업무 보고 아카이브').first()).toBeVisible({ timeout: 30000 });
    }

    /** 부서 업무 등록 화면(전용 라우트). */
    async gotoJobCreate() {
        console.log('>>> Navigating to Dept Job create form');
        await this.page.goto('/smart-toolkit/dept-job/create?e2e=true');
        await expect(this.page.getByText('부서 업무 등록').first()).toBeVisible({ timeout: 30000 });
    }

    /** 부서 업무 상세·수정 화면. */
    async gotoJobDetail(deptTaskSn: number) {
        console.log(`>>> Navigating to Dept Job detail: ${deptTaskSn}`);
        await this.page.goto(`/smart-toolkit/dept-job/${deptTaskSn}?e2e=true`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 목록 공통 (업무 탭 · 보고 탭이 같은 검색창/페이저를 공유한다)
    // ─────────────────────────────────────────────────────────────────────────

    /** 목록 상단 검색창. 입력 즉시 쿼리가 바뀌고 페이지는 1로 되돌아간다. */
    get searchInput(): Locator {
        return this.page.locator('input[placeholder="검색어를 입력하십시오..."]');
    }

    /** 검색어를 넣는다. fill 은 기존 값을 지우므로 연속 검색에도 그대로 쓸 수 있다. */
    async search(keyword: string) {
        await this.searchInput.fill(keyword);
    }

    /**
     * 데스크톱 표의 행. 모바일 카드는 <div> 라 <tr> 스코프에 걸리지 않는다(위 주석 참조).
     */
    row(text: string): Locator {
        return this.page.locator('tr', { hasText: text });
    }

    /** 행의 '수정' 버튼 (업무 보고 탭). */
    rowEditButton(text: string): Locator {
        return this.row(text).getByRole('button', { name: '수정' });
    }

    /** 행의 '삭제' 버튼 (업무 보고 탭). */
    rowDeleteButton(text: string): Locator {
        return this.row(text).getByRole('button', { name: '삭제' });
    }

    /** 행의 '상세' 버튼 (부서 업무 탭). 종전에는 onClick 없는 死버튼이었다. */
    rowDetailButton(text: string): Locator {
        return this.row(text).getByRole('button', { name: '상세' });
    }

    /** 비어 있는 표에 렌더되는 안내 셀. 검색이 '실제로 걸러냈는지' 확인하는 데 쓴다. */
    get emptyMessage(): Locator {
        return this.page.locator('[data-testid="empty-table-msg"]');
    }

    /**
     * 데스크톱 표의 데이터 행 전체.
     *
     * 정렬 순서를 가정하지 않고 페이지 이동을 검증하기 위해 쓴다("몇 번 항목이 1페이지에 있나"는
     * 서버 정렬에 의존해 깨지기 쉽다 — "1페이지 10행 / 2페이지 1행"은 순서와 무관하다).
     * 로딩 중에는 스켈레톤 5행이 잠깐 잡히지만 toHaveCount 가 자동 재시도하므로 문제되지 않는다.
     */
    get rows(): Locator {
        return this.page.locator('tbody tr');
    }

    /**
     * 페이저. StandardDataTable 은 totalPages > 1 일 때만 렌더한다
     * (work-hub 가 pagination prop 을 전달하지 않아 종전에는 아예 없었다).
     */
    get nextPageButton(): Locator {
        return this.page.locator('button[aria-label="다음 페이지"]');
    }

    get prevPageButton(): Locator {
        return this.page.locator('button[aria-label="이전 페이지"]');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 폼
    // ─────────────────────────────────────────────────────────────────────────

    /** 부서 업무 폼(등록·수정 공용 DeptJobForm)의 업무명 입력. */
    get jobNameInput(): Locator {
        return this.page.locator('input[name="deptTaskNm"]');
    }

    /** 업무 보고 폼(ReportCreateForm)의 제목 입력. */
    get reportTitleInput(): Locator {
        return this.page.locator('input[name="rptTtl"]');
    }

    /**
     * useConfirm 다이얼로그의 확정 버튼.
     * 삭제 흐름은 confirmText='삭제' 를 쓰므로 목록 행의 '삭제' 버튼과 이름이 같다.
     * role=dialog 로 스코프를 좁혀 구분한다.
     */
    confirmDialogButton(name: string): Locator {
        return this.page.getByRole('dialog').getByRole('button', { name });
    }
}
