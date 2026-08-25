import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_DIR = join(process.cwd(), 'src', 'app');
const readAppSource = (...parts: string[]) => readFileSync(join(APP_DIR, ...parts), 'utf8');

describe('app shell accessibility source contract', () => {
  it('PageHeader의 정적 제목 shell은 server-safe이고 breadcrumb만 client leaf로 남는다', () => {
    const pageHeader = readAppSource('components', 'layout', 'page-header.tsx');
    const breadcrumb = readAppSource('components', 'layout', 'DynamicBreadcrumb.tsx');

    expect(pageHeader).not.toMatch(/^\s*['"]use client['"];?/);
    expect(breadcrumb).toMatch(/^\s*['"]use client['"];?/);
    expect(pageHeader.match(/<h1\b/g)).toHaveLength(1);
    expect(pageHeader).toContain('<DynamicBreadcrumb customItems={customItems} />');
  });

  it('breadcrumb 은 이름 있는 nav + 순서 목록 + aria-current 구조를 유지한다 (KRDS/WCAG)', () => {
    // [2026-08-22 정렬] 종전에는 이름 없는 <nav> 안에 평평한 Link/span 나열이라 스크린리더가
    // "몇 단계 중 어디"도 "여기가 현재 페이지"도 알 수 없었다. 네 요소가 한 세트다 —
    // 하나라도 빠지면 구조 정보가 그만큼 소실된다.
    const breadcrumb = readAppSource('components', 'layout', 'DynamicBreadcrumb.tsx');

    expect(breadcrumb, 'nav 의 접근 이름이 사라졌습니다').toMatch(/aria-label="현재 위치"/);
    expect(breadcrumb, '순서 목록(ol) 시맨틱이 사라졌습니다').toMatch(/<ol[\s>]/);
    expect(breadcrumb, '현재 항목의 aria-current="page" 가 사라졌습니다')
      .toMatch(/aria-current=\{isCurrent \? 'page' : undefined\}/);
    expect(breadcrumb, '장식 구분자(ChevronRight)가 접근성 트리에 노출됩니다')
      .toMatch(/<ChevronRight[^>]*aria-hidden="true"/);
  });

  it('primary nav 는 현재 route 의 canonical node 에 aria-current 를 선언한다 (IA §7.3)', () => {
    // 사이드바: 자손 일치(subtreeMatchesLocation)는 강조·자동 펼침용이다. aria-current="page" 를
    // 그 판정에 달면 조상 그룹까지 '현재 페이지'를 사칭하므로, 자기 자신 일치(matchesLocation)에만 단다.
    const navItem = readAppSource('components', 'layout', 'NavItem.tsx');
    expect(navItem, '사이드바 canonical node 의 aria-current="page" 가 사라졌습니다')
      .toMatch(/aria-current=\{isCurrentPage \? 'page' : undefined\}/);
    expect(navItem, 'aria-current 판정이 자기 자신 일치(matchesLocation)가 아닙니다')
      .toMatch(/const isCurrentPage = useMemo\(\s*\(\) => matchesLocation\(/);

    // GNB: 활성 도메인은 섹션 표지다. 'page' 를 쓰면 하위 화면에서도 페이지를 사칭하므로 'true' 로 선언한다.
    const header = readAppSource('components', 'layout', 'header.tsx');
    expect(header, 'GNB 활성 도메인의 aria-current="true" 가 사라졌습니다')
      .toMatch(/aria-current=\{isActive \? 'true' : undefined\}/);
  });

  it('sticky header와 skip target이 focus occlusion 여유를 갖고 모바일 trigger를 dialog에 연결한다', () => {
    const layout = readAppSource('layout.tsx');
    const header = readAppSource('components', 'layout', 'header.tsx');
    const sidebar = readAppSource('components', 'layout', 'sidebar.tsx');
    const headerClasses = header.match(/<header\b[\s\S]*?className="([^"]+)"/)?.[1] ?? '';

    expect(headerClasses.split(/\s+/)).toContain('sticky');
    expect(headerClasses.split(/\s+/)).not.toContain('relative');
    expect(headerClasses.split(/\s+/)).not.toContain('overflow-hidden');
    expect(layout).toContain('<html lang="ko" className="scroll-pt-16"');
    expect(layout).toMatch(/id="main-content"[\s\S]*?className="[^"]*scroll-mt-16/);
    expect(layout).toContain('data-sidebar-modal-background="skip-link"');
    expect(layout).toContain('data-sidebar-modal-background="main"');
    expect(header).toContain('data-sidebar-modal-background="header"');
    expect(header).toContain('aria-controls="primary-sidebar"');
    expect(sidebar).toContain('id="primary-sidebar"');
  });

  it('A1 archetype 셸이 페이지의 h1 을 단독으로 소유한다', () => {
    // [2026-08-24 A1 이행] 조회형 목록 화면은 제목을 자기 소스에 쓰지 않고 WorkListPage 에
    //   문자열로 넘긴다(카탈로그 §5 A1). 그래서 "화면 소스에 <h1 이 있는가"로는 더 이상
    //   주 제목 소유를 판정할 수 없다 — 셸이 정확히 하나의 h1 을 갖는다는 사실이 그 자리를 대신한다.
    const shell = readAppSource('components', 'patterns', 'work-list-page.tsx');

    expect(shell, 'WorkListPage의 기본 주 제목 수준이 h1이 아닙니다').toMatch(/headingLevel\s*=\s*1/);
    expect(shell, '임베디드 A1 제목 수준을 h2로 낮추는 계약이 없습니다').toMatch(
      /const PageHeading = headingLevel === 1 \? 'h1' : 'h2'/,
    );
    expect(shell.match(/<PageHeading\b/g), 'WorkListPage가 주 제목을 잃었거나 둘 이상 갖습니다').toHaveLength(1);
    expect(shell, '셸이 제목을 title prop으로 받지 않습니다').toMatch(/<PageHeading[^>]*>\{title\}<\/PageHeading>/);
  });

  it('A2 전체 셸과 점진 레이아웃 소비자는 최종 h1을 하나만 소유한다', () => {
    const shell = readAppSource('components', 'patterns', 'master-detail-page.tsx');
    const menus = readAppSource('admin', 'system', 'menus', 'MenuAdminClient.tsx');
    const userOrg = readAppSource('admin', 'user', 'UserOrgHubClient.tsx');
    const mailHistory = readAppSource(
      'admin', 'collaboration', 'mail-history', 'MailHistoryHubClient.tsx',
    );

    expect(shell, 'MasterDetailPage의 기본 주 제목 수준이 h1이 아닙니다').toMatch(/headingLevel\s*=\s*1/);
    expect(shell, '임베디드 A2 제목 수준을 h2로 낮추는 계약이 없습니다').toMatch(
      /const PageHeading = headingLevel === 1 \? 'h1' : 'h2'/,
    );
    expect(shell.match(/<PageHeading\b/g), 'MasterDetailPage가 주 제목을 잃었거나 둘 이상 갖습니다').toHaveLength(1);
    expect(shell).toMatch(/<PageHeading[^>]*>\{title\}<\/PageHeading>/);
    expect(menus, '메뉴 화면은 h1을 MasterDetailPage에 위임해야 합니다').not.toMatch(/<h1\b/);
    expect(userOrg, '부서 화면은 h1을 PageHeader에 위임해야 합니다').not.toMatch(/<h1\b/);
    expect(mailHistory, '메일 이력 화면은 h1을 MasterDetailPage에 위임해야 합니다').not.toMatch(/<h1\b/);
  });

  it('A1 이행 화면은 제목을 셸에 위임한다(자체 h1 을 다시 만들지 않는다)', () => {
    const delegatedHeadingSources = [
      ['admin', 'collaboration', 'scraps', 'selectScrapList', 'ScrapListClient.tsx'],
      ['admin', 'collaboration', 'address-book', 'select-address-book-list', 'AddressBookListClient.tsx'],
      ['admin', 'operation', 'events', 'EventManagementClient.tsx'],
      ['admin', 'operation', 'rewards', 'RewardManageClient.tsx'],
      ['admin', 'system', 'logs', 'user', 'SystemLogsUserClient.tsx'],
      // 시스템 정책은 2026-08-24 A1 이행으로 standalone HubHeader 를 떠나 셸에 위임한다.
      ['admin', 'system', 'policies', 'PolicyAdminClient.tsx'],
    ];

    for (const pathParts of delegatedHeadingSources) {
      const source = readAppSource(...pathParts);
      expect(source, `${pathParts.join('/')}: 셸을 경유하지 않습니다`).toMatch(/<WorkListPage\b/);
      expect(source, `${pathParts.join('/')}: 셸 밖에서 h1 을 다시 만듭니다`).not.toMatch(/<h1\b/);
    }
  });

  it('실제 UI route의 검증된 주 제목은 h1이고 preview 제목은 페이지 제목을 사칭하지 않는다', () => {
    const routeHeadingSources = [
      ['admin', 'collaboration', 'scraps', 'insertScrap', 'InsertScrapClient.tsx'],
      ['admin', 'collaboration', 'scraps', 'selectScrapDetail', '[id]', 'SelectScrapDetailClient.tsx'],
      ['admin', 'community', 'boards', 'select-board-list', 'BoardListClient.tsx'],
      ['admin', 'sanctn', 'WorkflowHubClient.tsx'],
      ['admin', 'stats', 'IntelligenceHubClient.tsx'],
      ['admin', 'survey', 'stats', 'SurveyStatsClient.tsx'],
      ['admin', 'survey', 'manage', 'create', 'SurveyManageCreateClient.tsx'],
      ['admin', 'survey', 'manage', '[id]', 'SurveyManageDetailClient.tsx'],
      ['admin', 'system', 'common-code', 'codes', 'CommonCodeCodesClient.tsx'],
      ['smart-toolkit', 'dept-job', 'create', 'DeptJobCreateClient.tsx'],
      ['smart-toolkit', 'dept-job', '[id]', 'DeptJobDetailClient.tsx'],
      ['smart-toolkit', 'schedule', 'dept', 'ScheduleDeptClient.tsx'],
      ['admin', 'community', 'boards', 'maker', 'components', 'BoardMakerWizard.tsx'],
    ];

    for (const pathParts of routeHeadingSources) {
      const source = readAppSource(...pathParts);
      expect(source, pathParts.join('/')).toMatch(/<(?:[A-Za-z]+\.)?h1\b/);
    }

    const preview = readAppSource('admin', 'community', 'boards', 'maker', 'components', 'BoardPreview.tsx');
    expect(preview).not.toMatch(/<h1\b/);
  });

  it('PageHeader가 없는 standalone HubHeader route만 명시적으로 h1을 소유한다', () => {
    const standaloneHubSources = [
      ['admin', 'AdminDashboardClient.tsx'],
      // 행사 운영 센터는 2026-08-24 A1 이행으로 WorkListPage 가 h1 을 소유한다(위 위임 계약이 검사).
      ['admin', 'security', 'login-policy', 'LoginPolicyAdminClient.tsx'],
      ['help', 'policies', '[type]', 'page.tsx'],
    ];

    for (const pathParts of standaloneHubSources) {
      const source = readAppSource(...pathParts);
      expect(source, pathParts.join('/')).toMatch(
        /<HubHeader\b(?:(?!\/>)[\s\S])*?headingLevel\s*=\s*\{1\}/,
      );
    }
  });

  it('loading/error shell도 h1을 보존하고 설문 hub는 내부 페이지 제목을 중첩하지 않는다', () => {
    const layout = readAppSource('layout.tsx');
    const boardDetailPage = readAppSource('admin', 'community', 'boards', 'detail', 'page.tsx');
    const boardListPage = readAppSource('admin', 'community', 'boards', 'select-board-list', 'page.tsx');
    const statsFallback = readAppSource('admin', 'stats', 'StatsHubFallback.tsx');
    const surveyHub = readAppSource('admin', 'survey', 'hub', 'SurveyHubClient.tsx');

    expect(layout).toContain('보안 세션을 확인하는 중');
    expect(layout).toContain('애플리케이션을 준비하는 중');
    expect(layout.match(/<h1\b/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(boardDetailPage).toMatch(/BoardDetailSkeleton[\s\S]*?<h1\b/);
    expect(boardListPage).toMatch(/BoardListSkeleton[\s\S]*?<h1\b/);
    expect(statsFallback).toMatch(/<h1\b/);
    expect(surveyHub).toContain('<SurveyManageClient embedded />');
    expect(surveyHub).toContain('<SurveyRespondentsClient embedded />');
    expect(surveyHub).toContain('<SurveyStatsClient embedded />');
  });

  it('동적 import의 독립 로딩 화면도 최종 화면과 교대하는 h1을 제공한다', () => {
    const dashboardPage = readAppSource('page.tsx');
    const addressBookPage = readAppSource(
      'admin', 'collaboration', 'address-book', 'select-address-book-list', 'page.tsx',
    );
    const boardMasterPage = readAppSource('admin', 'community', 'boards', 'master', 'page.tsx');
    const boardMakerPage = readAppSource('admin', 'community', 'boards', 'maker', 'page.tsx');

    expect(dashboardPage).toMatch(/DashboardLoading[\s\S]*?<h1\b/);
    expect(dashboardPage.match(/<DashboardLoading\s*\/>/g)).toHaveLength(2);
    expect(addressBookPage).toMatch(/AddressBookListSkeleton[\s\S]*?<h1\b/);
    expect(boardMasterPage).toMatch(/loading:\s*\(\)\s*=>\s*<h1\b/);
    expect(boardMakerPage).toMatch(/loading:\s*\(\)\s*=>\s*<h1\b/);
  });

  it('client 내부 early-return 로딩·오류 상태도 최종 제목과 교대하는 h1을 보존한다', () => {
    const dashboardClient = readAppSource('UnifiedDashboardClient.tsx');
    const dashboardLoadingStart = dashboardClient.indexOf('if (!isMounted || loading || !user)');
    const dashboardLoadingEnd = dashboardClient.indexOf('\n  return (', dashboardLoadingStart);

    const pollParticipate = readAppSource(
      'admin', 'survey', 'polls', 'participate', 'OnlinePollParticipateClient.tsx',
    );
    const pollLoadingStart = pollParticipate.indexOf("if (loading && viewMode === 'list')");
    const pollBranchReturnStart = pollParticipate.indexOf('\n return (', pollLoadingStart);
    const pollLoadingEnd = pollParticipate.indexOf('\n return (', pollBranchReturnStart + 1);

    const responseDetail = readAppSource('survey', 'response', '[id]', 'SurveyResponseDetailClient.tsx');
    const responseLoadingStart = responseDetail.indexOf('if (isLoading)');
    const responseErrorStart = responseDetail.indexOf('if (isError)', responseLoadingStart);
    const responseFinalStart = responseDetail.indexOf('\n    return (', responseErrorStart);

    expect(dashboardClient.slice(dashboardLoadingStart, dashboardLoadingEnd)).toMatch(/<h1\b/);
    expect(pollParticipate.slice(pollLoadingStart, pollLoadingEnd)).toMatch(/<h1\b/);
    expect(responseDetail.slice(responseLoadingStart, responseErrorStart)).toMatch(/<h1\b/);
    expect(responseDetail.slice(responseErrorStart, responseFinalStart)).toMatch(/<h1\b/);
  });

  it('공통 segment loading/error 경계는 지속 상태에서도 페이지 제목을 제공한다', () => {
    const boundarySources = [
      ['global-error.tsx'],
      ['admin', 'error.tsx'],
      ['loading.tsx'],
      ['admin', 'loading.tsx'],
    ];

    for (const pathParts of boundarySources) {
      expect(readAppSource(...pathParts), pathParts.join('/')).toMatch(/<h1\b/);
    }
  });

  it('route-local Suspense fallback은 route 의미에 맞는 h1을 보존한다', () => {
    const routeFallbackSources = [
      ['admin', 'collaboration', 'page.tsx'],
      ['admin', 'collaboration', 'scraps', 'page.tsx'],
      ['admin', 'community', 'templates', 'page.tsx'],
      ['admin', 'help', 'page.tsx'],
      ['admin', 'help', 'faq', 'page.tsx'],
      ['admin', 'help', 'qna', 'page.tsx'],
      ['admin', 'notifications', 'page.tsx'],
      ['admin', 'operation', 'events', 'page.tsx'],
      ['admin', 'operation', 'external-hr', 'page.tsx'],
      ['admin', 'operation', 'memo-reports', 'page.tsx'],
      ['admin', 'operation', 'rewards', 'page.tsx'],
      ['admin', 'security', 'authority', 'page.tsx'],
      ['admin', 'stats', 'page.tsx'],
      ['admin', 'system', 'audit', 'page.tsx'],
      ['admin', 'system', 'banner', 'page.tsx'],
      ['admin', 'system', 'common-code', 'page.tsx'],
      ['admin', 'system', 'ism', 'page.tsx'],
      ['admin', 'system', 'logs', 'page.tsx'],
      ['admin', 'system', 'logs', 'login', 'page.tsx'],
      ['admin', 'system', 'logs', 'privacy', 'page.tsx'],
      ['admin', 'system', 'logs', 'system', 'page.tsx'],
      ['admin', 'system', 'logs', 'user', 'page.tsx'],
      ['admin', 'system', 'logs', 'web', 'page.tsx'],
      ['admin', 'system', 'menus', 'by-authority', 'page.tsx'],
      ['admin', 'system', 'menus', 'page.tsx'],
      ['admin', 'system', 'network', 'page.tsx'],
      ['admin', 'system', 'programs', 'page.tsx'],
      ['admin', 'user', 'absences', 'page.tsx'],
      ['admin', 'user', 'departments', 'page.tsx'],
      ['admin', 'user', 'indvdl-info-policy', 'page.tsx'],
      ['admin', 'user', 'login-policy', 'page.tsx'],
      ['admin', 'user', 'manage', 'page.tsx'],
      ['admin', 'uss', 'ion', 'sms', 'page.tsx'],
      ['admin', 'uss', 'olh', 'online-manual', 'page.tsx'],
    ];

    for (const pathParts of routeFallbackSources) {
      expect(readAppSource(...pathParts), pathParts.join('/')).toMatch(/<h1\b/);
    }

    expect(readAppSource('admin', 'system', 'monitoring', 'MonitoringHubSkeleton.tsx')).toMatch(/<h1\b/);
  });

  it('client-local Suspense fallback도 최종 화면과 교대하는 h1을 제공한다', () => {
    const localFallbackSources = [
      ['admin', 'community', 'board', 'CommunityBoardClient.tsx'],
      ['admin', 'community', '[id]', 'CommunityDetailClient.tsx'],
      ['login', 'LoginClient.tsx'],
      ['search', 'SearchShell.tsx'],
      ['survey', 'stats', 'SurveyStatsClient.tsx'],
    ];

    for (const pathParts of localFallbackSources) {
      expect(readAppSource(...pathParts), pathParts.join('/')).toMatch(
        /<Suspense\s+fallback\s*=\s*\{[\s\S]*?<h1\b/,
      );
    }
  });
});
