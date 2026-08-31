import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components } from '@/types/generated-api';
import { deleteComment_1Operation, getComments_1Operation } from '@/types/generated-operations';

interface CommentDetail {
  ansSn: number;
  pstSn: number;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  ansCn: string;
  crtDt: string;
}

function requireCommentPage(
  response: components['schemas']['PageResponseCommentDto'],
): PageResponse<CommentDetail> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('댓글 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as unknown as PageResponse<CommentDetail>;
}

function withoutConfigParams(config?: AxiosRequestConfig): AxiosRequestConfig | undefined {
  if (!config || !Object.hasOwn(config, 'params')) return config;
  const nextConfig = { ...config };
  delete nextConfig.params;
  return nextConfig;
}

/**
 * 댓글 관리 서비스 (Admin)
 *
 * 경로 주의: 백엔드 관리자 댓글 API 는 `@RequestMapping("/api/v1/admin/comments")` 로,
 * AdminService 의 기본 조립 규칙(`admin/{category=system}/{path}`)이 만드는
 * `admin/system/comments` 와 일치하지 않는다(목록·삭제 전건 404 원인).
 * 따라서 IsmAdminService 선례와 동일하게 ApiService 를 직접 상속해 경로를 확정한다.
 */
class CommentAdminService extends ApiService {
  constructor() {
    super('admin/comments');
  }

  /**
   * 전체 댓글 목록 조회.
   * 공개 API의 searchWrd 별칭은 OpenAPI가 정의한 searchKeyword 쿼리로 정규화한다.
   * page/size는 Spring Pageable의 0-based 축을 그대로 유지한다.
   */
  async getComments(params: { pstSn?: number; bbsId?: string; page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<CommentDetail>> {
    const response = await this.executeGenerated(getComments_1Operation, {
      query: {
        ...(params.pstSn === undefined ? {} : { pstSn: params.pstSn }),
        ...(params.bbsId === undefined ? {} : { bbsId: params.bbsId }),
        ...(params.page === undefined ? {} : { page: params.page }),
        ...(params.size === undefined ? {} : { size: params.size }),
        ...(params.searchWrd === undefined ? {} : { searchKeyword: params.searchWrd }),
      },
      config: withoutConfigParams(config),
    });
    return requireCommentPage(response);
  }

  /** 댓글 삭제 */
  async deleteComment(ansSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteComment_1Operation, {
      path: { id: ansSn },
      config,
    });
  }
}

export const commentAdminService = new CommentAdminService();
