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

describe('scheduleSpanDates 표시 범위 교집합', () => {
  const february2027 = { start: new Date(2027, 1, 1), end: new Date(2027, 1, 28) };
  const februaryDays = Array.from({ length: 28 }, (_, index) => `202702${String(index + 1).padStart(2, '0')}`);

  it('3년 일정도 시작일부터 366일을 소진하기 전에 표시월과 교차해 2027년 2월 28일 모두를 준다', () => {
    expect(scheduleSpanDates('20260101', '20281231', february2027).map(ymd)).toEqual(februaryDays);
  });

  it('2099년 종료일도 표시 구간의 날짜만 만든다', () => {
    expect(scheduleSpanDates('20260101', '20991231', february2027).map(ymd)).toEqual(februaryDays);
  });

  it('교집합이 넓어도 기존 366일 상한을 그대로 유지한다', () => {
    const dates = scheduleSpanDates('20260101', '20991231', {
      start: new Date(2027, 1, 1), end: new Date(2029, 11, 31),
    });
    expect(MAX_SCHEDULE_SPAN_DAYS).toBe(366);
    expect(dates).toHaveLength(MAX_SCHEDULE_SPAN_DAYS);
    expect(ymd(dates[0])).toBe('20270201');
    expect(ymd(dates.at(-1)!)).toBe('20280201');
  });

  it.each<[string, string, string[]]>([
    ['20270130', '20270202', ['20270201', '20270202']],
    ['20270227', '20270302', ['20270227', '20270228']],
    ['20270101', '20270131', []],
    ['20270301', '20270331', []],
  ])('월 경계에서 일정 %s~%s와 표시 범위가 겹친 날짜만 준다', (begin, end, expected) => {
    expect(scheduleSpanDates(begin, end, february2027).map(ymd)).toEqual(expected);
  });

  it('윤년 2월 29일과 다음 달 경계를 포함하고 전달된 Date를 변경하지 않는다', () => {
    const range = { start: new Date(2028, 1, 28), end: new Date(2028, 2, 1) };
    const before = [range.start.getTime(), range.end.getTime()];
    expect(scheduleSpanDates('20260101', '20281231', range).map(ymd))
      .toEqual(['20280228', '20280229', '20280301']);
    expect([range.start.getTime(), range.end.getTime()]).toEqual(before);
  });

  it.each([null, undefined, '', '20270214', '20270230'])('종료일 %s는 시작일 하루로 처리한 뒤 표시 범위와 교차한다', (end) => {
    expect(scheduleSpanDates('20270215', end, february2027).map(ymd)).toEqual(['20270215']);
    expect(scheduleSpanDates('20270315', end, february2027)).toEqual([]);
  });

  it.each([undefined, '', '2027-02', '20270229', '20271301'])('무효 시작일 %s는 표시 범위로 대신 채우지 않는다', (begin) => {
    expect(scheduleSpanDates(begin, '20281231', february2027)).toEqual([]);
  });

  it('역전되거나 유효하지 않은 표시 범위는 날짜를 만들지 않는다', () => {
    expect(scheduleSpanDates('20260101', '20281231', {
      start: new Date(2027, 1, 28), end: new Date(2027, 1, 1),
    })).toEqual([]);
    expect(scheduleSpanDates('20260101', '20281231', {
      start: new Date(Number.NaN), end: new Date(2027, 1, 28),
    })).toEqual([]);
    expect(scheduleSpanDates('20260101', '20281231', {
      start: new Date(2027, 1, 1), end: new Date(Number.NaN),
    })).toEqual([]);
  });
});
