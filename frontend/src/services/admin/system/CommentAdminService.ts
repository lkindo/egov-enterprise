import { AdminService } from '@/services/core/ApiService';

export interface CommentDetail {
    commentNo: number;
    nttId: number;
    bbsId: string;
    wrterId: string;
    wrterNm: string;
    commentCn: string;
    createdDate: string;
}

class CommentAdminService extends AdminService {
    constructor() {
        super('/system/comments');
    }

    async getComments(params: { page?: number; size?: number; searchWrd?: string }, config?: any) {
        return this.get<any>('', { ...config, params });
    }

    async deleteComment(commentNo: number, config?: any) {
        return this.delete(`/${commentNo}`, config);
    }
}

export const commentAdminService = new CommentAdminService();
