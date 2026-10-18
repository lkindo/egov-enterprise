import { describe, expect, it } from 'vitest';
import { toDisplayDateTime, utcToSeoulDisplayDateTime } from '../format-date';

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

/**
 * [2026-10-18] 후속 작업 원장은 UTC 벽시계 값(`LocalDateTime.now(ZoneOffset.UTC)`)을 시간대 표기 없이 보낸다.
 * 표시는 브라우저 시간대와 무관하게 한국 시각이어야 한다 — 러너 시간대(CI 는 UTC)에 따라 결과가 바뀌지 않는다.
 */
describe('utcToSeoulDisplayDateTime', () => {
  it('시간대 표기가 없는 값은 UTC 로 읽어 한국 시각(+9시간)으로 쓴다', () => {
    expect(utcToSeoulDisplayDateTime('2026-10-01T01:00:00')).toBe('2026-10-01 10:00:00');
    expect(utcToSeoulDisplayDateTime('2026-10-01T01:00:05.123456')).toBe('2026-10-01 10:00:05');
  });

  it('러너·브라우저 시간대가 UTC 가 아니어도 같은 값을 쓴다(표기 없는 값을 로컬 시각으로 읽지 않는다)', () => {
    // UTC 러너에서는 '로컬로 읽기' 와 'UTC 로 읽기' 가 같은 값이라 결함이 보이지 않는다 — 시간대를 바꿔 본다.
    const original = process.env.TZ;
    try {
      for (const zone of ['Asia/Seoul', 'America/New_York']) {
        process.env.TZ = zone;
        expect(new Date(2026, 9, 1, 1).getTimezoneOffset(), `${zone} 이 적용되지 않았다 — 시험이 공허하다`).not.toBe(0);
        expect(utcToSeoulDisplayDateTime('2026-10-01T01:00:00')).toBe('2026-10-01 10:00:00');
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('UTC 저녁은 한국의 다음 날이 되고, 자정은 24시가 아니라 00시다', () => {
    expect(utcToSeoulDisplayDateTime('2026-12-31T15:00:00')).toBe('2027-01-01 00:00:00');
    expect(utcToSeoulDisplayDateTime('2026-10-01T20:30:00')).toBe('2026-10-02 05:30:00');
  });

  it('시간대 표기가 있으면 그 표기를 따른다', () => {
    expect(utcToSeoulDisplayDateTime('2026-10-01T01:00:00Z')).toBe('2026-10-01 10:00:00');
    expect(utcToSeoulDisplayDateTime('2026-10-01T10:00:00+09:00')).toBe('2026-10-01 10:00:00');
  });

  it('없거나 해석할 수 없는 값은 지어내지 않고 fallback 을 돌려준다', () => {
    expect(utcToSeoulDisplayDateTime(null)).toBe('-');
    expect(utcToSeoulDisplayDateTime(undefined)).toBe('-');
    expect(utcToSeoulDisplayDateTime('  ')).toBe('-');
    expect(utcToSeoulDisplayDateTime('not-a-date', '미확인')).toBe('미확인');
  });
});
