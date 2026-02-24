import client from '@/lib/api/client';
import { FileVO, FileSearchParams } from '@/types/file';
import { PaginationResponse } from '@/types/system';

const fileService = {
    /**
     * ?꾩뿭 ?뚯씪 紐⑸줉 議고쉶 (Admin)
     */
    getAdminFileList: async (params: FileSearchParams) => {
        const response = await client.get<PaginationResponse<FileVO>>('/admin/cmm/fms/selectFileList.do', { params });
        return response;
    },

    /**
     * ?뚯씪 ????젣 (Admin)
     */
    deleteAdminFile: async (atchFileId: string, fileSn: number) => {
        const response = await client.delete('/admin/cmm/fms/deleteFile.do', {
            params: { atchFileId, fileSn }
        });
        return response;
    }
};

export default fileService;

