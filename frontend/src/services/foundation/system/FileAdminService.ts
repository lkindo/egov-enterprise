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
 * ?뚯씪 관리님쒕퉬님(Admin)
 */
class FileAdminService extends AdminService {
 constructor() {
 super('/files');
 }

 /**
 * ?뚯씪 紐⑸줉 조회
 */
 async getFiles(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<FileDetail>> {
 return this.get<PageResponse<FileDetail>>('', { ...config, params });
 }

 /**
 * ?뚯씪 님젣
 */
 async deleteFile(atchFileId: string, fileSn: number, config?: AxiosRequestConfig): Promise<void> {
 return this.delete<void>(`/${atchFileId}/${fileSn}`, config);
 }

 /**
 * ?뚯씪 ?낅줈님 * @param files ?낅줈?쒗븷 ?뚯씪 由ъ뒪님 * @returns atchFileId
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
