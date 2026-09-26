import { parseStorageYmd } from '@/lib/format-date';

/** 한 일정이 달력에 표시를 남길 수 있는 최대 일수 — 잘못 저장된 먼 종료일이 표시를 수만 개 만들지 않게 한다. */
export const MAX_SCHEDULE_SPAN_DAYS = 366;

/**
 * 일정이 걸쳐 있는 모든 날짜(2026-09-26 DIP C8).
 *
 * 종전 달력은 시작일에만 표시를 찍어, 여러 날에 걸친 일정의 둘째 날부터는 비어 보였다(선택한 날의 목록은 이미
 * 기간으로 거르고 있었다). 종료일이 없거나 시작일보다 이르면 시작일 하루다. 값은 저장 형식 'yyyyMMdd' 다.
 */
export function scheduleSpanDates(beginYmd?: string | null, endYmd?: string | null): Date[] {
  const begin = parseStorageYmd(beginYmd?.slice(0, 8));
  if (!begin) return [];
  const end = parseStorageYmd(endYmd?.slice(0, 8));
  const dates: Date[] = [];
  const cursor = new Date(begin);
  while (dates.length < MAX_SCHEDULE_SPAN_DAYS && (dates.length === 0 || (end !== null && cursor <= end))) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
