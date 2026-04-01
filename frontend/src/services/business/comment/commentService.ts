import { ApiService } from '@/services/core/ApiService';
import { CommentVO, CommentSearchParams, CommentSaveRequest } from '@/types/business/comment';
import { AxiosRequestConfig } from 'axios';

interface CommentListResult {
 resultList: CommentVO[];
 paginationInfo: unknown;
}

/**
 * ?볤? ?쒕퉬님 */
class CommentService extends ApiService {
 constructor() {
 super('/v1/comments');
 }

 /** ?볤? 紐⑸줉 조회 */
 async getComments(params: CommentSearchParams, config?: AxiosRequestConfig): Promise<CommentListResult> {
 return this.get<CommentListResult>('', { ...config, params });
 }

 /** ?볤? 등록 */
 async createComment(data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<number> {
 return this.post<number>('', data, config);
 }

 /** ?볤? ?섏젙 */
 async updateComment(id: number, data: CommentSaveRequest, config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}`, data, config);
 }

 /** ?볤? 님젣 */
 async deleteComment(id: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${id}`, config);
 }
}

export const commentService = new CommentService();
export default commentService;
