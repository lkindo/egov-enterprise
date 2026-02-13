import client from '@/lib/api/client';

export interface CommentDetail {
  commentNo: number;
  nttId: number;
  bbsId: string;
  wrterId: string;
  wrterNm: string;
  commentCn: string;
  createdDate: string;
}

export const commentMngService = {
  getComments: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/system/comments', { params });
    return response.data;
  },

  deleteComment: async (commentNo: number) => {
    const response = await client.delete(`/admin/system/comments/${commentNo}`);
    return response.data;
  }
};
