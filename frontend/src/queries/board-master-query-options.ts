import { queryOptions } from '@tanstack/react-query';
import {
  boardAdminService,
  type BoardMasterListParams,
} from '@/services/foundation/system/BoardAdminService';
import { fetchAllPages } from '@/lib/api/fetch-all-pages';
import { boardUserService } from '@/services/business/user/board/BoardUserService';

export const boardMasterKeys = {
  all: ['board-masters'] as const,
  lists: () => [...boardMasterKeys.all, 'list'] as const,
  list: (params: BoardMasterListParams) => [...boardMasterKeys.lists(), params] as const,
  completeList: () => [...boardMasterKeys.lists(), 'complete'] as const,
  details: () => [...boardMasterKeys.all, 'detail'] as const,
  detail: (bbsId: string) => [...boardMasterKeys.details(), bbsId] as const,
  // 사용자 화면용 메타(DIP V5). 관리자 상세와 응답 모양이 달라 키를 나눈다.
  meta: (bbsId: string) => [...boardMasterKeys.all, 'meta', bbsId] as const,
};

export const boardMasterQueryOptions = {
  list: (params: BoardMasterListParams = {}) => queryOptions({
    queryKey: boardMasterKeys.list(params),
    queryFn: () => boardAdminService.getBoardMasterList(params),
  }),
  completeList: () => queryOptions({
    queryKey: boardMasterKeys.completeList(),
    queryFn: () => fetchAllPages((pageIndex, pageUnit) =>
      boardAdminService.getBoardMasterList({ pageIndex, pageUnit })),
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
};
