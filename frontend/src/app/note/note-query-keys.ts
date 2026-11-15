import type { QueryClient } from '@tanstack/react-query';

/**
 * 쪽지 조회 키(2026-11-14). 쪽지함과 업무 홈의 '안 읽은 쪽지' 카드가 같은 키를 쓴다 — 종전에는 쪽지함이 자기 화면의 미읽음 수만
 * 다시 세고 홈 카드 캐시는 그대로 두어, 쪽지를 읽고 홈으로 돌아가도 카드가 읽기 전 수를 보였다.
 *
 * 쪽지 기능이 소유하는 경로에 둔다 — 쪽지를 뺀 구성에서는 이 파일도 홈 카드와 함께 빠진다.
 */
export const NOTE_UNREAD_COUNT_ROOT = ['notes', 'unread-count'] as const;

export function noteUnreadCountKey(userId: string | undefined) {
  return [...NOTE_UNREAD_COUNT_ROOT, userId] as const;
}

/**
 * 쪽지를 읽거나 지운 뒤 — 홈 카드의 미읽음 수를 낡은 것으로 표시한다. 쪽지함 목록은 수동 조회라 React Query 키가 없다
 * (페이지 크기 census 의 manual-fetch 목록). 화면이 키를 직접 적지 않고 이 함수를 부른다.
 */
export function invalidateNoteUnreadCount(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: NOTE_UNREAD_COUNT_ROOT });
}
