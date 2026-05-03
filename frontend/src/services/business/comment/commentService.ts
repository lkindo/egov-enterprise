import { ApiService } from '@/services/core/ApiService';
import { CommentVO, CommentSearchParams, CommentSaveRequest } from '@/types/business/comment';
import { AxiosRequestConfig } from 'axios';
import { PageResponse } from '@/types/foundation/system';

/**
 * 댓글 ?쒕퉬님 */
class CommentService extends ApiService {
 constructor() {
 super('/v1/comments');
 }

  /** 댓글 목록 조회 */
  async getComments(params: CommentSearchParams, config?: AxiosRequestConfig): Promise<PageResponse<CommentVO>> {
    const response = await this.get<any>('', { ...config, params });
    // Handle both legacy and new structures if necessary, but here we assume normalization
    return {
      list: response.list || response.resultList || [],
      total: response.total || response.paginationInfo?.totalRecordCount || 0,
      page: response.page || 1,
      size: response.size || 10,
      totalPage: response.totalPage || 1
    };
  }

 /** 댓글 등록 */
 async createComment(data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<number> {
 return this.post<number>('', data, config);
 }

 /** 댓글 ?섏젙 */
 async updateComment(id: number, data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}`, data, config);
 }

 /** 댓글 님젣 */
 async deleteComment(id: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${id}`, config);
 }
}

export const commentService = new CommentService();
export default commentService;
