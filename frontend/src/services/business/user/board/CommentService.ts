import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 댓글 정보 인터페이스
 */
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

 /** 댓글 목록 조회 */
 async getComments(params: { nttId: number; bbsId: string; page?: number; size?: number }): Promise<PageResponse<Comment>> {
 return this.get<PageResponse<Comment>>('', { params });
 }

 /** 댓글 등록 */
 async createComment(data: Partial<Comment>): Promise<Comment> {
 return this.post<Comment>('', data);
 }

 /** 댓글 수정 */
 async updateComment(id: number, data: Partial<Comment>): Promise<void> {
 return this.put<void>(`/${id}`, data);
 }

 /** 댓글 삭제 */
 async deleteComment(id: number): Promise<void> {
 return this.delete<void>(`/${id}`);
 }
}

export const commentService = new CommentService();
