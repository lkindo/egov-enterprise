import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inProjection, keepInProjection } from '@/test-utils/projection';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const APP_DIR = join(FRONTEND_DIR, 'src', 'app');
const A7_IMPORT = /from\s+['"]@\/app\/components\/patterns\/report-page['"]/;

/**
 * A7(현황 + 원본 표) 채택 census.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A7.
 *
 * A7 의 고유한 실패는 "차트만 남고 원본이 사라지는 것"이라 셸이 구조로 막는다
 * (children·basis 가 필수 prop). 이 census 는 그 구조가 실제로 소비되는지와,
 * 소비 화면이 원본 표를 계속 렌더하는지를 exact 로 고정한다.
 */
// 선택하지 않은 기능의 파일은 생성물에서 투영으로 빠진다 — 원장에 있고 실제로 없는 파일만 뺀다(원본에서는 그대로다).
const EXPECTED_IMPORTERS = keepInProjection([
  // [2026-10-24 DEC-OPS-382] 패턴 갤러리의 A7 표본(정적 표본, 시연 기능 소유).
  'src/app/admin/patterns/ReportSample.tsx',
  'src/app/admin/stats/AdminStatsClient.tsx',
  // [2026-10-20] 통계 하위 화면(사용자·성공 로그인과 기능이 넘기는 탭)을 A7 셸로 옮겼다.
  'src/app/admin/stats/IntelligenceHubClient.tsx',
  'src/app/admin/survey/stats/SurveyStatsClient.tsx',
], file => join(FRONTEND_DIR, file));

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

describe('A7 report adoption census', () => {
  it('A7 셸 importer를 exact 고정한다', () => {
    const importers = screenFiles(APP_DIR)
      .filter((path) => A7_IMPORT.test(readFileSync(path, 'utf8')))
      .map((path) => relative(FRONTEND_DIR, path).split(sep).join('/'))
      .sort();

    expect(importers).toEqual(EXPECTED_IMPORTERS);
  });

  it('셸이 원본 표와 집계 근거를 선택 사항으로 만들지 않는다', () => {
    const shell = source('src/app/components/patterns/report-page.tsx');

    // children(원본 표)·basis(집계 기준·출처)가 optional 이 되는 순간 차트만 있는 화면이 가능해진다.
    expect(shell, '원본 표가 선택 prop 이 되었습니다').toMatch(/children: React\.ReactNode;/);
    expect(shell, '집계 근거가 선택 prop 이 되었습니다').toMatch(/basis: React\.ReactNode;/);
    expect(shell).not.toMatch(/children\?: React\.ReactNode;/);
    expect(shell).not.toMatch(/basis\?: React\.ReactNode;/);
    // 조회 조건 슬롯은 하나뿐이어야 차트와 표가 다른 조건으로 갈라지지 않는다.
    expect(shell.match(/filter\?: React\.ReactNode;/g)).toHaveLength(1);
  });

  if (inProjection(join(FRONTEND_DIR, 'src/app/admin/survey/stats/SurveyStatsClient.tsx'))) it('/admin/survey/stats가 셸을 경유하고 임베드 시 제목을 중첩하지 않는다', () => {
    const client = source('src/app/admin/survey/stats/SurveyStatsClient.tsx');

    expect(client).toMatch(/<ReportPage[\s>]/);
    expect(client).toMatch(/basis=\{/);
    expect(client).toMatch(/headingLevel=\{embedded \? 2 : 1\}/);
    expect(client).toContain('showBreadcrumb={!embedded}');
    // 응답 합계가 서버 전체가 아니라 현재 페이지 기준이라는 사실을 화면이 밝힌다.
    expect(client).toContain('현재 페이지');
  });

  /*
    [2026-10-20] 통계 하위 화면은 셸 없이 직접 조립했고 장식(기울인 아이콘 상자·올라가는 카드·굵기 900 축 글자·밑줄 접두 라벨)과
    모든 탭에 걸친 요약 카드가 있었다. A7 셸로 옮기며 걷었다 — 되살아나면 이 계약이 붉다. 통계 개요도 같은 셸이 같은 내비게이션 아래에
    그린다(개요에서 되돌아갈 길이 끊기던 문제).
  */
  it('통계 하위 화면이 셸을 경유하고 내비게이션을 개요와 함께 쓰며 장식을 되살리지 않는다', () => {
    const shell = source('src/app/admin/stats/IntelligenceHubClient.tsx');
    const overviewPage = source('src/app/admin/stats/page.tsx');
    const overview = source('src/app/admin/stats/AdminStatsClient.tsx');

    expect(shell).toMatch(/<ReportPage\b/);
    expect(shell).toMatch(/basis=\{/);
    expect(shell).toMatch(/<StandardChartWrapper\b/);
    expect(shell).toMatch(/<StandardDataTable\b/);
    expect(shell).toMatch(/navigation=\{navigation\}/);
    // 셸은 서버가 그린 요약 화면 둘레에 내비게이션을 둔다 — 요약 화면을 import 하지 않는다(요약 칸 귀속이 하위 화면에 번지지 않게).
    expect(shell).toMatch(/<StatsHubNavigationProvider value=\{navigation\}>\{overview\}<\/StatsHubNavigationProvider>/);
    expect(shell).not.toMatch(/from '\.\/AdminStatsClient'/);
    expect(overview).toContain('useStatsHubNavigation()');
    expect(overview).toMatch(/navigation=\{navigation\}/);
    expect(overviewPage).toMatch(/<IntelligenceHubClient\b[\s\S]*?defaultTab="DASHBOARD"[\s\S]*?overview=\{\(\s*<AdminStatsClient\b/);
    for (const decoration of ['skew-x-', 'hover:scale-', 'fontWeight: 900', '>_ {', 'shadow-2xl', 'framer-motion']) {
      expect(shell, `통계 셸에 장식이 되살아났다: ${decoration}`).not.toContain(decoration);
      expect(overview, `통계 개요에 장식이 되살아났다: ${decoration}`).not.toContain(decoration);
    }
  });

  it('/admin/stats가 지표·차트·원본 표를 한 화면에서 함께 제공한다', () => {
    const client = source('src/app/admin/stats/AdminStatsClient.tsx');

    expect(client).toMatch(/<ReportPage\b/);
    expect(client).toMatch(/basis=\{/);
    expect(client).toMatch(/<StandardChartWrapper\b/);
    expect(client).toMatch(/<StandardDataTable\b/);
    // e2e(StatsPage)가 붙잡는 접근 이름 — 실제 성공 로그인 집계 의미와 일치해야 한다.
    expect(client).toContain('title="관리자 통계"');
    expect(client).toContain('aria-label="새로고침"');
    expect(client).toContain('title="일자별 성공 로그인 건수 추이"');
  });
});
