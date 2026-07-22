import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

interface CommentDetail {
  ansSn: number;
  pstId: string;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  ansCn: string;
  crtDt: string;
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
   * ⚠ 백엔드 CommentApiController#getComments 는 pstId/bbsId/Pageable 만 서비스에 배선하고
   *   키워드 검색(searchKeyword)은 아직 미지원이다. 여기서 넘기는 searchWrd 는 서버에서 무시된다.
   */
  async getComments(params: { pstId?: string; bbsId?: string; page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<CommentDetail>> {
    return this.get<PageResponse<CommentDetail>>('', { ...config, params });
  }

  /** 댓글 삭제 */
  async deleteComment(ansSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${ansSn}`, config);
  }
}

export const commentAdminService = new CommentAdminService();
