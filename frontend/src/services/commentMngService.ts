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
  getComments: async (params: { page?: number; size?: number; searchWrd?: string }, config?: any) => {
    return client.get<any>('/admin/system/comments', { ...config, params });
  },

  deleteComment: async (commentNo: number, config?: any) => {
    return client.delete(`/admin/system/comments/${commentNo}`, config);
  }
};

