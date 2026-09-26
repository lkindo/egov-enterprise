import { describe, expect, it } from 'vitest';
import { MAX_SCHEDULE_SPAN_DAYS, scheduleSpanDates } from '../schedule-span';

/** [2026-09-26 DIP C8] 여러 날에 걸친 일정은 달력의 모든 날짜에 표시된다. */
const ymd = (date: Date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;

describe('scheduleSpanDates', () => {
  it('시작일부터 종료일까지 모든 날짜를 준다(월 경계 포함)', () => {
    expect(scheduleSpanDates('20260929', '20261002').map(ymd)).toEqual(['20260929', '20260930', '20261001', '20261002']);
  });

  it('종료일이 없거나 시작일보다 이르면 시작일 하루다', () => {
    expect(scheduleSpanDates('20260915', null).map(ymd)).toEqual(['20260915']);
    expect(scheduleSpanDates('20260915', '20260910').map(ymd)).toEqual(['20260915']);
  });

  it('시작일을 해석할 수 없으면 표시하지 않는다', () => {
    expect(scheduleSpanDates('2026-09', '20260930')).toEqual([]);
    expect(scheduleSpanDates(undefined, '20260930')).toEqual([]);
  });

  it('잘못 저장된 먼 종료일도 표시 수를 상한으로 막는다', () => {
    expect(scheduleSpanDates('20260101', '20991231')).toHaveLength(MAX_SCHEDULE_SPAN_DAYS);
  });
});
