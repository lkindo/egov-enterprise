import { ApiService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

/**
 * 파일 정보 인터페이스
 */
interface FileVO {
  atchFileId: string;
  fileSn: number;
  fileExtsn: string;
  fileMg: number;
  fileStreCours: string;
  orignlFileNm: string;
  streFileNm: string;
}

/**
 * 파일 관리 서비스
 * 백엔드 FileApiController 연동 (/api/v1/files)
 */
class FileService extends ApiService {
  constructor() {
    super('files');
  }

  /**
   * 파일 업로드
   * @param files 업로드할 파일 리스트
   */
  async uploadFiles(files: File[] | FileList, config?: AxiosRequestConfig): Promise<string> {
    const formData = new FormData();
    const fileList = files instanceof FileList ? Array.from(files) : files;
    fileList.forEach(file => formData.append('files', file));

    return this.post<string>('', formData, {
      ...config,
      headers: { 
        ...config?.headers,
        'Content-Type': 'multipart/form-data' 
      }
    });
  }

  /**
   * 파일 목록 조회
   * @param atchFileId 통합 파일 ID
   */
  async getFileList(atchFileId: string, config?: AxiosRequestConfig): Promise<FileVO[]> {
    if (!atchFileId) return [];
    return this.get<FileVO[]>(`/${atchFileId}`, config);
  }

  /**
   * 파일 다운로드
   * @param atchFileId 통합 파일 ID
   * @param fileSn 파일 순번
   */
  downloadFile(atchFileId: string, fileSn: number) {
    if (!atchFileId) return;
    const url = `${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/files/${atchFileId}/${fileSn}`;
    window.open(url, '_blank');
  }

  /**
   * 파일 개별 삭제
   */
  async deleteFile(atchFileId: string, fileSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${atchFileId}/${fileSn}`, config);
  }
}

export const fileService = new FileService();
