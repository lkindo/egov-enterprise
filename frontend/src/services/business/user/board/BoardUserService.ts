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
    // ApiService.patch가 이미 ApiResponse.data(=새 추천수)를 추출해 반환하므로 추가 .data 접근 금지(과거 undefined 반환 버그).
    return this.patch<number>(`/${bbsId}/posts/${pstId}/like`);
  }
}

export const boardUserService = new BoardUserService();
