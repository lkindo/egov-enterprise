import { ApiService } from '@/services/core/ApiService';
import { requirePageItems, requirePageResponse } from '@/services/core/page-response';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import { deleteComment_1Operation, getComments_1Operation } from '@/types/generated-operations';
import type { components } from '@/types/generated-api';

/** 관리자 댓글 행. 식별자(댓글·글 번호, 게시판 ID)는 삭제·이동에 쓰여 필수이고, 표시 값은 서버 계약대로 비어 올 수 있다(탈퇴 작성자 등). */
export interface CommentDetail {
  ansSn: number;
  pstSn: number;
  bbsId: string;
  editable?: boolean;
  deletable?: boolean;
  wrterNm?: string | null;
  ansCn?: string;
  crtDt?: string | null;
}

/** 화면이 기대는 식별자(댓글·글 번호, 게시판 ID)가 실제로 있는 댓글인가. */
function isCommentDetail(dto: components['schemas']['CommentDto']): dto is CommentDetail {
  return typeof dto.ansSn === 'number' && typeof dto.pstSn === 'number' && typeof dto.bbsId === 'string';
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
   * 게시판·게시글 필터만 지원하며 키워드 검색은 지원하지 않는다.
   * page(1부터)·size 는 서버가 받는 그대로 넘긴다(ADR-0036).
   */
  async getComments(params: { pstSn?: number; bbsId?: string; page?: number; size?: number }, config?: AxiosRequestConfig): Promise<PageResponse<CommentDetail>> {
    const response = await this.executeGenerated(getComments_1Operation, {
      query: {
        ...(params.pstSn === undefined ? {} : { pstSn: params.pstSn }),
        ...(params.bbsId === undefined ? {} : { bbsId: params.bbsId }),
        ...(params.page === undefined ? {} : { page: params.page }),
        ...(params.size === undefined ? {} : { size: params.size }),
      },
      config: withoutConfigParams(config),
    });
    // 검증한 같은 페이지를 돌려준다(재포장하지 않는다) — 식별자가 없는 행이 있으면 계약 위반으로 던진다.
    return requirePageItems(requirePageResponse<components['schemas']['CommentDto']>(response, '댓글'), isCommentDetail, '댓글');
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
