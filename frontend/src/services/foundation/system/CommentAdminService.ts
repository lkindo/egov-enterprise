import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface CommentDetail {
 commentNo: number;
 nttId: number;
 bbsId: string;
 wrterId: string;
 wrterNm: string;
 commentCn: string;
 createdDate: string;
}

/**
 * 댓글 관리 서비스 (Admin)
 */
class CommentAdminService extends AdminService {
 constructor() {
 super('/comments');
 }

 /** 전체 댓글 목록 조회 */
 async getComments(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<CommentDetail>> {
 return this.get<PageResponse<CommentDetail>>('', { ...config, params });
 }

 /** 댓글 삭제 */
 async deleteComment(commentNo: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${commentNo}`, config);
 }
}

export const commentAdminService = new CommentAdminService();
