import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface BoardMaster {
    bbsId: string;
    bbsNm: string;
    bbsIntrcn: string;
    bbsTyCode: string;
    bbsAttrbCode: string;
    replyPosblAt: string;
    fileAtchPosblAt: string;
    atchPosblFileNumber: number;
    atchPosblFileSize: number;
    tmplatId: string;
    useAt: string;
    cmmntyId?: string;
    frstRegisterId?: string;
    stsfdgAt?: string;
    commentAt?: string;
    blogAt?: string;
    tmplatNm: string;
    frstRegisterNm: string;
    frstRegistPnttm: string;
    bbsTyCodeNm?: string;
}

/**
 * 寃뚯떆님留덉뒪님관리님쒕퉬님(Admin)
 */
class BoardAdminService extends AdminService {
    constructor() {
        super('/board-masters');
    }

    /** 寃뚯떆님紐⑸줉 조회 */
    async getBoardMasterList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<BoardMaster>> {
        return this.get<PageResponse<BoardMaster>>('', {
            ...config,
            params: {
                searchCnd: params?.searchCondition || '0',
                searchWrd: params?.searchKeyword || params?.searchWrd || '',
            },
        });
    }

    /** 寃뚯떆님상세 조회 */
    async getBoardMaster(id: string, config?: AxiosRequestConfig): Promise<BoardMaster> {
        return this.get<BoardMaster>(`/${id}`, config);
    }

    /** 寃뚯떆님등록 */
    async createBoardMaster(data: Partial<BoardMaster>, config?: AxiosRequestConfig): Promise<string> {
        return this.post('', data, config);
    }

    /** 寃뚯떆님?섏젙 */
    async updateBoardMaster(id: string, data: Partial<BoardMaster>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    /** 寃뚯떆님님젣 */
    async deleteBoardMaster(id: string, userId: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${id}`, { ...config, params: { userId } });
    }
}

export const boardAdminService = new BoardAdminService();
