import { queryOptions } from '@tanstack/react-query';
import {
  boardAdminService,
  type BoardMasterListParams,
} from '@/services/foundation/system/BoardAdminService';

export const boardMasterKeys = {
  all: ['board-masters'] as const,
  lists: () => [...boardMasterKeys.all, 'list'] as const,
  list: (params: BoardMasterListParams) => [...boardMasterKeys.lists(), params] as const,
  details: () => [...boardMasterKeys.all, 'detail'] as const,
  detail: (bbsId: string) => [...boardMasterKeys.details(), bbsId] as const,
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
};
