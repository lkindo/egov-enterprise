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
     * ???뵬 ??낆쨮??     * @param files ??낆쨮??쀫막 ???뵬 ?귐딅뮞??     * @returns atchFileId
     */
    async uploadFiles(files: File[]) {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));

        // AdminBase???類ㅼ벥??basePath ?紐꾨퓠, ?룐뫂??野껋럥以??API???紐꾪뀱??띾┛ ?袁る립 ??됱뇚筌ｌ꼶??揶쎛??        // ?袁⑹삺??/files嚥???쇱젟??뤿선 ??됱몵沃샕嚥?筌욊낯?????野껋럥以덄몴??????롫뮉 野껉퍔??獄쏅뗀?븝쭪怨밸???덈뼄.
        return this.post<any>('/files', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            baseURL: process.env.NEXT_PUBLIC_API_URL // use env configured base url
        });
    }
}

export const fileAdminService = new FileAdminService();
