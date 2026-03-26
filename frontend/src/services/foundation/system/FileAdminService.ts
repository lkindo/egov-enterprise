import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

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

/**
 * 파일 관리 서비스 (Admin)
 */
class FileAdminService extends AdminService {
 constructor() {
 super('/files');
 }

 /**
 * 파일 목록 조회
 */
 async getFiles(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<FileDetail>> {
 return this.get<PageResponse<FileDetail>>('', { ...config, params });
 }

 /**
 * 파일 삭제
 */
 async deleteFile(atchFileId: string, fileSn: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${atchFileId}/${fileSn}`, config);
 }

 /**
 * 파일 업로드
 * @param files 업로드할 파일 리스트
 * @returns atchFileId
 */
 async uploadFiles(files: File[], config?: AxiosRequestConfig): Promise<string> {
 const formData = new FormData();
 files.forEach(file => formData.append('files', file));

 return this.post<string>('/upload', formData, {
 ...config,
 headers: { 
 ...config?.headers,
 'Content-Type': 'multipart/form-data' 
 }
 });
 }
}

export const fileAdminService = new FileAdminService();
