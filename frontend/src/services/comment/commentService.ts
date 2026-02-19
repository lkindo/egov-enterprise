import client from '@/lib/api/client';
import { CommentVO, CommentSearchParams, CommentSaveRequest } from '@/types/comment';
import { PaginationResponse } from '@/types/system';
import { ApiResponse } from '@/types/api';

const commentService = {
    /**
     * 특정 게시글의 댓글 목록 조회
     */
    getComments: async (params: CommentSearchParams) => {
        const response = await client.get<ApiResponse<PaginationResponse<CommentVO>>>('/v1/comments', { params });
        return response.data;
    },

    /**
     * 댓글 등록
     */
    createComment: async (data: CommentSaveRequest) => {
        const response = await client.post<ApiResponse<number>>('/v1/comments', data);
        return response.data;
    },

    /**
     * 댓글 수정
     */
    updateComment: async (id: number, data: CommentSaveRequest) => {
        const response = await client.put<ApiResponse<void>>(`/v1/comments/${id}`, data);
        return response.data;
    },

    /**
     * 댓글 삭제
     */
    deleteComment: async (id: number) => {
        const response = await client.delete<ApiResponse<void>>(`/v1/comments/${id}`);
        return response.data;
    },

    /**
     * 전역 댓글 목록 조회 (Admin)
     */
    getAdminCommentList: async (params: any) => {
        const response = await client.get<PaginationResponse<CommentVO>>('/admin/cop/cmt/selectCommentList.do', { params });
        return response.data;
    },

    /**
     * 댓글 삭제 (Admin)
     */
    deleteAdminComment: async (commentNo: number) => {
        const response = await client.delete('/admin/cop/cmt/deleteComment.do', {
            params: { commentNo }
        });
        return response.data;
    }
};

export default commentService;
