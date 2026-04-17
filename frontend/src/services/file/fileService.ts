import client from '@/lib/api/client';

/**
 * 파일 정보 인터페이스
 */
export interface FileVO {
  atchFileId: string;
  fileSn: number;
  fileExtsn: string;
  fileMg: number;
  fileStreCours: string;
  orignlFileNm: string;
  streFileNm: string;
}

/**
 * 파일 관리 서비스 (RESTful)
 */
const fileService = {
  /**
   * 파일 업로드
   * @param files 업로드할 파일 리스트
   */
  uploadFiles: async (files: File[] | FileList): Promise<string> => {
    const formData = new FormData();
    const fileList = files instanceof FileList ? Array.from(files) : files;
    fileList.forEach(file => formData.append('files', file));

    return client.post<string>('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  /**
   * 파일 목록 조회
   * @param atchFileId 통합 파일 ID
   */
  getFileList: async (atchFileId: string): Promise<FileVO[]> => {
    if (!atchFileId) return [];
    return client.get<FileVO[]>(`/files/${atchFileId}`);
  },

  /**
   * 파일 다운로드
   * @param atchFileId 통합 파일 ID
   * @param fileSn 파일 순번
   */
  downloadFile: (atchFileId: string, fileSn: number) => {
    if (!atchFileId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/files/${atchFileId}/${fileSn}`;
    window.open(url, '_blank');
  },

  /**
   * 파일 개별 삭제 (백엔드 구현 확인 필요, 현재는 목록 조회/업로드 위주)
   */
  deleteFile: async (atchFileId: string, fileSn: number): Promise<void> => {
    return client.delete(`/files/${atchFileId}/${fileSn}`);
  }
};

export default fileService;
