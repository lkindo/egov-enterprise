import client from '@/lib/api/client';
import { BoardPost, BoardResponse } from '@/types/board';

export const boardService = {
  /**
   * 寃뚯떆臾?紐⑸줉 議고쉶
   */
  getPosts: async (bbsId: string, params: { page?: number; size?: number; searchWrd?: string; searchCnd?: string }) => {
    const response = await client.get(`/boards/${bbsId}`, { params });
    return response;
  },

  /**
   * 寃뚯떆臾??곸꽭 議고쉶
   */
  getPost: async (bbsId: string, nttId: number) => {
    const response = await client.get(`/boards/${bbsId}/posts/${nttId}`);
    return response;
  },

  /**
   * 寃뚯떆臾??깅줉
   */
  createPost: async (data: Partial<BoardPost>) => {
    const response = await client.post('/boards/posts', data);
    return response;
  },

  /**
   * 寃뚯떆臾???젣
   */
  deletePost: async (bbsId: string, nttId: number) => {
    const response = await client.delete(`/boards/${bbsId}/posts/${nttId}`);
    return response;
  }
};

