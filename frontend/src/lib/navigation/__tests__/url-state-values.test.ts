import { describe, expect, it } from 'vitest';
import { isPositiveIntegerText, normalizeRouteKey, parsePositivePage } from '../url-state-values';

/** 주소 값의 읽기·입력·다시 싣기가 같은 규칙을 쓴다(2026-11-08 URL 상태 소급 확인). */
describe('url-state-values', () => {
  it.each([
    ['3', 3], ['9007199254740991', 9007199254740991],
    ['2.5', 1], ['Infinity', 1], ['1e3', 1], ['-2', 1], ['0', 1], ['007', 1], ['', 1], [null, 1], [undefined, 1], ['9007199254740992', 1],
  ] as const)('parsePositivePage(%s) = %s', (raw, expected) => {
    expect(parsePositivePage(raw)).toBe(expected);
  });

  it('글 번호처럼 서버가 정수로 받는 값은 안전 정수 범위의 1 이상 10진 문자열만 받는다', () => {
    expect(isPositiveIntegerText('7')).toBe(true);
    expect(isPositiveIntegerText('9007199254740991')).toBe(true);
    for (const value of ['9007199254740992', '0', '07', '7a', ' 7', '+7', '7.0', '', null, undefined]) {
      expect(isPositiveIntegerText(value), String(value)).toBe(false);
    }
  });

  it('경로 키는 영문·숫자·_·- 1~40자만 받는다 — 주소 구분자가 섞인 값은 없는 것으로 본다', () => {
    expect(normalizeRouteKey('BBSMSTR_AAAAAAAAAAAA')).toBe('BBSMSTR_AAAAAAAAAAAA');
    expect(normalizeRouteKey('a'.repeat(40))).toBe('a'.repeat(40));
    for (const value of ['BBSMSTR_A&tab=x', 'a b', 'a/b', 'a?b', 'a#b', 'a=b', '', 'a'.repeat(41), null, undefined]) {
      expect(normalizeRouteKey(value), String(value)).toBeNull();
    }
  });
});
