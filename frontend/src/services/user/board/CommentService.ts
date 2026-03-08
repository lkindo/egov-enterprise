import { UserService } from '@/services/core/ApiService';

/**
 * 野껊슣????蹂? ??뺥돩?? * 獄쏄퉮肉?? com.company.project.api.controller.comment.CommentController
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

    /** ?蹂? 筌뤴뫖以?鈺곌퀬??*/
    async getComments(params: { nttId: number; bbsId: string; page?: number; size?: number }) {
        const response = await this.get<any>('', { params });
        return response?.result || response;
    }

    /** ?蹂? ??밴쉐 */
    async createComment(data: Partial<Comment>) {
        const response = await this.post<any>('', data);
        return response?.result || response;
    }

    /** ?蹂? ??륁젟 */
    async updateComment(id: number, data: Partial<Comment>) {
        const response = await this.put<any>(`/${id}`, data);
        return response?.result || response;
    }

    /** ?蹂? ????*/
    async deleteComment(id: number) {
        const response = await this.delete<any>(`/${id}`);
        return response?.result || response;
    }
}

export const commentService = new CommentService();
