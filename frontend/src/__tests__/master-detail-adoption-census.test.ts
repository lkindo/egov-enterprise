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
  'src/app/admin/security/dept-authority/SecurityDeptAuthorityClient.tsx',
  'src/app/admin/system/common-code/CommonCodeClient.tsx',
  'src/app/admin/system/menus/MenuAdminClient.tsx',
  'src/app/admin/user/UserOrgHubClient.tsx',
  'src/app/approvals/ApprovalHubClient.tsx',
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
  it('A2 셸 importer를 부서·메뉴·메일 이력·공통코드·결재함·조직권한 여섯 소비자로 exact 고정한다', () => {
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

  it('/approvals가 전체 A2 페이지 셸과 선택 시맨틱을 경유한다', () => {
    const client = source('src/app/approvals/ApprovalHubClient.tsx');

    expect(client).toMatch(/<MasterDetailPage\b/);
    expect(client).toContain('data-a2-master-item');
    expect(client).toContain("aria-current={isSelected ? 'true' : undefined}");
    // e2e(11-enterprise-workflow)가 붙잡는 두 접근 이름 — 셸 이행 뒤에도 같은 이름으로 남는다.
    expect(client).toContain('title="결재 허브"');
    expect(client).toContain('새 결재 기안');
    // 이름만 고정하면 **역할이 바뀐 것**을 놓친다(2026-08-24 CI 실측: 기안 버튼이 button -> link 로
    // 바뀌어 e2e 가 180초 타임아웃). [2026-09-05] 상신은 같은 화면의 다이얼로그가 실제 API 로
    // 수행하므로 페이지 이동이 없다 — 이제는 button 이 옳은 역할이고, 목업 라우트로 가는 링크가
    // 되살아나면 red 다.
    expect(client).toMatch(/<Button type="button" onClick=\{\(\) => setDraftOpen\(true\)\}>/);
    expect(client).not.toMatch(/<Link href="\/approvals\/draft">/);
    expect(client).toMatch(/isDraftOpen \? \(\s*<ApprovalDraftDialog\b/);
    // 표가 아니라 compact 마스터 목록이다 — 6열 표를 좁은 마스터 폭에 두지 않는다.
    expect(client).not.toMatch(/from\s+['"]@\/app\/components\/ui\/standard-data-table['"]/);
  });

  it('결재함 탭은 실제 질의 축을 이름으로 말하고 죽은 보관함 컨트롤을 두지 않는다', () => {
    const client = source('src/app/approvals/ApprovalHubClient.tsx');
    const queries = source('src/queries/approval-query-options.ts');

    // 종전 ARCHIVE 탭은 처리 이력과 같은 데이터를 다른 이름으로 보여줬고, 그 뒤 '결재 처리 이력' 탭은
    // 신청자 기준(/approvals/my)을 불렀다. [2026-09-05] 세 탭이 각각 자기 축의 API 를 부른다 —
    // 대기(pending)·내가 올린(my)·내가 처리한(processed). 비활성 보관함 버튼은 G10 에 따라 걷었다.
    expect(client).not.toMatch(/setActiveTab\('ARCHIVE'\)/);
    expect(client).not.toContain('결재 문서 보관함');
    expect(client).not.toContain('결재 처리 이력');
    expect(client).toContain("SUBMITTED: '내가 올린 결재'");
    expect(client).toContain("PROCESSED: '내가 처리한 결재'");
    expect(queries).toMatch(/case 'SUBMITTED':\s*return approvalUserService\.getMyHistory\(params\)/);
    expect(queries).toMatch(/case 'PROCESSED':\s*return approvalUserService\.getProcessed\(params\)/);
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
      // 조직 권한 일괄 관리도 선택 식별자(ognzId)를 가진 A2 소비자다 — 같은 금지 계약을 받는다.
      source('src/app/admin/security/dept-authority/SecurityDeptAuthorityClient.tsx'),
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
      '/admin/security/dept-authority',
    ]);
    const targetSources = new Set([
      'frontend/src/app/admin/system/menus/MenuAdminClient.tsx',
      'frontend/src/app/admin/user/UserOrgHubClient.tsx',
      'frontend/src/app/admin/collaboration/mail-history/MailHistoryHubClient.tsx',
      'frontend/src/app/admin/security/dept-authority/SecurityDeptAuthorityClient.tsx',
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
