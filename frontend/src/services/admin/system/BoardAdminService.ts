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
 * 게시판 마스터 관리 서비스 (Admin)
 */
class BoardAdminService extends AdminService {
 constructor() {
 super('/boards');
 }

 /** 게시판 목록 조회 */
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

 /** 게시판 상세 조회 */
 async getBoardMaster(id: string, config?: AxiosRequestConfig): Promise<BoardMaster> {
 return this.get<BoardMaster>(`/${id}`, config);
 }

 /** 게시판 등록 */
 async createBoardMaster(data: Partial<BoardMaster>, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** 게시판 수정 */
 async updateBoardMaster(id: string, data: Partial<BoardMaster>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** 게시판 삭제 */
 async deleteBoardMaster(id: string, userId: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, { ...config, params: { userId } });
 }
}

export const boardAdminService = new BoardAdminService();
