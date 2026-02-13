import client from '@/lib/api/client';

export interface FileDetail {
  atchFileId: string;
  fileSn: number;
  fileStrePath: string;
  orignlFileNm: string;
  streFileNm: string;
  fileExtsn: string;
  fileSize: number;
  createdDate: string;
}

export const fileMngService = {
  getFiles: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/system/files', { params });
    return response.data;
  },

  deleteFile: async (atchFileId: string, fileSn: number) => {
    const response = await client.delete(`/admin/system/files/${atchFileId}/${fileSn}`);
    return response.data;
  }
};
