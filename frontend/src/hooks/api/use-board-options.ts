'use client';

import { useQuery } from '@tanstack/react-query';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import { useUser } from '@/hooks/api/use-user';
import { isAdministrativeRole } from '@/lib/auth/administrative-role';
import {
  NOTICE_BOARD_ID,
  QNA_BOARD_ID,
  TASK_BOARD_ID,
  WIKI_BOARD_ID,
} from '@/config/board-ids';

export interface BoardOption {
  value: string;
  label: string;
}

/**
 * 비관리자 폴백 — Flyway 시드(R__seed_demo.sql)가 **실제로 INSERT 하는** 게시판만 담는다.
 *
 * 시드의 VALUES 는 AAAA(공지사항)·DDDD(Q&A 게시판)·EEEE(일정 게시판)·CCCC(업무게시판) 넷이다.
 * 종전에 세 화면이 하드코딩하던 목록에 있던 BBBB('자유게시판')는 그 VALUES 에 없다 —
 * 시드 주석이 직접 "라이브에도 존재하지 않는다"고 적어 두었다. 여기에 그 ID 를 되살리면
 * 고치려던 결함이 그대로 돌아온다.
 */
const SEEDED_FALLBACK_OPTIONS: readonly BoardOption[] = [
  { value: NOTICE_BOARD_ID, label: '공지사항' },
  { value: TASK_BOARD_ID, label: '업무게시판' },
  { value: QNA_BOARD_ID, label: 'Q&A 게시판' },
  { value: WIKI_BOARD_ID, label: '일정 게시판' },
];

/**
 * 게시판 선택지를 **게시판 마스터에서** 채운다(관리자에 한해).
 *
 * ── 왜 필요한가 ──────────────────────────────────────────────────────────────
 * 종전에는 세 화면이 게시판 선택지를 각각 하드코딩했고, 그 목록에 **존재하지 않는 게시판**이
 * 섞여 있었다. `BBSMSTR_BBBBBBBBBBBB`('자유게시판')는 Flyway 시드의 VALUES 에 없다. 고르는
 * 순간 목록 조회가 실패하고, 그 게시판으로 글을 쓰면 등록이 거부된다.
 *
 * 라벨도 함께 어긋나 있었다 — 같은 `BBSMSTR_CCCCCCCCCCCC`(시드 제목 '업무게시판')를 한 화면은
 * '갤러리 게시판'이라고 불렀다. 하드코딩은 ID 와 이름 두 축 모두에서 원본과 어긋난다.
 *
 * ── 왜 관리자에게만 조회하는가 ───────────────────────────────────────────────
 * 게시판 마스터 목록 API 는 `/api/v1/admin/**` 아래에 있고 `ApiSecurityConfig` 가 그 경로를
 * ROLE_ADMIN·ROLE_SYSTEM 으로 강제한다. 그런데 이 훅을 쓰는 세 화면은 `proxy.ts` 의
 * `USER_ACCESSIBLE_ADMIN_PATHS`(`/admin/community`)로 **일반 사용자에게 열려 있다.**
 * 역할을 보지 않고 그냥 조회하면 일반 사용자에게는 403 이 떨어져 선택지가 통째로 비고,
 * "죽은 게시판이 섞여 있다"가 "아무 게시판도 못 고른다"로 **악화된다.**
 *
 * 그래서 관리자에게만 서버 목록을 조회하고, 일반 사용자에게는 시드가 보장하는 게시판만
 * 폴백으로 준다. 비관리자용 게시판 목록 API 를 새로 열지 않으며(인가 경계를 넓히지 않는다),
 * 관리자 전용 경로를 일반 사용자에게 개방하지도 않는다.
 *
 * ⚠ 이것은 **표시 판정**이지 인가가 아니다. 실제 인가는 proxy 의 라우트 게이트와 백엔드가
 *   수행한다. 여기서 관리자로 오판돼도 서버는 여전히 403 을 돌려주고, 그 경우 폴백이 쓰인다.
 */
export function useBoardOptions() {
  const { data: user } = useUser();
  const isAdmin = isAdministrativeRole(user?.role);

  const query = useQuery({
    // 전체 선택지는 도메인 query option이 서버 상한(100) 안에서 모든 페이지를 수집한다.
    ...boardMasterQueryOptions.completeList(),
    // 선택지는 자주 바뀌지 않는다. 화면을 옮겨 다닐 때마다 다시 받지 않는다.
    staleTime: 5 * 60 * 1000,
    enabled: isAdmin,
    // 403 은 재시도해도 달라지지 않는다.
    retry: false,
  });

  const serverOptions: BoardOption[] = (query.data ?? [])
    .filter((board) => board.useYn !== 'N')
    .map((board) => ({
      value: String(board.bbsId ?? ''),
      label: String(board.bbsTtl ?? board.bbsId ?? ''),
    }))
    .filter((option) => option.value !== '');

  /*
   * 조회에 실패했거나 비관리자면 시드 목록으로 내려간다. 빈 배열을 그대로 돌려주면
   * select 가 비어 "게시판이 하나도 없다"고 거짓말하고 글쓰기 폼의 필수 선택이 막힌다.
   */
  const options = serverOptions.length > 0 ? serverOptions : [...SEEDED_FALLBACK_OPTIONS];

  return {
    options,
    /** 서버 목록을 실제로 쓰고 있는지. false 면 시드 폴백이다(비관리자 또는 조회 실패). */
    isServerSourced: serverOptions.length > 0,
    isLoading: isAdmin && query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
