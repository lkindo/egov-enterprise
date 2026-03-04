import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

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

const BASE_URL = '/comments';

export const commentService = {
    /** 댓글 목록 조회 */
    getComments: async (params: { nttId: number; bbsId: string; page?: number; size?: number }) => {
        return client.get<PaginationResponse<Comment>>(BASE_URL, { params });
    },

    /** 댓글 생성 */
    createComment: async (data: Partial<Comment>) => {
        return client.post<number>(BASE_URL, data);
    },

    /** 댓글 수정 */
    updateComment: async (id: number, data: Partial<Comment>) => {
        return client.put<void>(`${BASE_URL}/${id}`, data);
    },

    /** 댓글 삭제 */
    deleteComment: async (id: number) => {
        return client.delete<void>(`${BASE_URL}/${id}`);
    },
};