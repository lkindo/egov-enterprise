import client from '@/lib/api/client';

/**
 * ???뵬 ?온????뺥돩?? * 獄쏄퉮肉?? com.company.project.api.controller.file.FileController
 */
export interface SharedFileDetail {
    atchFileId: string;
    fileSn: number;
    fileExtsn: string;
    orignlFileNm: string;
    fileSize: number;
    fileStrePath: string;
    streFileNm: string;
    creatDt: string;
    createdDate?: string; // ?紐낆넎?源놁뒠 ?곕떽?
}

const BASE_URL = '/files';

export const fileMngService = {
    /** ???뵬 筌뤴뫖以?鈺곌퀬??(Admin ?袁⑹뒠) */
    getFiles: async (params?: any) => {
        return client.get<any>(BASE_URL, { params });
    },

    /** ???뵬 ??낆쨮??(Multipart) */
    uploadFiles: async (files: File[]): Promise<string> => {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        return client.post<string>(BASE_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    /** 筌ｂ뫀????뵬 筌뤴뫖以?鈺곌퀬??*/
    getFileList: async (atchFileId: string): Promise<SharedFileDetail[]> => {
        return client.get<SharedFileDetail[]>(`${BASE_URL}/${atchFileId}`);
    },

    /** ???뵬 ??쇱뒲嚥≪뮆諭?URL ??밴쉐 */
    getDownloadUrl: (atchFileId: string, fileSn: number): string => {
        const baseUrl = typeof window === 'undefined'
            ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'
            : '/api/v1';
        return `${baseUrl}${BASE_URL}/${atchFileId}/${fileSn}`;
    },

    /** ???뵬 ????(?袁⑹뒄 ??獄쏄퉮肉???닌뗭겱 ?類ㅼ뵥 ???곕떽?) */
    deleteFile: async (atchFileId: string, fileSn: number) => {
        return client.delete<void>(`${BASE_URL}/${atchFileId}/${fileSn}`);
    },
};
