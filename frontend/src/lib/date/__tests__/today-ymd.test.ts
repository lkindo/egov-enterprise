import { describe, expect, it } from 'vitest';
import { getTodayYmd, koreanDaysFromNow, koreanToday, nextKoreanMidnight } from '../today-ymd';

/** 러너·브라우저 시간대를 바꿔 가며 같은 결과인지 본다. */
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

describe('getTodayYmd', () => {
  it('UTC와 서울의 날짜 경계에서도 지정 시간대의 yyyyMMdd를 결정적으로 반환한다', () => {
    const instant = new Date('2026-08-11T15:30:00.000Z');

    expect(getTodayYmd(instant, 'UTC')).toBe('20260811');
    expect(getTodayYmd(instant, 'Asia/Seoul')).toBe('20260812');
  });
});

describe('koreanToday', () => {
  it('로컬 필드가 한국의 연·월·일을 담는다 — 달력 계산이 브라우저 시간대를 타지 않는다', () => {
    inEveryZone(() => {
      const date = koreanToday(new Date('2026-10-31T15:30:05.000Z'));

      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 1]);
    });
  });

  it('브라우저의 일광 절약 전환에도 한국 날짜가 밀리지 않는다', () => {
    const original = process.env.TZ;
    try {
      // 한국 3월 28일 23:30. 누크는 이날 밤 일광 절약으로 넘어가 같은 벽시계의 로컬 Date 가 다음 날로 밀렸다.
      process.env.TZ = 'America/Nuuk';
      const date = koreanToday(new Date('2026-03-28T14:30:00.000Z'));

      expect([date.getMonth(), date.getDate()]).toEqual([2, 28]);
      const nextWeek = koreanDaysFromNow(7, new Date('2026-03-28T14:30:00.000Z'));
      expect([nextWeek.getMonth(), nextWeek.getDate()]).toEqual([3, 4]);
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe('koreanDaysFromNow', () => {
  it('한국 날짜에서 센다 — 달을 넘겨도 맞다', () => {
    inEveryZone(() => {
      const date = koreanDaysFromNow(7, new Date('2026-10-31T15:30:00.000Z'));

      expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 10, 8]);
    });
  });
});

describe('nextKoreanMidnight', () => {
  it('다음 한국 자정의 순간이다 — 브라우저 시간대와 무관하다', () => {
    inEveryZone(() => {
      expect(nextKoreanMidnight(new Date('2026-09-26T14:00:00.000Z'))).toBe(Date.parse('2026-09-26T15:00:00.000Z'));
    });
  });

  it('한국 자정 직후에는 그다음 날 자정이다', () => {
    expect(nextKoreanMidnight(new Date('2026-09-26T15:00:00.000Z'))).toBe(Date.parse('2026-09-27T15:00:00.000Z'));
  });

  it('달과 해를 넘긴다', () => {
    expect(nextKoreanMidnight(new Date('2026-12-31T10:00:00.000Z'))).toBe(Date.parse('2026-12-31T15:00:00.000Z'));
  });
});
