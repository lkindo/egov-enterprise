import client from '@/lib/api/client';
import { FileVO, FileSearchParams } from '@/types/file';
import { PaginationResponse } from '@/types/system';

const fileService = {
    /**
     * 전역 파일 목록 조회 (Admin)
     */
    getAdminFileList: async (params: FileSearchParams) => {
        const response = await client.get<PaginationResponse<FileVO>>('/admin/cmm/fms/selectFileList.do', { params });
        return response.data;
    },

    /**
     * 파일 행 삭제 (Admin)
     */
    deleteAdminFile: async (atchFileId: string, fileSn: number) => {
        const response = await client.delete('/admin/cmm/fms/deleteFile.do', {
            params: { atchFileId, fileSn }
        });
        return response.data;
    }
};

export default fileService;
