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
    return response;
  },

  deleteFile: async (atchFileId: string, fileSn: number) => {
    const response = await client.delete(`/admin/system/files/${atchFileId}/${fileSn}`);
    return response;
  },

  /**
   * 파일 업로드
   * @param files 업로드할 파일 리스트
   * @returns atchFileId
   */
  uploadFiles: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await client.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  }
};
