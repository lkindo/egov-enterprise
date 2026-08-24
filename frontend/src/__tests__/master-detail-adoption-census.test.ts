import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');
const URL_CENSUS_PATH = join(FRONTEND_DIR, '..', 'config', 'ui-url-state-census.json');
const A2_IMPORT = /from\s+['"]@\/app\/components\/patterns\/master-detail-page['"]/;
const FORBIDDEN_SELECTION_IDS = new Set(['menuId', 'menuNo', 'ognzId', 'deptId', 'emlDsptchSn']);

const EXPECTED_IMPORTERS = [
  'src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx',
  'src/app/admin/system/common-code/CommonCodeClient.tsx',
  'src/app/admin/system/menus/MenuAdminClient.tsx',
  'src/app/admin/user/UserOrgHubClient.tsx',
];

function screenFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : screenFiles(path);
    if (!entry.name.endsWith('.tsx') || entry.name === 'loading.tsx' || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

function source(relativePath: string): string {
  return readFileSync(join(FRONTEND_DIR, relativePath), 'utf8');
}

describe('A2 master-detail adoption census', () => {
  it('A2 셸 importer를 부서·메뉴·메일 이력·공통코드 네 소비자로 exact 고정한다', () => {
    const importers = screenFiles(APP_DIR)
      .filter((path) => A2_IMPORT.test(readFileSync(path, 'utf8')))
      .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
      .sort();

    expect(importers).toEqual(EXPECTED_IMPORTERS);
  });

  it('/admin/system/menus가 전체 A2 페이지 셸과 선택 시맨틱을 경유한다', () => {
    const route = source('src/app/admin/system/menus/page.tsx');
    const client = source('src/app/admin/system/menus/MenuAdminClient.tsx');

    expect(route).toMatch(/<MenuAdminClient\b/);
    expect(client).toMatch(/<MasterDetailPage\b/);
    expect(client).toContain('data-a2-master-item');
    expect(client).toContain("aria-current={isSelected ? 'true' : undefined}");
    expect(client).toContain('aria-label="메뉴 검색"');
  });

  it('/admin/user/departments만 공유 허브의 A2 레이아웃을 활성화한다', () => {
    const route = source('src/app/admin/user/departments/page.tsx');
    const client = source('src/app/admin/user/UserOrgHubClient.tsx');

    expect(route).toMatch(/<UserOrgHubClient[\s\S]*defaultTab="DEPTS"/);
    expect(client).toMatch(/<MasterDetailLayout[\s\S]*active=\{activeTab === 'DEPTS'\}/);
    expect(client).toContain('data-a2-master-item');
    expect(client).toContain("aria-label={activeTab === 'DEPTS' ? '부서 조직 구조'");
    expect(client).toContain("data-a2-detail={activeTab === 'DEPTS' ? '' : undefined}");
  });

  it('/admin/collaboration/mail-history가 전체 A2 페이지 셸과 선택 시맨틱을 경유한다', () => {
    const route = source('src/app/admin/collaboration/mail-history/page.tsx');
    const client = source('src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx');

    expect(route).toMatch(/<MailHistoryHubClient\b/);
    expect(client).toMatch(/<MasterDetailPage\b/);
    expect(client).toContain('data-a2-master-item');
    expect(client).toContain("aria-current={isSelected ? 'true' : undefined}");
    expect(client).toContain('aria-label="메일 검색"');
  });

  it('/admin/system/common-code의 STANDARD만 전체 A2 페이지 셸을 사용하고 두 A1 탭은 보존한다', () => {
    const route = source('src/app/admin/system/common-code/page.tsx');
    const hub = source('src/app/admin/system/common-code/CommonCodeHubClient.tsx');
    const client = source('src/app/admin/system/common-code/CommonCodeClient.tsx');
    const administ = source('src/app/admin/system/codes/administ/AdministCodeClient.tsx');
    const institution = source('src/app/admin/system/codes/institution/InstitutionCodeClient.tsx');

    expect(route).toMatch(/<CommonCodeHubClient\b/);
    expect(hub).toMatch(/activeTab\s*===\s*['"]STANDARD['"]\s*\?\s*\(\s*<CommonCodeClient\b/);
    expect(hub.match(/<PageHeader\b/g)).toHaveLength(1);
    expect(hub).toMatch(/<PageHeader\b[\s\S]*?animateEntrance=\{false\}/);
    expect(hub).toMatch(/<CommonCodeClient\b[^>]*\bembedded\b\s*\/>/);
    expect(client).toMatch(/<MasterDetailPage\b/);
    expect(client).toContain('data-a2-master-item');
    expect(client).toContain("aria-current={isSelected ? 'true' : undefined}");
    expect(client).toContain('aria-label="분류·그룹명 또는 코드로 검색"');

    expect(hub).toMatch(/activeTab\s*===\s*['"]ADMINIST['"]\s*\?\s*\(\s*<AdministCodeClient\b/);
    expect(hub).toMatch(/<AdministCodeClient\b[\s\S]*?\)\s*:\s*\(\s*<InstitutionCodeClient\b/);
    expect(hub).toMatch(/<AdministCodeClient\b[^>]*\bembedded\b\s*\/>/);
    expect(hub).toMatch(/<InstitutionCodeClient\b[^>]*\bembedded\b\s*\/>/);
    expect(hub).not.toMatch(/<(?:HubHeader|HubMetricGrid|HubMetricCard)\b/);
    expect(administ).toMatch(/headingLevel=\{embedded\s*\?\s*2\s*:\s*1\}/);
    expect(institution).toMatch(/headingLevel=\{embedded\s*\?\s*2\s*:\s*1\}/);
    expect(administ).toContain('showBreadcrumb={!embedded}');
    expect(institution).toContain('showBreadcrumb={!embedded}');
    expect(administ).toMatch(/<WorkListPage\b/);
    expect(institution).toMatch(/<WorkListPage\b/);
    expect(administ).not.toMatch(A2_IMPORT);
    expect(institution).not.toMatch(A2_IMPORT);
  });

  it('공통코드 groupId URL 소비는 기존 미승인 legacy 한 건으로 고정하고 새 producer·저장소를 만들지 않는다', () => {
    const route = source('src/app/admin/system/common-code/page.tsx');
    const codeClients = [
      source('src/app/admin/system/common-code/CommonCodeClient.tsx'),
      source('src/app/admin/system/common-code/CommonCodeHubClient.tsx'),
    ].join('\n');

    expect(route).toMatch(/typeof\s+rawGroupId\s*===\s*['"]string['"]/);
    expect(route).toMatch(/item\.cdId\s*===\s*groupId/);
    expect(codeClients).not.toMatch(/(?:searchParams|params)\.(?:set|append)\(\s*['"]groupId['"]/);
    expect(codeClients).not.toMatch(/['"`][^'"`\n]*[?&]groupId=/);
    expect(codeClients).not.toMatch(/new URLSearchParams\s*\(\s*\{[^}]*\bgroupId\s*:/);
    expect(codeClients).not.toMatch(/['"`]groupId['"`]/);
    expect(codeClients).not.toMatch(
      /(?:localStorage|sessionStorage)\.(?:getItem|setItem)\([^)]*\b(?:groupId|selectedGroupId)\b/,
    );
    expect(codeClients).not.toMatch(
      /(?:localStorage|sessionStorage)(?:\.(?:groupId|selectedGroupId)|\[['"](?:groupId|selectedGroupId)['"]\])/,
    );

    const census = JSON.parse(readFileSync(URL_CENSUS_PATH, 'utf8')) as {
      records: Array<{
        routePattern?: string;
        source?: string;
        producerFile?: string | null;
        consumerFile?: string | null;
        surface?: string;
        kind?: string;
        operation?: string;
        resolutionStatus?: string;
        ambiguityReasons?: string[];
        canonical?: { status?: string };
        review?: { status?: string; decisionSafe?: boolean };
        evidence?: { detector?: string; occurrenceCount?: number };
        stateItems?: Array<{
          name?: string;
          dataClass?: string;
          recommendation?: string;
          approvalStatus?: string;
          exception?: string;
          riskSignals?: string[];
        }>;
      }>;
    };
    const groupIdRecords = census.records.filter((record) => (
      record.routePattern === '/admin/system/common-code'
      && record.stateItems?.some((item) => item.name === 'groupId')
    ));

    expect(groupIdRecords.map((record) => ({
      routePattern: record.routePattern,
      source: record.source,
      producerFile: record.producerFile,
      consumerFile: record.consumerFile,
      surface: record.surface,
      kind: record.kind,
      operation: record.operation,
      stateItem: record.stateItems?.find((item) => item.name === 'groupId'),
      resolutionStatus: record.resolutionStatus,
      ambiguityReasons: record.ambiguityReasons,
      canonicalStatus: record.canonical?.status,
      reviewStatus: record.review?.status,
      decisionSafe: record.review?.decisionSafe,
      detector: record.evidence?.detector,
      occurrenceCount: record.evidence?.occurrenceCount,
    }))).toEqual([{
      routePattern: '/admin/system/common-code',
      source: 'frontend/src/app/admin/system/common-code/page.tsx',
      producerFile: null,
      consumerFile: 'frontend/src/app/admin/system/common-code/page.tsx',
      surface: 'navigation',
      kind: 'query-consumer',
      operation: 'read',
      stateItem: {
        name: 'groupId',
        dataClass: 'unverified',
        recommendation: 'deny',
        approvalStatus: 'unverified',
        exception: 'none-proposed',
        riskSignals: ['record-locator-name-signal'],
      },
      resolutionStatus: 'ambiguous',
      ambiguityReasons: ['producer-consumer-join-unresolved'],
      canonicalStatus: 'unverified',
      reviewStatus: 'unverified',
      decisionSafe: false,
      detector: 'server-search-param-property',
      occurrenceCount: 1,
    }]);
  });

  it('승인 전 record identifier를 URL이나 브라우저 저장소에 복원하지 않는다', () => {
    const consumers = [
      source('src/app/admin/system/menus/MenuAdminClient.tsx'),
      source('src/app/admin/user/UserOrgHubClient.tsx'),
      source('src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx'),
    ].join('\n');

    expect(consumers).not.toMatch(
      /(?:searchParams|params)\.(?:get|set|append)\(\s*['"](?:menuId|menuNo|ognzId|deptId|emlDsptchSn)['"]/,
    );
    expect(consumers).not.toMatch(/(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(/);
    expect(consumers).not.toMatch(/['"`][^'"`\n]*[?&](?:menuId|menuNo|ognzId|deptId|emlDsptchSn)=/);
    expect(consumers).not.toMatch(/new URLSearchParams\s*\(\s*\{[^}]*\b(?:menuId|menuNo|ognzId|deptId|emlDsptchSn)\s*:/);
    expect(consumers).not.toMatch(
      /(?:localStorage|sessionStorage)(?:\.(?:menuId|menuNo|ognzId|deptId|emlDsptchSn)|\[['"](?:menuId|menuNo|ognzId|deptId|emlDsptchSn)['"]\])/,
    );

    const census = JSON.parse(readFileSync(URL_CENSUS_PATH, 'utf8')) as {
      records: Array<{
        routePattern?: string;
        source?: string;
        stateItems?: Array<{ name?: string }>;
      }>;
    };
    const targetRoutes = new Set([
      '/admin/system/menus',
      '/admin/user/departments',
      '/admin/collaboration/mail-history',
    ]);
    const targetSources = new Set([
      'frontend/src/app/admin/system/menus/MenuAdminClient.tsx',
      'frontend/src/app/admin/user/UserOrgHubClient.tsx',
      'frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx',
    ]);
    const forbiddenRecords = census.records.filter((record) => (
      targetRoutes.has(record.routePattern ?? '') || targetSources.has(record.source ?? '')
    ) && record.stateItems?.some((item) => FORBIDDEN_SELECTION_IDS.has(item.name ?? '')));

    expect(forbiddenRecords).toEqual([]);
  });

  it('A2 셸은 viewport별 데이터 분기나 중복 DOM을 만들지 않는다', () => {
    const shell = source('src/app/components/patterns/master-detail-page.tsx');

    expect(shell).not.toMatch(/matchMedia|useSyncExternalStore|\{\s*ssr:\s*false\s*\}/);
    expect(shell).not.toMatch(/(?:md|lg):hidden|hidden\s+(?:md|lg):/);
    expect(shell.match(/data-testid="master-detail-master"/g)).toHaveLength(1);
    expect(shell.match(/data-testid="master-detail-detail"/g)).toHaveLength(1);
  });
});
