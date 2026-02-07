import client from '@/lib/api/client';
import { CommentVO, CommentSearchParams } from '@/types/comment';
import { PaginationResponse } from '@/types/system';

const commentService = {
    /**
     * 전역 댓글 목록 조회 (Admin)
     */
    getAdminCommentList: async (params: CommentSearchParams) => {
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
