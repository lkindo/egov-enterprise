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
 * ?볤? 관리님쒕퉬님(Admin)
 */
class CommentAdminService extends AdminService {
 constructor() {
 super('/comments');
 }

 /** ?꾩껜 ?볤? 紐⑸줉 조회 */
 async getComments(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<CommentDetail>> {
 return this.get<PageResponse<CommentDetail>>('', { ...config, params });
 }

 /** ?볤? 님젣 */
 async deleteComment(commentNo: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${commentNo}`, config);
 }
}

export const commentAdminService = new CommentAdminService();
