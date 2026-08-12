import { describe, expect, it } from 'vitest';
import { getTodayYmd } from '../today-ymd';

describe('getTodayYmd', () => {
  it('UTC와 서울의 날짜 경계에서도 지정 시간대의 yyyyMMdd를 결정적으로 반환한다', () => {
    const instant = new Date('2026-08-11T15:30:00.000Z');

    expect(getTodayYmd(instant, 'UTC')).toBe('20260811');
    expect(getTodayYmd(instant, 'Asia/Seoul')).toBe('20260812');
  });
});
