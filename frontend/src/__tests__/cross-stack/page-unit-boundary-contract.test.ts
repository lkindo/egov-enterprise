// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_PAGE_UNIT } from '@/lib/api/fetch-all-pages';
import { codeWithoutComments } from '../../../../scripts/code-without-comments.mjs';

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

/**
 * 서버 상한을 넘는 페이지 크기 리터럴 — `size`(ADR-0036 의 HTTP 이름)와 옛 이름 `pageUnit`. 주석 속 언급은 세지 않는다 —
 * 공용 판정(scripts/code-without-comments.mjs)이 주석만 지운다.
 * 종전 정규식 제거는 문자열 속 주석 기호(URL 의 `//`, 경로의 와일드카드)에서 주석을 열어 그 뒤 코드를 지웠고, 그 구간의
 * 리터럴은 넣어도 녹색이었다(FE-CONTRACT-01).
 *
 * [ADR-0036] 종전에는 pageUnit 만 보아 Pageable 목록에 `size: 200` 을 보내던 외부인사 화면을 놓쳤다(Pageable 상한 2000 이
 * 조용히 받아 줬다). 지금은 두 바인딩 모두 상한 100 을 넘으면 400 이다. 생산 소스의 세 자리 `size` 리터럴은 페이지 요청뿐이다
 * (2026-10-19 실측) — 페이지가 아닌 `size` 가 상한을 넘게 되면 그 호출부를 보고 판정을 좁힌다(H4).
 */
function pageUnitLiteralViolations(source: string, path: string): string[] {
  return [...codeWithoutComments(source, path).matchAll(/\b(?:size|pageUnit)\s*:\s*(\d[\d_]*)\b/g)]
    .filter((match) => Number(match[1].replaceAll('_', '')) > MAX_PAGE_UNIT)
    .map((match) => `${path}:${match[1]}`);
}

describe('페이지 크기(size) 상한 경계 계약', () => {
  it('프론트 상한은 백엔드 BaseSearchDto SSOT와 일치한다', () => {
    const backendSource = readFileSync(BASE_SEARCH_DTO, 'utf8');
    const match = backendSource.match(/public static final int MAX_PAGE_UNIT\s*=\s*(\d+)\s*;/);

    expect(match, 'BaseSearchDto.MAX_PAGE_UNIT 선언을 찾을 수 없습니다.').not.toBeNull();
    expect(Number(match?.[1])).toBe(MAX_PAGE_UNIT);
  });

  it('프론트 운영 요청은 서버 상한을 넘는 size 리터럴을 보내지 않는다', () => {
    const files = productionSources(SRC_DIR);
    expect(files.length, '생산 소스를 찾지 못했다 — 계약이 공허하다').toBeGreaterThan(50);
    const violations = files.flatMap((path) => pageUnitLiteralViolations(
      readFileSync(path, 'utf8'),
      relative(FRONTEND_DIR, path).split(sep).join('/'),
    ));

    expect(
      violations,
      violations.length > 0
        ? `BaseSearchDto.MAX_PAGE_UNIT(${MAX_PAGE_UNIT}) 초과 요청:\n${violations.join('\n')}`
        : '',
    ).toEqual([]);
  });

  it('부정 제어: 일반 숫자와 구분자 숫자의 상한 위반을 모두 탐지한다', () => {
    expect(pageUnitLiteralViolations(
      'const a = { pageUnit: 101 }; const b = { pageUnit: 1_000 }; const c = getEvents({ page: 1, size: 200 }); const d = { size: 100 };',
      'synthetic.ts',
    )).toEqual(['synthetic.ts:101', 'synthetic.ts:1_000', 'synthetic.ts:200']);
  });

  it('부정 제어: 문자열 속 주석 기호 뒤의 리터럴도 잡고 주석 속 언급은 세지 않는다', () => {
    // 실측 모양(FE-CONTRACT-01): 백엔드 기본 주소 'http://…' 의 `//` 를 종전 정규식이 줄 주석으로 보아 그 줄 뒤를 지웠다.
    const source = [
      "const users = fetchUsers('http://127.0.0.1:8080/api/v1', { pageUnit: 5000 });",
      '// { pageUnit: 9999 } 는 보내지 않는다',
    ].join('\n');
    expect(pageUnitLiteralViolations(source, 'synthetic.ts'), '문자열 속 주석 기호 뒤의 리터럴을 놓쳤다').toEqual(['synthetic.ts:5000']);
  });
});
