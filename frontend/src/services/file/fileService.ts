import client from '@/lib/api/client';
import { FileVO, FileSearchParams } from '@/types/file';
import { PaginationResponse } from '@/types/system';

/**
 * 파일 관리 서비스 (Admin 전용)
 */
const fileService = {
    /**
     * 관리자용 파일 목록 조회
     * @param params 검색 파라미터 (FileSearchParams)
     */
    getAdminFileList: async (params: FileSearchParams) => {
        const response = await client.get<PaginationResponse<FileVO>>('/admin/cmm/fms/selectFileList.do', { params });
        return response;
    },

    /**
     * 관리자용 파일 단건 삭제
     * @param atchFileId 첨부파일 ID
     * @param fileSn 파일 순번
     */
    deleteAdminFile: async (atchFileId: string, fileSn: number) => {
        const response = await client.delete('/admin/cmm/fms/deleteFile.do', {
            params: { atchFileId, fileSn }
        });
        return response;
    }
};

export default fileService;