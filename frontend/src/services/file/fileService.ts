import client from '@/lib/api/client';
import { FileVO, FileSearchParams } from '@/types/file';
import { PaginationResponse } from '@/types/system';

/**
 * ???뵬 ?온????뺥돩??(Admin ?袁⑹뒠)
 */
const fileService = {
    /**
     * ?온?귐딆쁽?????뵬 筌뤴뫖以?鈺곌퀬??
     * @param params 野꺜?????뵬沃섎챸苑?(FileSearchParams)
     */
    getAdminFileList: async (params: FileSearchParams) => {
        const response = await client.get<PaginationResponse<FileVO>>('/admin/cmm/fms/selectFileList.do', { params });
        return response;
    },

    /**
     * ?온?귐딆쁽?????뵬 ??ｊ탷 ????
     * @param atchFileId 筌ｂ뫀????뵬 ID
     * @param fileSn ???뵬 ??뺤쓰
     */
    deleteAdminFile: async (atchFileId: string, fileSn: number) => {
        const response = await client.delete('/admin/cmm/fms/deleteFile.do', {
            params: { atchFileId, fileSn }
        });
        return response;
    }
};

export default fileService;
