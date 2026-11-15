import type { QueryClient } from '@tanstack/react-query';

/**
 * 일정 조회 키(2026-11-14). 일정 화면의 월 목록과 업무 홈의 '오늘 일정' 카드가 같은 일정 API 를 읽는다 — 종전에는 일정을
 * 등록·수정·삭제한 뒤 월 목록만 무효화해, 홈으로 돌아가면 카드가 바꾸기 전 일정을 보였다.
 *
 * 일정 기능이 소유하는 경로에 둔다 — 일정을 뺀 구성에서는 이 파일도 홈 카드와 함께 빠진다.
 */
export const SCHEDULE_LIST_ROOT = ['work-schedules'] as const;
export const SCHEDULE_HOME_ROOT = ['home', 'schedule-today'] as const;

export function scheduleHomeKey(userId: string | undefined, yearMonth: string) {
  return [...SCHEDULE_HOME_ROOT, userId, yearMonth] as const;
}

/** 일정을 쓰거나 충돌로 다시 읽어야 할 때 — 월 목록과 홈 카드를 함께 낡은 것으로 표시한다. */
export function invalidateSchedules(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: SCHEDULE_LIST_ROOT }),
    queryClient.invalidateQueries({ queryKey: SCHEDULE_HOME_ROOT }),
  ]);
}
