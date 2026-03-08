import { UserService } from '@/services/core/ApiService';

/**
 * 게시판 댓글 서비스
 * 백엔드: com.company.project.api.controller.comment.CommentController
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
    async getComments(params: { nttId: number; bbsId: string; page?: number; size?: number }) {
        const response = await this.get<any>('', { params });
        return response?.result;
    }

    /** 댓글 생성 */
    async createComment(data: Partial<Comment>) {
        const response = await this.post<any>('', data);
        return response?.result;
    }

    /** 댓글 수정 */
    async updateComment(id: number, data: Partial<Comment>) {
        const response = await this.put<any>(`/${id}`, data);
        return response?.result;
    }

    /** 댓글 삭제 */
    async deleteComment(id: number) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result;
    }
}

export const commentService = new CommentService();
