import client from '@/lib/api/client';

/**
 * 파일 관리 서비스
 * 백엔드: com.company.project.api.controller.file.FileController
 */
export interface FileDetail {
    atchFileId: string;
    fileSn: number;
    fileExtsn: string;
    orignlFileNm: string;
    fileSize: number;
    fileStrePath: string;
    streFileNm: string;
    creatDt: string;
    createdDate?: string; // 호환성용 추가
}

const BASE_URL = '/files';

export const fileMngService = {
    /** 파일 목록 조회 (Admin 전용) */
    getFiles: async (params?: any) => {
        return client.get<any>(BASE_URL, { params });
    },

    /** 파일 업로드 (Multipart) */
    uploadFiles: async (files: File[]): Promise<string> => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        return client.post<string>(BASE_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    /** 첨부파일 목록 조회 */
    getFileList: async (atchFileId: string): Promise<FileDetail[]> => {
        return client.get<FileDetail[]>(`${BASE_URL}/${atchFileId}`);
    },

    /** 파일 다운로드 URL 생성 */
    getDownloadUrl: (atchFileId: string, fileSn: number): string => {
        const baseUrl = typeof window === 'undefined'
            ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
            : '/api/v1';
        return `${baseUrl}${BASE_URL}/${atchFileId}/${fileSn}`;
    },

    /** 파일 삭제 (필요 시 백엔드 구현 확인 후 추가) */
    deleteFile: async (atchFileId: string, fileSn: number) => {
        return client.delete<void>(`${BASE_URL}/${atchFileId}/${fileSn}`);
    },
};
