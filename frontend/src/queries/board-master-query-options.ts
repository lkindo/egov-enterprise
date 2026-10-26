import { queryOptions, type QueryClient } from '@tanstack/react-query';
import {
  boardAdminService,
  type BoardMasterListParams,
} from '@/services/foundation/system/BoardAdminService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import type { BoardPostingStatus } from '@/types/business/board';

/**
 * 운영 화면 게시물 탭의 조회 조건(ADR-0040 §5.4). URL 밖 상태이고 `조회`·Enter 로 적용한 값만 담는다. 쪽은 1 기반이다(ADR-0036).
 * 제목 조건은 서버의 제목 검색(searchCnd '0')이고, 게시 상태·상단 고정은 서버가 오늘(Asia/Seoul) 기준으로 판정한다.
 */
export interface BoardOperationPostParams {
  page: number;
  size: number;
  searchWrd?: string;
  /** [2026-10-26 ADR-0043 1차] 검색 구분 — '0' 제목·'1' 본문·'2' 작성자 표시 이름. 검색어가 있을 때만 싣고, 비우면 제목이다. */
  searchCnd?: '0' | '1' | '2';
  postingStatus?: BoardPostingStatus;
  /** [2026-10-23 ADR-0040 결정 5] true 면 지금 고정 중인 글, false 면 그 밖의 글이다. 비우면 전체다. */
  pinned?: boolean;
  /** [2026-10-26 ADR-0043 1차] Q&A 해결 상태 — 미해결(OPEN)·해결됨(SOLVED). 비우면 전체다. */
  qnaStatus?: 'OPEN' | 'SOLVED';
}

/**
 * 게시판 이름·사용 여부가 바뀐 뒤(설정 저장·일괄 사용 상태 변경·영구 삭제) 다시 읽을 캐시. 관리 뿌리 키 아래(목록·상세·이용 화면
 * 메타·선택지·변경 이력)와 커뮤니티 상세의 귀속 게시판 목록(['community-boards', cmntySn] — 사용 중 게시판의 이름을 든다)이다.
 * 지운 게시판은 상세를 먼저 캐시에서 뺀다 — 열린 운영 화면이 지운 게시판을 다시 읽어 404 오류를 띄우지 않게 한다.
 */
export function invalidateBoardCaches(queryClient: QueryClient, options: { removedBbsId?: string } = {}): Promise<unknown> {
  if (options.removedBbsId) queryClient.removeQueries({ queryKey: boardMasterKeys.detail(options.removedBbsId) });
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: boardMasterKeys.all }),
    queryClient.invalidateQueries({ queryKey: ['community-boards'] }),
  ]);
}

export const boardMasterKeys = {
  all: ['board-masters'] as const,
  lists: () => [...boardMasterKeys.all, 'list'] as const,
  list: (params: BoardMasterListParams) => [...boardMasterKeys.lists(), params] as const,
  details: () => [...boardMasterKeys.all, 'detail'] as const,
  detail: (bbsId: string) => [...boardMasterKeys.details(), bbsId] as const,
  // 사용자 화면용 메타(DIP V5). 관리자 상세와 응답 모양이 달라 키를 나눈다.
  meta: (bbsId: string) => [...boardMasterKeys.all, 'meta', bbsId] as const,
  // 이용 화면의 게시판 선택지(ADR-0040 결정 11). 호출자마다 서버가 거르므로 관리 목록과 키를 나눈다.
  options: () => [...boardMasterKeys.all, 'options'] as const,
  // 게시판 변경 이력(ADR-0040 결정 9). 설정을 저장하면 그 게시판의 이력 전체를 무효화한다.
  changeHistories: (bbsId: string) => [...boardMasterKeys.detail(bbsId), 'change-history'] as const,
  changeHistory: (bbsId: string, page: number, size: number) =>
    [...boardMasterKeys.changeHistories(bbsId), { page, size }] as const,
  // 운영 화면 게시물 탭의 목록(ADR-0040 §5.4). 상세 키 아래에 둬 설정 저장 뒤의 invalidateBoardCaches 가 함께 다시 읽는다.
  operationPostsAll: (bbsId: string) => [...boardMasterKeys.detail(bbsId), 'posts'] as const,
  operationPosts: (bbsId: string, params: BoardOperationPostParams) =>
    [...boardMasterKeys.operationPostsAll(bbsId), params] as const,
};

export const boardMasterQueryOptions = {
  list: (params: BoardMasterListParams = {}) => queryOptions({
    queryKey: boardMasterKeys.list(params),
    queryFn: () => boardAdminService.getBoardMasterList(params),
  }),
  detail: (bbsId: string) => queryOptions({
    queryKey: boardMasterKeys.detail(bbsId),
    queryFn: () => boardAdminService.getBoardMaster(bbsId),
    enabled: bbsId.length > 0,
  }),
  meta: (bbsId: string) => queryOptions({
    queryKey: boardMasterKeys.meta(bbsId),
    queryFn: () => boardUserService.getBoardMeta(bbsId),
    enabled: bbsId.length > 0,
  }),
  options: () => queryOptions({
    queryKey: boardMasterKeys.options(),
    queryFn: () => boardUserService.getBoardOptions(),
  }),
  changeHistory: (bbsId: string, page: number, size: number) => queryOptions({
    queryKey: boardMasterKeys.changeHistory(bbsId, page, size),
    queryFn: () => boardAdminService.getBoardChangeHistory(bbsId, { page, size }),
    enabled: bbsId.length > 0,
  }),
  /*
    [2026-10-23 ADR-0040 결정 1·D-1] 운영 목록은 새 경로 없이 이용자 목록 API 를 쓴다 — 조회 대행 권한(BOARD_READ_ALL)이면 서버가
    사용 안 함 게시판과 예약·종료 글까지 연다. 빈 조건은 보내지 않는다(빈 값과 '조건 없음' 을 섞지 않는다).
  */
  operationPosts: (bbsId: string, params: BoardOperationPostParams) => queryOptions({
    queryKey: boardMasterKeys.operationPosts(bbsId, params),
    queryFn: () => boardUserService.getPosts(bbsId, {
      page: params.page,
      size: params.size,
      ...(params.searchWrd ? { searchCnd: params.searchCnd ?? '0', searchWrd: params.searchWrd } : {}),
      ...(params.postingStatus ? { postingStatus: params.postingStatus } : {}),
      ...(params.pinned !== undefined ? { pinned: params.pinned } : {}),
      ...(params.qnaStatus ? { qnaStatus: params.qnaStatus } : {}),
    }),
    enabled: bbsId.length > 0,
  }),
};

/**
 * 운영 화면에서 게시글의 게시 기간·상단 고정을 바꾼 뒤(ADR-0040 결정 5·9·10) 다시 읽을 캐시 — 운영 목록, 그 게시판의 변경 이력, 이용 화면의
 * 목록·상세다. 게시판 설정·이름은 바뀌지 않으므로 관리 뿌리 전체를 다시 읽지 않는다.
 */
export function invalidateBoardOperationPosts(queryClient: QueryClient, bbsId: string): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: boardMasterKeys.operationPostsAll(bbsId) }),
    queryClient.invalidateQueries({ queryKey: boardMasterKeys.changeHistories(bbsId) }),
    queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] }),
    queryClient.invalidateQueries({ queryKey: ['article-detail', bbsId] }),
  ]);
}
