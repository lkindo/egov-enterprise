'use client';

import { useQuery } from '@tanstack/react-query';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';

export interface BoardOption {
  value: string;
  label: string;
}

/**
 * 게시판 선택지를 **게시판 마스터에서** 채운다.
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 종전에는 세 화면이 게시판 선택지를 각각 하드코딩했고, 그 목록에 **존재하지 않는 게시판**이
 * 섞여 있었다. `BBSMSTR_BBBBBBBBBBBB`('자유게시판')는 Flyway 시드(R__seed_demo.sql)의 VALUES 에
 * 없고 주석에만 "라이브에도 존재하지 않는다"고 적혀 있다. 고르는 순간 목록은 조회에 실패하고,
 * 그 게시판으로 글을 쓰면 등록이 거부된다.
 *
 * 라벨도 함께 어긋나 있었다 — 같은 `BBSMSTR_CCCCCCCCCCCC`(시드 제목 '업무게시판')를 한 화면은
 * '갤러리 게시판', 다른 화면은 '업무게시판'이라고 불렀다. 하드코딩은 ID 와 이름 두 축 모두에서
 * 원본과 어긋난다.
 *
 * 서버가 내려주는 목록을 쓰면 두 축이 동시에 사라진다. `useYn` 필터는 클라이언트에서 건다 —
 * 목록 API 가 `useYn` 파라미터를 노출하지 않지만 응답 DTO 에는 들어 있어서, 백엔드 계약을
 * 넓히지 않고도 비활성 게시판을 걸러낼 수 있다.
 */
export function useBoardOptions() {
  const query = useQuery({
    queryKey: ['board-master-options'],
    // 선택지는 자주 바뀌지 않는다. 화면을 옮겨 다닐 때마다 다시 받지 않는다.
    staleTime: 5 * 60 * 1000,
    queryFn: () => boardAdminService.getBoardMasterList({ pageIndex: 1, pageUnit: 200 }),
  });

  const options: BoardOption[] = (query.data?.list ?? [])
    .filter((board) => board.useYn !== 'N')
    .map((board) => ({
      value: String(board.bbsId ?? ''),
      label: String(board.bbsTtl ?? board.bbsId ?? ''),
    }))
    .filter((option) => option.value !== '');

  return {
    options,
    isLoading: query.isLoading,
    /*
     * 조회 실패를 빈 목록으로 삼키면 화면이 "게시판이 하나도 없다"고 거짓말한다.
     * 호출부가 오류를 드러낼 수 있도록 그대로 넘긴다.
     */
    error: query.error,
    refetch: query.refetch,
  };
}
