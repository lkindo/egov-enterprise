import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 🚫 날짜 표기 통일 게이트 — 시스템의 모든 날짜는 `yyyy-MM-dd` 다(2026-09-08 사용자 결정).
 *
 * <p>표기 SSOT 는 {@code lib/format-date.ts} 이며 기본 구분자가 이미 `-` 다. 그런데 그 유틸을
 * 우회하거나 구분자를 바꿔 넘긴 화면들이 남아 `yyyy.MM.dd`·`MM.dd`·브라우저 로케일 표기가
 * 섞여 있었다. 같은 저장소 안에서 같은 종류의 값이 화면마다 다른 모양으로 보이면
 * 사용자는 그것을 다른 데이터로 읽는다.
 *
 * <p>이 게이트가 막는 것은 셋이다.
 * <ol>
 *   <li><b>점 구분 날짜 포맷 문자열</b> — {@code format(x, 'yyyy.MM.dd')} 같은 date-fns 패턴.</li>
 *   <li><b>{@code toDisplayYmd} 에 구분자를 넘기는 호출</b> — 세 번째 인자를 쓰면 표기가 갈린다.</li>
 *   <li><b>로케일 의존 날짜 표기</b> — {@code toLocaleDateString()} 과 {@code Date} 에 건
 *       {@code toLocaleString()} 은 브라우저마다 자릿수·구분자·오전/오후가 달라진다.
 *       (숫자 천단위 구분에 쓰는 {@code number.toLocaleString()} 은 대상이 아니다.)</li>
 * </ol>
 *
 * <p><b>BASELINE 없음(0 고정)</b> — 표기가 갈릴 정당한 잔여가 없다. 축 눈금처럼 연도를 떼야 하는
 * 자리는 {@code 'MM-DD'} 처럼 <b>구분자를 지킨 채</b> 잘라 쓰므로 이 규칙과 충돌하지 않는다.
 */
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..');

/** date-fns 등에 넘기는 점 구분 날짜 패턴 — 'yyyy.MM.dd', 'MM.dd', 'yy.MM.dd' 를 모두 잡는다. */
const DOTTED_DATE_PATTERN = /['"`](?:y{2,4}\.)?MM\.dd(?:\.[a-zA-Z]+)?[^'"`]*['"`]/;

/** toDisplayYmd(value, fallback, separator) — 세 번째 인자를 넘기면 표기가 갈린다. */
const SEPARATOR_ARGUMENT = /toDisplayYmd\s*\([^)]*,[^)]*,[^)]*\)/;

/** Date 인스턴스에 건 로케일 표기. 숫자의 toLocaleString 은 제외한다. */
const LOCALE_DATE = /(?:new\s+Date\s*\([^)]*\)|\bparsed|\btimestamp)\s*\.\s*toLocale(?:Date)?String\s*\(|\.toLocaleDateString\s*\(/;

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
}

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '__tests__') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(path));
    else if (/\.(tsx|ts|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(path);
  }
  return out;
}

describe('date format guard', () => {
  it('사용자에게 보이는 날짜는 점 구분이나 로케일 표기를 쓰지 않는다', () => {
    const offenders: string[] = [];

    for (const file of collectFiles(SRC)) {
      const source = stripComments(readFileSync(file, 'utf8'));
      const where = relative(SRC, file).replace(/\\/g, '/');

      if (DOTTED_DATE_PATTERN.test(source)) offenders.push(`${where} — 점 구분 날짜 포맷`);
      // 구분자 파라미터를 **정의**하는 SSOT 자신은 대상이 아니다(정의가 없으면 기본값도 없다).
      if (where !== 'lib/format-date.ts' && SEPARATOR_ARGUMENT.test(source)) {
        offenders.push(`${where} — toDisplayYmd 구분자 인자`);
      }
      if (LOCALE_DATE.test(source)) offenders.push(`${where} — 로케일 의존 날짜 표기`);
    }

    expect(offenders, `날짜 표기는 yyyy-MM-dd 하나다(lib/format-date SSOT):\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('표기 SSOT 의 기본 구분자가 하이픈이다 — 기본값이 바뀌면 전 화면이 함께 흔들린다', () => {
    const source = readFileSync(join(SRC, 'lib', 'format-date.ts'), 'utf8');
    expect(source).toMatch(/separator\s*=\s*'-'/);
  });
});
