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

import { toQueryDate } from '../BoardListClient';

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
    // 검색 제출과 캘린더 월 이동(이전·다음) 세 경로가 모두 같은 형식을 써야 한다.
    expect(source.match(/params\.set\('startDate', toQueryDate\(/g) ?? []).toHaveLength(3);
    expect(source).toContain("params.set('endDate', toQueryDate(");
  });

  it('쿼리 값으로 toISOString 을 쓰지 않는다', () => {
    expect(source).not.toContain('toISOString');
  });
});
