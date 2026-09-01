import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_PAGE_UNIT } from '@/lib/api/fetch-all-pages';

const FRONTEND_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SRC_DIR = join(FRONTEND_DIR, 'src');
const BASE_SEARCH_DTO = join(
  FRONTEND_DIR,
  '..',
  'business-core',
  'src',
  'main',
  'java',
  'nuri',
  'business',
  'domain',
  'common',
  'BaseSearchDto.java',
);

function productionSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : productionSources(path);
    }
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) return [];
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) return [];
    return [path];
  });
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
}

function pageUnitLiteralViolations(source: string, path: string): string[] {
  return [...stripComments(source).matchAll(/\bpageUnit\s*:\s*(\d[\d_]*)\b/g)]
    .filter((match) => Number(match[1].replaceAll('_', '')) > MAX_PAGE_UNIT)
    .map((match) => `${path}:${match[1]}`);
}

describe('BaseSearchDto pageUnit 경계 계약', () => {
  it('프론트 상한은 백엔드 BaseSearchDto SSOT와 일치한다', () => {
    const backendSource = readFileSync(BASE_SEARCH_DTO, 'utf8');
    const match = backendSource.match(/public static final int MAX_PAGE_UNIT\s*=\s*(\d+)\s*;/);

    expect(match, 'BaseSearchDto.MAX_PAGE_UNIT 선언을 찾을 수 없습니다.').not.toBeNull();
    expect(Number(match?.[1])).toBe(MAX_PAGE_UNIT);
  });

  it('프론트 운영 요청은 서버 상한을 넘는 pageUnit 리터럴을 보내지 않는다', () => {
    const violations = productionSources(SRC_DIR).flatMap((path) => {
      const source = stripComments(readFileSync(path, 'utf8'));
      return pageUnitLiteralViolations(
        source,
        relative(FRONTEND_DIR, path).split(sep).join('/'),
      );
    });

    expect(
      violations,
      violations.length > 0
        ? `BaseSearchDto.MAX_PAGE_UNIT(${MAX_PAGE_UNIT}) 초과 요청:\n${violations.join('\n')}`
        : '',
    ).toEqual([]);
  });

  it('부정 제어: 일반 숫자와 구분자 숫자의 상한 위반을 모두 탐지한다', () => {
    expect(pageUnitLiteralViolations(
      'const a = { pageUnit: 101 }; const b = { pageUnit: 1_000 };',
      'synthetic.ts',
    )).toEqual(['synthetic.ts:101', 'synthetic.ts:1_000']);
  });
});
