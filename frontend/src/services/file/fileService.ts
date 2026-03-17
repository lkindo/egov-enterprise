import client from '@/lib/api/client';
import { PageResponse } from '@/types/system';
import { FileVO, FileSearchParams } from '@/types/file';

/**
 * 파일 관리 서비스 (Admin 전용)
 */
const fileService = {
    /**
     * 파일 목록 조회
     * @param params 검색 조건 (FileSearchParams)
     */
    getAdminFileList: async (params: FileSearchParams): Promise<PageResponse<FileVO>> => {
        return client.get<PageResponse<FileVO>>('/admin/cmm/fms/selectFileList.do', { params });
    },

    /**
     * 파일 개별 삭제
     * @param atchFileId 첨부파일 ID
     * @param fileSn 파일 순번
     */
    deleteAdminFile: async (atchFileId: string, fileSn: number): Promise<void> => {
        return client.delete('/admin/cmm/fms/deleteFile.do', {
            params: { atchFileId, fileSn }
        });
    }
};

export default fileService;
