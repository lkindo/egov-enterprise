import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const EXPECTED_IMPORTERS = [
  'src/app/admin/stats/AdminStatsClient.tsx',
  'src/app/admin/survey/stats/SurveyStatsClient.tsx',
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

  it('/admin/survey/stats가 셸을 경유하고 임베드 시 제목을 중첩하지 않는다', () => {
    const client = source('src/app/admin/survey/stats/SurveyStatsClient.tsx');

    expect(client).toMatch(/<ReportPage[\s>]/);
    expect(client).toMatch(/basis=\{/);
    expect(client).toMatch(/headingLevel=\{embedded \? 2 : 1\}/);
    expect(client).toContain('showBreadcrumb={!embedded}');
    // 응답 합계가 서버 전체가 아니라 현재 페이지 기준이라는 사실을 화면이 밝힌다.
    expect(client).toContain('현재 페이지');
  });

  it('/admin/stats가 지표·차트·원본 표를 한 화면에서 함께 제공한다', () => {
    const client = source('src/app/admin/stats/AdminStatsClient.tsx');

    expect(client).toMatch(/<ReportPage\b/);
    expect(client).toMatch(/basis=\{/);
    expect(client).toMatch(/<StandardChartWrapper\b/);
    expect(client).toMatch(/<StandardDataTable\b/);
    // e2e(StatsPage)가 붙잡는 접근 이름 — 셸 이행 뒤에도 같은 이름으로 남는다.
    expect(client).toContain('title="관리자 통계"');
    expect(client).toContain('aria-label="새로고침"');
    expect(client).toContain('title="일자별 접속 건수 추이"');
  });
});
