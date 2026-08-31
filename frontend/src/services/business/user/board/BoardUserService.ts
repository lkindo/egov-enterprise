import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { BoardPost } from '@/types/business/board';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  createPostOperation,
  deletePostOperation,
  getPostOperation,
  getPostsOperation,
  likePostOperation,
  updatePostOperation,
} from '@/types/generated-operations';

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
    return this.executeGenerated(getPostsOperation, {
      path: { bbsId },
      query: params,
    }) as Promise<PageResponse<BoardPost>>;
  }

  async getPost(bbsId: string, pstSn: number): Promise<BoardPost> {
    return this.executeGenerated(getPostOperation, {
      path: { bbsId, pstSn },
    }) as Promise<BoardPost>;
  }

  async createPost(data: Partial<BoardPost>): Promise<BoardPost> {
    const response = await this.executeGenerated(createPostOperation, {
      body: data as GeneratedOperationRequest<'createPost'>,
    });
    // 서버의 실제 반환값은 생성된 게시글 ID다. 기존 공개 시그니처와 런타임 반환은 모두 유지한다.
    return response as unknown as BoardPost;
  }

  async updatePost(bbsId: string, pstSn: number, data: Partial<BoardPost>): Promise<void> {
    return this.executeGenerated(updatePostOperation, {
      path: { bbsId, pstSn },
      body: data as GeneratedOperationRequest<'updatePost'>,
    });
  }

  async deletePost(bbsId: string, pstSn: number): Promise<void> {
    return this.executeGenerated(deletePostOperation, {
      path: { bbsId, pstSn },
    });
  }

  async likePost(bbsId: string, pstSn: number): Promise<number> {
    // ApiService.patch가 이미 ApiResponse.data(=새 추천수)를 추출해 반환하므로 추가 .data 접근 금지(과거 undefined 반환 버그).
    return this.executeGenerated(likePostOperation, {
      path: { bbsId, pstSn },
    });
  }
}

export const boardUserService = new BoardUserService();
