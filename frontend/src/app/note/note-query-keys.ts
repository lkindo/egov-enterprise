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
 * 쪽지함 목록 키(2026-11-25 품질 평가). 조회와 읽음 반영(setQueryData)·무효화가 같은 함수로 키를 만든다 — 종전에는 읽음 반영이 조회
 * 키를 손으로 베껴 적어, 조회 키가 바뀌면 반영이 조용히 아무 일도 하지 않았다. 앞부분만 넘기면 무효화용 접두사다.
 */
export const NOTE_LIST_ROOT = ['notes', 'list'] as const;

export type NoteListTab = 'received' | 'sent';

export function noteListKey(tab: NoteListTab, page: number, pageSize: number, searchKeyword: string) {
  return [...NOTE_LIST_ROOT, tab, page, pageSize, searchKeyword] as const;
}

export function noteListTabKey(tab: NoteListTab) {
  return [...NOTE_LIST_ROOT, tab] as const;
}

/** 쪽지함 화면 머리의 미읽음 수 — 홈 카드 키({@link noteUnreadCountKey})와 따로 센다. */
export const NOTE_HUB_UNREAD_COUNT_ROOT = ['notes', 'hub-unread-count'] as const;

export function noteHubUnreadCountKey(userId: string | undefined) {
  return [...NOTE_HUB_UNREAD_COUNT_ROOT, userId] as const;
}

/**
 * 쪽지를 읽거나 지운 뒤 — 홈 카드의 미읽음 수를 낡은 것으로 표시한다. 화면이 키를 직접 적지 않고 이 함수를 부른다.
 */
export function invalidateNoteUnreadCount(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: NOTE_UNREAD_COUNT_ROOT });
}
