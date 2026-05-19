vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { commentService } from '@/services/business/user/board/CommentService';

vi.mock('@/lib/api/client', () => ({
 default: {
   get: vi.fn(),
   post: vi.fn(),
   put: vi.fn(),
   delete: vi.fn(),
 }
}));

describe('Board Comment Service', () => {
 beforeEach(() => vi.clearAllMocks());

 it('getComments calls correct endpoint', async () => {
   await commentService.getComments({ pstId: 1, bbsId: 'BBS01' });
   expect(client.get).toHaveBeenCalledWith('comments', expect.objectContaining({
     params: expect.objectContaining({ pstId: 1, bbsId: 'BBS01' })
   }));
 });

 it('createComment calls post with data', async () => {
   const data = { cmntCn: 'Test comment', pstId: 1 };
   await commentService.createComment(data as any);
   expect(client.post).toHaveBeenCalledWith('comments', data, undefined);
 });
});
