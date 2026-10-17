// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { codeWithoutComments, productionSourceFiles } from '../../../scripts/code-without-comments.mjs';

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
 * <p>주석 속 언급은 세지 않는다 — 공용 판정(scripts/code-without-comments.mjs)이 주석만 지운다. 종전의 정규식 제거는
 * 문자열 속 주석 기호에서 블록 주석을 열어 그 뒤 코드를 통째로 지웠다(FE-CONTRACT-01).
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

/** 한 파일의 위반. `where` 는 src 기준 경로다(표기 SSOT 자신을 가린다). */
function dateFormatOffenders(where: string, source: string): string[] {
  const code = codeWithoutComments(source, where);
  const offenders: string[] = [];
  if (DOTTED_DATE_PATTERN.test(code)) offenders.push(`${where} — 점 구분 날짜 포맷`);
  // 구분자 파라미터를 **정의**하는 SSOT 자신은 대상이 아니다(정의가 없으면 기본값도 없다).
  if (where !== 'lib/format-date.ts' && SEPARATOR_ARGUMENT.test(code)) {
    offenders.push(`${where} — toDisplayYmd 구분자 인자`);
  }
  if (LOCALE_DATE.test(code)) offenders.push(`${where} — 로케일 의존 날짜 표기`);
  return offenders;
}

describe('date format guard', () => {
  it('사용자에게 보이는 날짜는 점 구분이나 로케일 표기를 쓰지 않는다', () => {
    const files = productionSourceFiles(SRC, ['.ts', '.tsx', '.jsx']);
    expect(files.length, '생산 소스를 찾지 못했다 — 가드가 공허하다').toBeGreaterThan(50);
    const offenders = files.flatMap((file) => dateFormatOffenders(relative(SRC, file).replace(/\\/g, '/'), readFileSync(file, 'utf8')));

    expect(offenders, `날짜 표기는 yyyy-MM-dd 하나다(lib/format-date SSOT):\n${offenders.join('\n')}`)
      .toEqual([]);
  });

  it('문자열 속 주석 기호 뒤의 표기도 잡고 주석 속 언급은 세지 않는다', () => {
    // 실측 모양(FE-CONTRACT-01): 게시글 상세의 목록 출처 '/cop/cmy/selectCommunityDetail/*' 뒤에 넣은 점 구분 표기를 종전 정규식
    //   제거가 아래 블록 주석까지 함께 지워 놓쳤다. 주석 속 표기는 세지 않는다.
    const injected = [
      "const BOARD_LIST_ORIGINS = ['/admin/help', '/cop/cmy/selectCommunityDetail/*'] as const;",
      "const label = format(date, 'yyyy.MM.dd');",
      '/* 블록 주석 */',
    ].join('\n');
    expect(dateFormatOffenders('app/x/BoardDetailClient.tsx', injected)).toEqual(['app/x/BoardDetailClient.tsx — 점 구분 날짜 포맷']);
    expect(dateFormatOffenders('app/x/Note.tsx', "// format(date, 'yyyy.MM.dd')\n/* new Date().toLocaleDateString() */\nexport {};"))
      .toEqual([]);
  });

  it('표기 SSOT 의 기본 구분자가 하이픈이다 — 기본값이 바뀌면 전 화면이 함께 흔들린다', () => {
    const source = readFileSync(join(SRC, 'lib', 'format-date.ts'), 'utf8');
    expect(source).toMatch(/separator\s*=\s*'-'/);
  });
});
