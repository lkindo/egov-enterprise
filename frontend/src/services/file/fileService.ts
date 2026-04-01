import client from '@/lib/api/client';
import { PageResponse } from '@/types/foundation/system';
import { FileVO, FileSearchParams } from '@/types/business/file';

/**
 * ?뚯씪 愿由님쒕퉬님(Admin ?꾩슜)
 */
const fileService = {
 /**
 * ?뚯씪 紐⑸줉 조회
 * @param params 寃님議곌굔 (FileSearchParams)
 */
 getAdminFileList: async (params: FileSearchParams): Promise<PageResponse<FileVO>> => {
 return client.get<PageResponse<FileVO>>('/admin/cmm/fms/selectFileList.do', { params });
 },

 /**
 * ?뚯씪 媛쒕퀎 님젣
 * @param atchFileId 泥⑤님뚯씪 ID
 * @param fileSn ?뚯씪 ?쒕쾲
 */
 deleteAdminFile: async (atchFileId: string, fileSn: number): Promise<void> => {
 return client.delete('/admin/cmm/fms/deleteFile.do', {
 params: { atchFileId, fileSn }
 });
 }
};

export default fileService;
