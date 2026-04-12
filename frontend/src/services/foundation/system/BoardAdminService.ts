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

    /** 게시글 등록 (Article) */
    async createBoardArticle(data: any, config?: AxiosRequestConfig): Promise<void> {
        // 백엔드 BbsApiController.createBoard는 @RequestPart("board")와 @RequestPart(value = "file", required = false)를 기대함
        // multipart/form-data 형식으로 전송 필요
        const formData = new FormData();
        
        // 'board' 파트 추가 (JSON 데이터를 Blob으로 감싸서 Content-Type 지정)
        const boardBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        formData.append('board', boardBlob);
        
        // 파일이 있을 경우 'file' 파트 추가 (현재 UI에는 파일 업로드 기능이 없으므로 생략 가능하나 규격상 대응)
        
        // bbsId를 경로 파라미터로 사용 (/api/v1/bbs/{bbsId})
        return this.client.post(`/bbs/${data.bbsId}`, formData, {
            ...config,
            headers: {
                ...config?.headers,
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}

export const boardAdminService = new BoardAdminService();
