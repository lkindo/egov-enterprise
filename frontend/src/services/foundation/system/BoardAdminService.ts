import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import { BoardMasterDto } from '@/types/modernization';

export type BoardMaster = BoardMasterDto;

/**
 * 게시판 마스터 관리 서비스 (Admin)
 */

class BoardAdminService extends AdminService {
    constructor() {
        super('/board-masters');
    }

    /** 게시판 목록 조회 */
    async getBoardMasterList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<BoardMasterDto>> {
        return this.get<PageResponse<BoardMasterDto>>('', {
            ...config,
            params: {
                searchCnd: params?.searchCondition || '0',
                searchWrd: params?.searchKeyword || params?.searchWrd || '',
                ...params // 추가 파라미터 전달 (page, size 등)
            },
        });
    }

    /** 게시판 상세 조회 */
    async getBoardMaster(id: string, config?: AxiosRequestConfig): Promise<BoardMasterDto> {
        return this.get<BoardMasterDto>(`/${id}`, config);
    }

    /** 게시판 등록 */
    async createBoardMaster(data: Partial<BoardMasterDto>, config?: AxiosRequestConfig): Promise<string> {
        return this.post('', data, config);
    }

    /** 게시판 수정 */
    async updateBoardMaster(id: string, data: Partial<BoardMasterDto>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/${id}`, data, config);
    }


    /** 게시판 삭제 */
    async deleteBoardMaster(id: string, userId: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${id}`, { ...config, params: { userId } });
    }

    /** 게시판 물리삭제 가능 여부 확인 */
    async isBoardMasterDeletable(id: string, config?: AxiosRequestConfig): Promise<boolean> {
        return this.get<boolean>(`/${id}/deletable`, config);
    }

    /** 게시판 영구 물리삭제 */
    async deleteBoardMasterPhysically(id: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${id}/physical`, config);
    }

    /** 게시판 일괄 상태 제어 */
    async batchUpdateBoardMasterStatus(bbsIds: string[], useYn: 'Y' | 'N', config?: AxiosRequestConfig): Promise<void> {
        return this.post('/batch/status', { bbsIds, useYn }, config);
    }

    /** 게시판 일괄 영구 물리삭제 */
    async batchDeleteBoardMastersPhysically(bbsIds: string[], config?: AxiosRequestConfig): Promise<void> {
        return this.post('/batch/delete', { bbsIds }, config);
    }

    /** 게시글 등록 (Article) */
    async createBoardArticle(data: any, config?: AxiosRequestConfig): Promise<void> {
        // 백엔드 BbsApiController.createBoard는 @RequestMapping("/api/v1/bbs") 아래 @PostMapping("/{bbsId}")를 가짐
        // multipart/form-data 형식으로 전송 필요
        const formData = new FormData();

        // 'board' 파트 추가 (JSON 데이터를 Blob으로 감싸서 Content-Type 지정)
        const boardBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        formData.append('board', boardBlob);

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
