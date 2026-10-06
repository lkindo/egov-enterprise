import { ApiService } from '@/services/core/ApiService';
import { requirePageResponse } from '@/services/core/page-response';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import { deleteComment_1Operation, getComments_1Operation } from '@/types/generated-operations';

export interface CommentDetail {
  ansSn: number;
  pstSn: number;
  bbsId: string;
  editable?: boolean;
  deletable?: boolean;
  wrterNm: string;
  ansCn: string;
  crtDt: string;
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
 * 경로 주의: 백엔드 관리자 댓글 API 는 `@RequestMapping("/api/v1/admin/comments")` 다. 예전 AdminService
 * 기반 클래스의 조립 규칙(`admin/{category=system}/{path}`)은 `admin/system/comments` 를 만들어 목록·삭제가
 * 전건 404 였다. 지금은 생성 operation descriptor 가 경로를 소유한다.
 */
class CommentAdminService extends ApiService {
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
    return requirePageResponse(response as unknown as PageResponse<CommentDetail>, '댓글');
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
