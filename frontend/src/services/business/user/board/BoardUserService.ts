import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { BoardPost } from '@/types/business/board';

class BoardUserService extends UserService {
  constructor() {
    super('/boards');
  }

  async getPosts(bbsId: string, params: { page?: number; size?: number; searchWrd?: string; searchCnd?: string }): Promise<PageResponse<BoardPost>> {
    return this.get<PageResponse<BoardPost>>(`/${bbsId}`, { params });
  }

  async getPost(bbsId: string, pstId: number): Promise<BoardPost> {
    return this.get<BoardPost>(`/${bbsId}/posts/${pstId}`);
  }

  async createPost(data: Partial<BoardPost>): Promise<BoardPost> {
    return this.post<BoardPost>('/posts', data);
  }

  async updatePost(bbsId: string, pstId: number, data: Partial<BoardPost>): Promise<void> {
    return this.put<void>(`/${bbsId}/posts/${pstId}`, data);
  }

  async deletePost(bbsId: string, pstId: number): Promise<void> {
    return this.delete<void>(`/${bbsId}/posts/${pstId}`);
  }

  async likePost(bbsId: string, pstId: number): Promise<number> {
    const response = await this.patch<{ data: number }>(`/${bbsId}/posts/${pstId}/like`);
    return response.data;
  }
}

export const boardUserService = new BoardUserService();
