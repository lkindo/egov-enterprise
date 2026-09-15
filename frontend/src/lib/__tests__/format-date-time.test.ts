import { describe, expect, it } from 'vitest';
import { toDisplayDateTime } from '../format-date';

/**
 * [2026-09-15 DEC-OPS-100] 시스템 표준 날짜·시각은 'yyyy-MM-dd HH:mm:ss' 다(formatRules.time.dateTimeDisplay).
 * 한 번도 받지 않은 조회의 `dataUpdatedAt` 은 0 이라, 그 값을 1970년 시각으로 그리면 없는 시각을 지어내게 된다.
 */
describe('toDisplayDateTime', () => {
  it('Date 를 yyyy-MM-dd HH:mm:ss 로 쓴다', () => {
    expect(toDisplayDateTime(new Date(2026, 8, 15, 9, 5, 7))).toBe('2026-09-15 09:05:07');
  });

  it('epoch 밀리초도 같은 형식으로 쓴다', () => {
    expect(toDisplayDateTime(new Date(2026, 0, 2, 23, 59, 0).getTime())).toBe('2026-01-02 23:59:00');
  });

  it('없거나 0 이하이거나 해석할 수 없는 시각은 지어내지 않고 fallback 을 돌려준다', () => {
    expect(toDisplayDateTime(undefined)).toBe('-');
    expect(toDisplayDateTime(null)).toBe('-');
    expect(toDisplayDateTime(0)).toBe('-');
    expect(toDisplayDateTime(Number.NaN, '미확인')).toBe('미확인');
  });
});
