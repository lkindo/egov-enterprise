import {
  mutationOptions,
  queryOptions,
  type QueryClient,
} from '@tanstack/react-query';
import { commentService } from '@/services/business/comment/commentService';
import { commentAdminService } from '@/services/foundation/system/CommentAdminService';
import type { operations } from '@/types/generated-api';
import type { CommentSearchParams } from '@/types/business/comment';

export type CommentAdminListParams = NonNullable<
  operations['getComments_1']['parameters']['query']
>;

export const commentKeys = {
  all: ['comments'] as const,
  lists: () => [...commentKeys.all, 'list'] as const,
  list: (params: CommentSearchParams) => [...commentKeys.lists(), params] as const,
  admin: () => [...commentKeys.all, 'admin'] as const,
  adminLists: () => [...commentKeys.admin(), 'list'] as const,
  adminList: (params: CommentAdminListParams) => [...commentKeys.adminLists(), params] as const,
};

export const commentQueryOptions = {
  list: (params: CommentSearchParams) => queryOptions({
    queryKey: commentKeys.list(params),
    queryFn: () => commentService.getComments(params),
  }),
  adminList: (params: CommentAdminListParams) => queryOptions({
    queryKey: commentKeys.adminList(params),
    queryFn: () => commentAdminService.getComments(params),
  }),
};

export const commentMutationOptions = {
  removeAdmin: (queryClient: QueryClient) => mutationOptions({
    mutationFn: async (ansSn: number) => {
      await commentAdminService.deleteComment(ansSn);
      await queryClient.invalidateQueries({ queryKey: commentKeys.adminLists() });
    },
  }),
};
