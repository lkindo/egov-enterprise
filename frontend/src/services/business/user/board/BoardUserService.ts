import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { BoardPost } from '@/types/business/board';

class BoardUserService extends UserService {
  constructor() {
    super('/boards');
  }

  /**
   * 게시글 목록 조회.
   * `page` 는 Spring Pageable 규약대로 0-based 다(호출부에서 1-based UI 값을 변환해 전달할 것).
   * orderBy/startDate/endDate/qnaStatus/qnaCategory 는 BoardApiController#getPosts 가 지원하는 필터다.
   */
  async getPosts(bbsId: string, params: {
    page?: number;
    size?: number;
    searchWrd?: string;
    searchCnd?: string;
    orderBy?: string;
    startDate?: string;
    endDate?: string;
    qnaStatus?: string;
    qnaCategory?: string;
  }): Promise<PageResponse<BoardPost>> {
    return this.get<PageResponse<BoardPost>>(`/${bbsId}`, { params });
  }

  async getPost(bbsId: string, pstSn: number): Promise<BoardPost> {
    return this.get<BoardPost>(`/${bbsId}/posts/${pstSn}`);
  }

  async createPost(data: Partial<BoardPost>): Promise<BoardPost> {
    return this.post<BoardPost>('/posts', data);
  }

  async updatePost(bbsId: string, pstSn: number, data: Partial<BoardPost>): Promise<void> {
    return this.put<void>(`/${bbsId}/posts/${pstSn}`, data);
  }

  async deletePost(bbsId: string, pstSn: number): Promise<void> {
    return this.delete<void>(`/${bbsId}/posts/${pstSn}`);
  }

  async likePost(bbsId: string, pstSn: number): Promise<number> {
    // ApiService.patch가 이미 ApiResponse.data(=새 추천수)를 추출해 반환하므로 추가 .data 접근 금지(과거 undefined 반환 버그).
    return this.patch<number>(`/${bbsId}/posts/${pstSn}/like`);
  }
}

export const boardUserService = new BoardUserService();
