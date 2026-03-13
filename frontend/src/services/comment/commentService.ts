import client from '@/lib/api/client';
import { CommentVO, CommentSearchParams, CommentSaveRequest } from '@/types/comment';

interface CommentListResult {
    resultList: CommentVO[];
    paginationInfo: unknown;
}

const commentService = {
    getComments: async (params: CommentSearchParams): Promise<CommentListResult> =>
        client.get<CommentListResult>('/v1/comments', { params }),

    createComment: async (data: CommentSaveRequest): Promise<number> =>
        client.post<number>('/v1/comments', data),

    updateComment: async (id: number, data: CommentSaveRequest): Promise<void> =>
        client.put<void>(`/v1/comments/${id}`, data),

    deleteComment: async (id: number): Promise<void> =>
        client.delete<void>(`/v1/comments/${id}`),

    getAdminCommentList: async (params: { pageIndex?: number; searchKeyword?: string }): Promise<any> =>
        client.get('/api/v1/admin/system/comments', { params }),

    deleteAdminComment: async (id: number): Promise<void> =>
        client.delete(`/api/v1/admin/system/comments/${id}`),
};

export default commentService;
