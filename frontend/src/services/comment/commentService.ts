import client from '@/lib/api/client';
import { CommentVO, CommentSearchParams, CommentSaveRequest } from '@/types/comment';
import { PaginationResponse } from '@/types/system';
import { ApiResponse } from '@/types/api';

const commentService = {
    /**
     * ?뱀젙 寃뚯떆湲???볤? 紐⑸줉 議고쉶
     */
    getComments: async (params: CommentSearchParams) => {
        const response = await client.get<ApiResponse<PaginationResponse<CommentVO>>>('/v1/comments', { params });
        return response;
    },

    /**
     * ?볤? ?깅줉
     */
    createComment: async (data: CommentSaveRequest) => {
        const response = await client.post<ApiResponse<number>>('/v1/comments', data);
        return response;
    },

    /**
     * ?볤? ?섏젙
     */
    updateComment: async (id: number, data: CommentSaveRequest) => {
        const response = await client.put<ApiResponse<void>>(`/v1/comments/${id}`, data);
        return response;
    },

    /**
     * ?볤? ??젣
     */
    deleteComment: async (id: number) => {
        const response = await client.delete<ApiResponse<void>>(`/v1/comments/${id}`);
        return response;
    },

    /**
     * ?꾩뿭 ?볤? 紐⑸줉 議고쉶 (Admin)
     */
    getAdminCommentList: async (params: any) => {
        const response = await client.get<PaginationResponse<CommentVO>>('/admin/cop/cmt/selectCommentList.do', { params });
        return response;
    },

    /**
     * ?볤? ??젣 (Admin)
     */
    deleteAdminComment: async (commentNo: number) => {
        const response = await client.delete('/admin/cop/cmt/deleteComment.do', {
            params: { commentNo }
        });
        return response;
    }
};

export default commentService;

