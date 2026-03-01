import client from '@/lib/api/client';
import { AdminService } from '@/services/core/ApiService';

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

export interface FileResponse {
    success: boolean;
    data: {
        content: FileDetail[];
        totalElements: number;
    };
    message?: string;
}

class FileAdminService extends AdminService {
    constructor() {
        super('/system/files');
    }

    async getFiles(params: { page?: number; size?: number; searchWrd?: string }): Promise<any> {
        return this.get<any>('', { params });
    }

    async deleteFile(atchFileId: string, fileSn: number) {
        return this.delete(`/${atchFileId}/${fileSn}`);
    }

    /**
     * 파일 업로드
     * @param files 업로드할 파일 리스트
     * @returns atchFileId
     */
    async uploadFiles(files: File[]) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        // AdminBase에 정의된 basePath 외에, 루트 경로의 API를 호출하기 위한 예외처리 가능
        // 현재는 /files로 설정되어 있으므로 직접 절대경로를 사용하는 것이 바람직합니다.
        return this.post<any>('/files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            baseURL: process.env.NEXT_PUBLIC_API_URL // use env configured base url
        });
    }
}

export const fileAdminService = new FileAdminService();
