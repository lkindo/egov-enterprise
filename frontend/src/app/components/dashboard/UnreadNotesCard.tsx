'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { noteService } from '@/services/business/user/NoteService';

/**
 * 업무 홈의 '안 읽은 쪽지' 요약(2026-10-01 UI/UX 분석 16번).
 *
 * 종전 업무 홈은 '오늘 처리할 업무' 라고 말했지만 개인에게 온 항목은 결재 대기 하나뿐이었다. 받은 쪽지 가운데
 * 읽지 않은 수를 기존 API 로 읽어 보인다. 쪽지 조회 권한이 없으면 그리지 않고, 조회에 실패하면 0 이 아니라
 * '조회 실패' 라고 말한다(결재 대기와 같은 규칙). collaboration pack 소유다.
 */
export function UnreadNotesCard() {
  const { user } = useAuth();
  const canRead = canPermission(user, 'NOTE_READ');
  const unread = useQuery({
    queryKey: ['notes', 'unread-count', user?.id],
    queryFn: () => noteService.getUnreadReceivedCount(),
    enabled: canRead,
    retry: false,
  });
  if (!canRead) return null;
  const value = unread.isPending ? '확인 중' : unread.isError ? '조회 실패' : `${unread.data}건`;
  return (
    <li className="rounded-md border border-border bg-card px-4 py-3">
      <Link href="/note" className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <span className="text-[length:var(--font-size-body)] text-muted-foreground group-hover:text-primary">안 읽은 쪽지</span>
        <span className="mt-1 block text-2xl font-bold tabular-nums text-foreground">{value}</span>
      </Link>
    </li>
  );
}
