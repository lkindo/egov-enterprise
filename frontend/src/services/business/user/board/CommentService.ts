import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * ?볤? ?뺣낫 ?명꽣?섏씠님 */
export interface Comment {
 id: number;
 nttId: number;
 bbsId: string;
 commentNo: number;
 wrterId: string;
 wrterNm: string;
 commentPassword?: string;
 commentCn: string;
 frstRegisterPnttm: string;
}

class CommentService extends UserService {
 constructor() {
 super('/comments');
 }

 /** ?볤? 紐⑸줉 조회 */
 async getComments(params: { nttId: number; bbsId: string; page?: number; size?: number }): Promise<PageResponse<Comment>> {
 return this.get<PageResponse<Comment>>('', { params });
 }

 /** ?볤? 등록 */
 async createComment(data: Partial<Comment>): Promise<Comment> {
 return this.post<Comment>('', data);
 }

 /** ?볤? ?섏젙 */
 async updateComment(id: number, data: Partial<Comment>): Promise<void> {
 return this.put<void>(`/${id}`, data);
 }

 /** ?볤? 님젣 */
 async deleteComment(id: number): Promise<void> {
 return this.delete<void>(`/${id}`);
 }
}

export const commentService = new CommentService();
