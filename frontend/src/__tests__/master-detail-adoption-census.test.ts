import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');
const URL_CENSUS_PATH = join(FRONTEND_DIR, '..', 'config', 'ui-url-state-census.json');
const A2_IMPORT = /from\s+['"]@\/app\/components\/patterns\/master-detail-page['"]/;
const FORBIDDEN_SELECTION_IDS = new Set(['menuId', 'menuNo', 'ognzId', 'deptId']);

const EXPECTED_IMPORTERS = [
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
  it('A2 셸 importer를 부서·메뉴 두 소비자로 exact 고정한다', () => {
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

  it('승인 전 record identifier를 URL이나 브라우저 저장소에 복원하지 않는다', () => {
    const consumers = [
      source('src/app/admin/system/menus/MenuAdminClient.tsx'),
      source('src/app/admin/user/UserOrgHubClient.tsx'),
    ].join('\n');

    expect(consumers).not.toMatch(
      /(?:searchParams|params)\.(?:get|set|append)\(\s*['"](?:menuId|menuNo|ognzId|deptId)['"]/,
    );
    expect(consumers).not.toMatch(/(?:localStorage|sessionStorage)\.(?:getItem|setItem)\(/);
    expect(consumers).not.toMatch(/['"`][^'"`\n]*[?&](?:menuId|menuNo|ognzId|deptId)=/);
    expect(consumers).not.toMatch(/new URLSearchParams\s*\(\s*\{[^}]*\b(?:menuId|menuNo|ognzId|deptId)\s*:/);
    expect(consumers).not.toMatch(
      /(?:localStorage|sessionStorage)(?:\.(?:menuId|menuNo|ognzId|deptId)|\[['"](?:menuId|menuNo|ognzId|deptId)['"]\])/,
    );

    const census = JSON.parse(readFileSync(URL_CENSUS_PATH, 'utf8')) as {
      records: Array<{
        routePattern?: string;
        source?: string;
        stateItems?: Array<{ name?: string }>;
      }>;
    };
    const targetRoutes = new Set(['/admin/system/menus', '/admin/user/departments']);
    const targetSources = new Set([
      'frontend/src/app/admin/system/menus/MenuAdminClient.tsx',
      'frontend/src/app/admin/user/UserOrgHubClient.tsx',
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
