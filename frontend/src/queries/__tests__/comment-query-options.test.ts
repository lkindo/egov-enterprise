import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const publicService = vi.hoisted(() => ({ getComments: vi.fn() }));
const adminService = vi.hoisted(() => ({ getComments: vi.fn(), deleteComment: vi.fn() }));

vi.mock('@/services/business/comment/commentService', () => ({ commentService: publicService }));
vi.mock('@/services/foundation/system/CommentAdminService', () => ({ commentAdminService: adminService }));

import {
  commentKeys,
  commentMutationOptions,
  commentQueryOptions,
} from '../comment-query-options';

describe('comment query ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('사용자 목록과 관리자 목록을 충돌하지 않는 계층형 key로 소유한다', () => {
    expect(commentKeys.list({ pstSn: 7, bbsId: 'BBSMSTR_A', size: 100 })).toEqual([
      'comments', 'list', { pstSn: 7, bbsId: 'BBSMSTR_A', size: 100 },
    ]);
    expect(commentKeys.adminList({ page: 1, size: 50 })).toEqual([
      'comments', 'admin', 'list', { page: 1, size: 50 },
    ]);
  });

  it('사용자·관리자 query options가 각 서비스 호출까지 소유한다', async () => {
    publicService.getComments.mockResolvedValueOnce({ list: [] });
    adminService.getComments.mockResolvedValueOnce({ list: [] });
    const publicOptions = commentQueryOptions.list({ pstSn: 7, bbsId: 'BBSMSTR_A' });
    const adminOptions = commentQueryOptions.adminList({ page: 1, size: 50 });

    await publicOptions.queryFn?.({ queryKey: publicOptions.queryKey } as never);
    await adminOptions.queryFn?.({ queryKey: adminOptions.queryKey } as never);

    expect(publicService.getComments).toHaveBeenCalledWith({ pstSn: 7, bbsId: 'BBSMSTR_A' });
    expect(adminService.getComments).toHaveBeenCalledWith({ page: 1, size: 50 });
  });

  it('관리자 삭제 성공 뒤 factory의 관리자 목록 범위만 무효화한다', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    adminService.deleteComment.mockResolvedValueOnce(undefined);

    await commentMutationOptions.removeAdmin(queryClient).mutationFn?.(11, {} as never);

    expect(adminService.deleteComment).toHaveBeenCalledWith(11);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: commentKeys.adminLists() });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: commentKeys.all });
  });
});
