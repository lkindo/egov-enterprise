/**
 * 게시글 목록 기간 필터 — 서버가 읽는 형식으로 보낸다.
 *
 * ── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────────
 * 화면은 `Date.toISOString()` 을 그대로 쿼리에 실었다. 두 가지가 함께 틀렸다.
 *
 * 1. **형식.** 서버는 `LocalDate.parse(startDate)` 로 읽는데 ISO 는 시각까지 붙어 있어 파싱이
 *    실패했다. 그리고 그 실패는 `log.warn` 한 줄로 삼켜져 **기간 조건이 조용히 사라졌다** —
 *    즉 이 화면의 기간 필터는 늘 무동작이었고, 사용자는 기간을 골라도 목록이 그대로인 것을
 *    보며 "해당 기간에 글이 이만큼 있구나" 로 잘못 읽었다. 캘린더 월 이동도 같은 값을 썼다.
 *
 * 2. **시간대.** `toISOString()` 은 UTC 로 변환한다. KST(+9)에서 8월 28일 자정은 UTC 로
 *    8월 27일 15시라, 설령 서버가 ISO 를 받아들였더라도 **하루 밀린 날짜**로 조회됐을 것이다.
 *    이 축은 형식만 고치면 놓치기 쉬워서 별도 케이스로 고정한다.
 *
 * 서버 쪽(파싱 실패를 400 으로 거절)은 `BoardServiceTest` 가 함께 고정한다.
 */

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { format } from 'date-fns';
import { fromQueryDate, toQueryDate } from '../BoardListClient';

describe('기간 필터 날짜 형식', () => {
  it('서버가 읽는 yyyy-MM-dd 로 만든다', () => {
    expect(toQueryDate(new Date(2026, 7, 28))).toBe('2026-08-28');
  });

  it('월·일을 두 자리로 채운다', () => {
    expect(toQueryDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('UTC 로 변환하지 않는다 — 자정 값이 다른 날로 밀리면 안 된다', () => {
    /*
     * 사용자가 고른 날짜는 **로컬 날짜**다. toISOString() 은 UTC 로 옮기므로, 오프셋이 0 이
     * 아닌 지역에서는 자정 근처 값의 날짜 부분이 달라진다(KST +9: 8/28 00:00 → 8/27T15:00Z).
     *
     * 러너의 시간대를 가정하지 않는다 — 오프셋이 0 이면 두 값이 원래 같으므로 그때는
     * 비교 자체가 의미 없다는 사실을 그대로 적는다(조용히 통과하는 vacuous 검사 방지).
     */
    const midnight = new Date(2026, 7, 28, 0, 0, 0);
    expect(toQueryDate(midnight)).toBe('2026-08-28');

    const offsetMinutes = midnight.getTimezoneOffset();
    if (offsetMinutes !== 0) {
      expect(toQueryDate(midnight)).not.toBe(midnight.toISOString().slice(0, 10));
    } else {
      expect(midnight.toISOString().slice(0, 10)).toBe('2026-08-28');
    }
  });

  it('연말 마지막 시각도 같은 날로 남는다', () => {
    expect(toQueryDate(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
  });
});

describe('기간 필터를 ISO 문자열로 되돌리지 않는다', () => {
  const source = fs
    .readFileSync(path.resolve(__dirname, '..', 'BoardListClient.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ');

  it('startDate·endDate 쿼리 파라미터를 toQueryDate 로 만든다', () => {
    /*
      검색 제출(startDate·endDate)과 캘린더 월 이동(이전·다음) — **네 곳**이 모두 같은 형식을 써야 한다.

      [2026-09-04] 단언 형태를 갱신했다. 종전에는 `params.set('startDate', toQueryDate(` 을 3회
      셌는데, PD-UX-002 Q2 로 URL 조립이 `buildListParams({ startDate: ... })` allowlist 헬퍼로
      모이면서 그 리터럴이 사라졌다. **불변식은 그대로다** — 날짜를 쿼리에 넣는 모든 경로가
      toQueryDate 를 지난다. 형태가 아니라 그 사실을 센다.
    */
    /*
      [2026-09-05] 총 개수 단언(4)을 걷었다. 그 숫자는 불변식의 **대리 지표**였는데,
      `fromQueryDate` 신설로 정당한 호출이 3개 늘자(왕복 검증 1 + 조회 조건 직렬화 2)
      결함이 없는데도 red 가 됐다. 아래 세 단언이 URL 에 쓰는 경로를 이미 정확히 고정하므로
      숫자는 보호하는 것 없이 정상 변경만 막는다.

      대신 **결함 자체**를 막는 단언을 둔다 — URL 에서 읽은 날짜를 검증 없이 Date 로 만드는 것.
    */
    expect(source).not.toMatch(/new Date\(\s*searchParams\.get\(/u);
    expect(source).not.toMatch(/new Date\(\s*query(Start|End)Date\s*\)/u);

    // 월 이동 두 곳은 allowlist 헬퍼에 startDate 만 넘긴다.
    expect(source.match(/startDate: toQueryDate\(d\)/g) ?? []).toHaveLength(2);
    // 검색 제출은 값이 있을 때만 싣는다(두 축 모두 toQueryDate 경유).
    expect(source).toContain('startDate: startDate ? toQueryDate(startDate) : undefined');
    expect(source).toContain('endDate: endDate ? toQueryDate(endDate) : undefined');
  });

  it('쿼리 값으로 toISOString 을 쓰지 않는다', () => {
    expect(source).not.toContain('toISOString');
  });
});

/**
 * URL 날짜 파라미터 검증 (PD-UX-002 승인 근거 수집 중 발견).
 *
 * ⚠ 종전에는 `new Date(searchParams.get('startDate')!)` 로 검증 없이 받았다. **`new Date('bogus')` 는
 *   Invalid Date 를 돌려주고 그 값은 truthy** 라, `startDate ? format(startDate, …) : …` 의 참
 *   가지로 들어가 date-fns 가 `RangeError: Invalid time value` 를 던졌다. 전 페이지가
 *   force-dynamic SSR 이라(DEC-OPS-011) 그 예외는 **서버 렌더 단계에서** 터진다 —
 *   `?startDate=bogus` 링크 하나로 화면이 통째로 죽었다.
 *
 * ⚠ 이 테스트가 red 인데 `fromQueryDate` 를 느슨하게 만들어 통과시키는 것은 수정이 아니다.
 */
describe('fromQueryDate — URL 날짜는 검증해서 받는다', () => {
  it('정상 값은 로컬 자정 Date 로 돌아오고 toQueryDate 와 왕복한다', () => {
    const parsed = fromQueryDate('2026-08-28');
    expect(parsed).toBeInstanceOf(Date);
    expect(toQueryDate(parsed!)).toBe('2026-08-28');
    // 로컬 자정이어야 한다 — UTC 로 만들면 KST 에서 하루 밀린다(toQueryDate 주석의 그 결함).
    expect(parsed!.getFullYear()).toBe(2026);
    expect(parsed!.getMonth()).toBe(7);
    expect(parsed!.getDate()).toBe(28);
  });

  it.each([
    ['bogus', '형식 자체가 아님'],
    ['2026-13-45', '월·일이 범위 밖'],
    ['2026-02-30', '평년에 없는 날 — new Date 는 3월로 조용히 굴린다'],
    ['2026-8-28', '자리수 미달'],
    ['2026-08-28T00:00:00Z', 'ISO 전체 형식'],
    ['', '빈 문자열'],
  ])('잘못된 값 %s 는 없는 것으로 취급한다 (%s)', (raw) => {
    expect(fromQueryDate(raw)).toBeUndefined();
  });

  it('null·undefined 도 안전하다', () => {
    expect(fromQueryDate(null)).toBeUndefined();
    expect(fromQueryDate(undefined)).toBeUndefined();
  });

  it('윤년은 통과시킨다 — 검증이 과잉이면 정상 조회가 막힌다', () => {
    expect(toQueryDate(fromQueryDate('2028-02-29')!)).toBe('2028-02-29');
  });

  it('반환값이 date-fns format 에 안전하다 — 이 결함의 실제 폭발 지점이다', () => {
    for (const raw of ['bogus', '2026-13-45', '2026-02-30']) {
      const value = fromQueryDate(raw);
      // undefined 면 화면이 삼항식의 거짓 가지로 가므로 format 이 호출되지 않는다.
      expect(value).toBeUndefined();
    }
    // 정상 값은 던지지 않아야 한다.
    expect(() => format(fromQueryDate('2026-08-28')!, 'yyyy.MM.dd')).not.toThrow();
  });
});
