import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
    BoardMasterBatchDeleteRequestSchema,
    BoardMasterBatchStatusRequestSchema,
    BoardSaveRequestSchema,
} from '@/types/generated-zod';
import {
    createBbsPostOperation,
    createBoardMasterOperation,
    deleteBoardMasterOperation,
    deleteBoardMasterPhysicallyOperation,
    deleteBoardMastersInBatchOperation,
    getBoardMasterListOperation,
    getBoardMasterOperation,
    isBoardMasterDeletableOperation,
    updateBoardMasterOperation,
    updateBoardMasterStatusInBatchOperation,
} from '@/types/generated-operations';

export type BoardMaster = components['schemas']['BoardMasterDto'];
export type BoardMasterListParams = NonNullable<
    operations['getBoardMasterList']['parameters']['query']
>;
export type BoardArticleCreateRequest = components['schemas']['BoardSaveRequest'];

export type BoardMasterDetail = components['schemas']['BoardMasterDetailResponse'];
export type BoardMasterSummary = components['schemas']['BoardMasterSummaryResponse'];

// 현재 Zod generator는 OpenAPI array의 minItems/maxItems를 코드에 반영하지 않는다.
// generated object/element 계약은 유지하고, 서버 @Size(1..100)만 서비스 경계에서 정확히 보강한다.
const BoardMasterBatchStatusBoundarySchema = BoardMasterBatchStatusRequestSchema.extend({
    bbsIds: BoardMasterBatchStatusRequestSchema.shape.bbsIds.min(1).max(100),
});
const BoardMasterBatchDeleteBoundarySchema = BoardMasterBatchDeleteRequestSchema.extend({
    bbsIds: BoardMasterBatchDeleteRequestSchema.shape.bbsIds.min(1).max(100),
});

/**
 * 게시판 마스터 관리 서비스 (Admin)
 */

class BoardAdminService extends AdminService {
    constructor() {
        super('/board-masters');
    }

    /** 게시판 목록 조회 */
    async getBoardMasterList(params: BoardMasterListParams = {}, config?: AxiosRequestConfig): Promise<PageResponse<BoardMasterSummary>> {
        const response = await this.executeGenerated(getBoardMasterListOperation, {
            query: params,
            config,
        });
        return {
            list: response.list ?? [],
            total: response.total ?? 0,
            page: response.page ?? 1,
            size: response.size ?? params.pageUnit ?? params.pageSize ?? 10,
            totalPage: response.totalPage ?? 1,
        };
    }

    /** 게시판 상세 조회 */
    async getBoardMaster(id: string, config?: AxiosRequestConfig): Promise<BoardMasterDetail> {
        return this.executeGenerated(getBoardMasterOperation, {
            path: { bbsId: id },
            config,
        });
    }

    /** 게시판 등록 */
    async createBoardMaster(data: BoardMaster, config?: AxiosRequestConfig): Promise<string> {
        return this.executeGenerated(createBoardMasterOperation, {
            body: data,
            config,
        });
    }

    /** 게시판 수정 */
    async updateBoardMaster(id: string, data: BoardMaster, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updateBoardMasterOperation, {
            path: { bbsId: id },
            body: data,
            config,
        });
    }


    /** 게시판 삭제 */
    async deleteBoardMaster(id: string, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(deleteBoardMasterOperation, {
            path: { bbsId: id },
            config,
        });
    }

    /** 게시판 물리삭제 가능 여부 확인 */
    async isBoardMasterDeletable(id: string, config?: AxiosRequestConfig): Promise<boolean> {
        return this.executeGenerated(isBoardMasterDeletableOperation, {
            path: { bbsId: id },
            config,
        });
    }

    /** 게시판 영구 물리삭제 */
    async deleteBoardMasterPhysically(id: string, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(deleteBoardMasterPhysicallyOperation, {
            path: { bbsId: id },
            config,
        });
    }

    /** 게시판 일괄 상태 제어 */
    async batchUpdateBoardMasterStatus(bbsIds: string[], useYn: 'Y' | 'N', config?: AxiosRequestConfig): Promise<void> {
        const request = BoardMasterBatchStatusBoundarySchema.parse({ bbsIds, useYn });
        return this.executeGenerated(updateBoardMasterStatusInBatchOperation, {
            body: request,
            config,
        });
    }

    /** 게시판 일괄 영구 물리삭제 */
    async batchDeleteBoardMastersPhysically(bbsIds: string[], config?: AxiosRequestConfig): Promise<void> {
        const request = BoardMasterBatchDeleteBoundarySchema.parse({ bbsIds });
        return this.executeGenerated(deleteBoardMastersInBatchOperation, {
            body: request,
            config,
        });
    }

    /** 게시글 등록 (Article) */
    async createBoardArticle(data: BoardArticleCreateRequest, config?: AxiosRequestConfig): Promise<number> {
        const request = BoardSaveRequestSchema.parse(data);

        // bbsId를 경로 파라미터로 사용 (/api/v1/bbs/{bbsId})
        return this.executeGeneratedMultipart(createBbsPostOperation, {
            path: { bbsId: request.bbsId },
            body: { board: request },
            config,
        });
    }
}

export const boardAdminService = new BoardAdminService();
