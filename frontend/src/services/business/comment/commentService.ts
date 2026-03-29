import { ApiService } from '@/services/core/ApiService';
import { CommentVO, CommentSearchParams, CommentSaveRequest } from '@/types/business/comment';
import { AxiosRequestConfig } from 'axios';

interface CommentListResult {
 resultList: CommentVO[];
 paginationInfo: unknown;
}

/**
 * 댓글 서비스
 */
class CommentService extends ApiService {
 constructor() {
 super('/v1/comments');
 }

 /** 댓글 목록 조회 */
 async getComments(params: CommentSearchParams, config?: AxiosRequestConfig): Promise<CommentListResult> {
 return this.get<CommentListResult>('', { ...config, params });
 }

 /** 댓글 등록 */
 async createComment(data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<number> {
 return this.post<number>('', data, config);
 }

 /** 댓글 수정 */
 async updateComment(id: number, data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}`, data, config);
 }

 /** 댓글 삭제 */
 async deleteComment(id: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${id}`, config);
 }
}

export const commentService = new CommentService();
export default commentService;
