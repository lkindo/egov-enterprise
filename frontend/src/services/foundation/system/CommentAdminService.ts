import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface CommentDetail {
 commentNo: number;
 pstId: number;
 bbsId: string;
 wrterId: string;
 wrterNm: string;
 commentCn: string;
 createdDate: string;
}

/**
 * ?ìÍ? Í¥ÄÎ¶??úÎπÑ??Admin)
 */
class CommentAdminService extends AdminService {
 constructor() {
 super('/comments');
 }

 /** ?ÑÏ≤¥ ?ìÍ? Î™©Î°ù Ï°∞Ìöå */
 async getComments(params: { pstId?: number; bbsId?: string; page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<CommentDetail>> {
 return this.get<PageResponse<CommentDetail>>('', { ...config, params });
 }

 /** ?ìÍ? ??†ú */
 async deleteComment(commentNo: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${commentNo}`, config);
 }
}

export const commentAdminService = new CommentAdminService();
