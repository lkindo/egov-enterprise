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

  it('실제 UI route의 검증된 주 제목은 h1이고 preview 제목은 페이지 제목을 사칭하지 않는다', () => {
    const routeHeadingSources = [
      ['admin', 'collaboration', 'scraps', 'insertScrap', 'InsertScrapClient.tsx'],
      ['admin', 'collaboration', 'scraps', 'selectScrapDetail', '[id]', 'SelectScrapDetailClient.tsx'],
      ['admin', 'collaboration', 'scraps', 'selectScrapList', 'ScrapListClient.tsx'],
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
      ['admin', 'operation', 'events', 'EventManagementClient.tsx'],
      ['admin', 'security', 'login-policy', 'LoginPolicyAdminClient.tsx'],
      ['admin', 'system', 'policies', 'PolicyAdminClient.tsx'],
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
