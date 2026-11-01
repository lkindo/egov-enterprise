import { describe, expect, it } from 'vitest';
import { todayStorageYmd, toDisplayDateTime, toSeoulDisplayDateTime } from '../format-date';

/** 러너·브라우저 시간대를 바꿔 가며 같은 결과인지 본다. UTC 러너 하나로는 '로컬로 읽기' 의 결함이 보이지 않는다. */
function inEveryZone(check: () => void) {
  const original = process.env.TZ;
  try {
    for (const zone of ['Asia/Seoul', 'UTC', 'America/New_York']) {
      process.env.TZ = zone;
      check();
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
}

/**
 * [2026-09-15 DEC-OPS-100] 시스템 표준 날짜·시각은 'yyyy-MM-dd HH:mm:ss' 다(formatRules.time.dateTimeDisplay).
 * 한 번도 받지 않은 조회의 `dataUpdatedAt` 은 0 이라, 그 값을 1970년 시각으로 그리면 없는 시각을 지어내게 된다.
 */
describe('toDisplayDateTime', () => {
  it('Date 를 한국 시각의 yyyy-MM-dd HH:mm:ss 로 쓴다', () => {
    inEveryZone(() => {
      expect(toDisplayDateTime(new Date('2026-09-15T00:05:07Z'))).toBe('2026-09-15 09:05:07');
    });
  });

  it('epoch 밀리초도 같은 형식으로 쓴다', () => {
    inEveryZone(() => {
      expect(toDisplayDateTime(Date.parse('2026-01-02T14:59:00Z'))).toBe('2026-01-02 23:59:00');
    });
  });

  it('없거나 0 이하이거나 해석할 수 없는 시각은 지어내지 않고 fallback 을 돌려준다', () => {
    expect(toDisplayDateTime(undefined)).toBe('-');
    expect(toDisplayDateTime(null)).toBe('-');
    expect(toDisplayDateTime(0)).toBe('-');
    expect(toDisplayDateTime(Number.NaN, '미확인')).toBe('미확인');
  });
});

describe('todayStorageYmd', () => {
  it('오늘은 브라우저가 아니라 한국의 날짜다 — UTC 저녁은 한국의 다음 날이다', () => {
    inEveryZone(() => {
      expect(todayStorageYmd(new Date('2026-10-31T15:30:00Z'))).toBe('20261101');
    });
  });
});

/** 서버의 시각은 한국 표준시다(DEC-OPS-396). 표시는 브라우저 시간대와 무관하다. */
describe('toSeoulDisplayDateTime', () => {
  it('시간대 표기가 없는 값은 이미 한국 시각이라 그대로 쓴다', () => {
    inEveryZone(() => {
      expect(toSeoulDisplayDateTime('2026-10-01T01:00:00')).toBe('2026-10-01 01:00:00');
      expect(toSeoulDisplayDateTime('2026-10-01T01:00:05.123456')).toBe('2026-10-01 01:00:05');
      expect(toSeoulDisplayDateTime('2026-12-31 23:59:59')).toBe('2026-12-31 23:59:59');
    });
  });

  it('순간 값은 표기를 따라 한국 시각으로 바꾼다 — UTC 저녁은 한국의 다음 날이고 자정은 24시가 아니라 00시다', () => {
    inEveryZone(() => {
      expect(toSeoulDisplayDateTime('2026-10-01T01:00:00Z')).toBe('2026-10-01 10:00:00');
      expect(toSeoulDisplayDateTime('2026-12-31T15:00:00Z')).toBe('2027-01-01 00:00:00');
      expect(toSeoulDisplayDateTime('2026-10-01T10:00:00+09:00')).toBe('2026-10-01 10:00:00');
    });
  });

  it('없거나 해석할 수 없는 값은 지어내지 않고 fallback 을 돌려준다', () => {
    expect(toSeoulDisplayDateTime(null)).toBe('-');
    expect(toSeoulDisplayDateTime(undefined)).toBe('-');
    expect(toSeoulDisplayDateTime('  ')).toBe('-');
    expect(toSeoulDisplayDateTime('not-a-date', '미확인')).toBe('미확인');
  });
});
