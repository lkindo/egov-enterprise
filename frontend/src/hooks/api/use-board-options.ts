'use client';

import { useQuery } from '@tanstack/react-query';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';

export interface BoardOption {
  value: string;
  label: string;
}

/**
 * 이용 화면의 게시판 선택지를 **서버의 사용자 선택지 API** 에서 채운다(ADR-0040 결정 11).
 *
 * ── 왜 이렇게 바뀌었나 ─────────────────────────────────────────────────────────
 * 종전에는 게시판 마스터 조회 권한(BBS_MST_READ)이 있는 사람만 관리 목록을 받아 화면이 사용 여부로 거르고, 그 밖의 사람에게는
 * 시드 게시판 넷을 하드코딩한 폴백을 보였다. 그래서 일반 사용자는 실제로 쓰는 게시판을 고를 수 없었고, 폴백 안의 게시판이 사용
 * 안 함이거나 회원 전용이어도 골랐다가 404·403 을 받았다.
 *
 * 이제 서버가 사용 중이고 호출자가 열 수 있는 게시판만 준다(커뮤니티 귀속 게시판은 승인 회원에게만). 모든 인증 사용자가 같은
 * API 하나를 쓰고, 빈 결과·실패를 폴백으로 덮지 않는다 — 화면이 "이용할 수 있는 게시판이 없다" 나 오류를 사실대로 보인다.
 */
export function useBoardOptions() {
  const query = useQuery({
    ...boardMasterQueryOptions.options(),
    // 선택지는 자주 바뀌지 않는다. 화면을 옮겨 다닐 때마다 다시 받지 않는다.
    staleTime: 5 * 60 * 1000,
  });

  const options: BoardOption[] = (query.data ?? [])
    .map((board) => ({ value: board.bbsId, label: board.bbsTtl || board.bbsId }))
    .filter((option) => option.value !== '');

  return {
    options,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
