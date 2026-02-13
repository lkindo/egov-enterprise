import client from '@/lib/api/client';
import { BoardPost, BoardResponse } from '@/types/board';

export const boardService = {
  /**
   * 게시물 목록 조회
   */
  getPosts: async (bbsId: string, params: { page?: number; size?: number; searchWrd?: string; searchCnd?: string }) => {
    const response = await client.get(`/boards/${bbsId}`, { params });
    return response.data;
  },

  /**
   * 게시물 상세 조회
   */
  getPost: async (bbsId: string, nttId: number) => {
    const response = await client.get(`/boards/${bbsId}/posts/${nttId}`);
    return response.data;
  },

  /**
   * 게시물 등록
   */
  createPost: async (data: Partial<BoardPost>) => {
    const response = await client.post('/boards/posts', data);
    return response.data;
  },

  /**
   * 게시물 삭제
   */
  deletePost: async (bbsId: string, nttId: number) => {
    const response = await client.delete(`/boards/${bbsId}/posts/${nttId}`);
    return response.data;
  }
};
