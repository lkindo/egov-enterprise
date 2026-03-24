import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface BoardMaster {
 bbsId: string;
 bbsNm: string;
 bbsIntrcn: string;
 bbsTyCode: string;
 bbsTyCodeNm: string;
 replyPosblAt: 'Y' | 'N';
 fileAtchPosblAt: 'Y' | 'N';
 posblAtchFileNumber: number;
 useAt: 'Y' | 'N';
 tmplatId: string;
 tmplatNm: string;
 frstRegisterId: string;
 frstRegisterNm: string;
 frstRegistPnttm: string;
}

/**
 * 寃뚯떆??留덉뒪??愿由??쒕퉬??(Admin)
 */
class BoardAdminService extends AdminService {
 constructor() {
 super('/board-masters');
 }

 /** 寃뚯떆??紐⑸줉 議고쉶 */
 async getBoardMasterList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<BoardMaster>> {
 return this.get<PageResponse<BoardMaster>>('', {
 ...config,
 params: {
 ...params,
 searchCnd: params?.searchCondition || '0',
 searchWrd: params?.searchKeyword || params?.searchWrd || '',
 },
 });
 }

 /** 寃뚯떆???곸꽭 議고쉶 */
 async getBoardMaster(id: string, config?: AxiosRequestConfig): Promise<BoardMaster> {
 return this.get<BoardMaster>(`/${id}`, config);
 }

 /** 寃뚯떆???깅줉 */
 async createBoardMaster(data: Partial<BoardMaster>, config?: AxiosRequestConfig): Promise<string> {
 return this.post('', data, config);
 }

 /** 寃뚯떆???섏젙 */
 async updateBoardMaster(id: string, data: Partial<BoardMaster>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** 寃뚯떆????젣 */
 async deleteBoardMaster(id: string, userId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, { ...config, params: { userId } });
 }
}

export const boardAdminService = new BoardAdminService();
