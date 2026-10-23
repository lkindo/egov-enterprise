import { queryOptions, type QueryClient } from '@tanstack/react-query';
import {
  boardAdminService,
  type BoardMasterListParams,
} from '@/services/foundation/system/BoardAdminService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';

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
};
