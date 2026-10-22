import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import { BoardMasterBatchStatusRequestSchema } from '@/types/generated-zod';
import {
    createBoardMasterOperation,
    deleteBoardMasterPhysicallyOperation,
    getBoardChangeHistoryOperation,
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

export type BoardMasterDetail = components['schemas']['BoardMasterDetailResponse'];
export type BoardMasterSummary = components['schemas']['BoardMasterSummaryResponse'];
/** 설정 수정 요청(ADR-0040 결정 10). 템플릿·유형·속성·커뮤니티 귀속은 받지 않고, 상세에서 받은 version 이 필수다. */
export type BoardMasterUpdateRequest = components['schemas']['BoardMasterUpdateRequest'];
/** 게시판 변경 이력 한 건(ADR-0040 결정 9). */
export type BoardChange = components['schemas']['BoardChangeDto'];
/** 설정이 지정한 용도(공지·FAQ·업무). 서버가 nuri.boards.* 로 계산한다. */
export type BoardDesignation = BoardMasterSummary['designations'][number];

// 현재 Zod generator는 OpenAPI array의 minItems/maxItems를 코드에 반영하지 않는다.
// generated object/element 계약은 유지하고, 서버 @Size(1..100)만 서비스 경계에서 정확히 보강한다.
const BoardMasterBatchStatusBoundarySchema = BoardMasterBatchStatusRequestSchema.extend({
    bbsIds: BoardMasterBatchStatusRequestSchema.shape.bbsIds.min(1).max(100),
});

/*
  [2026-10-23 ADR-0040 §5.2] 단건 비활성화(deleteBoardMaster)와 일괄 영구 삭제(batchDeleteBoardMastersPhysically)를 걷었다.
  목록은 단건 비활성화를 일괄 사용 상태 바꾸기로 흡수했고, 영구 삭제는 목록 툴바가 아니라 운영 화면 설정 탭의 한 건 절차다.
  서버 경로는 남는다(사용 여부 이력·버전 증가가 같은 단건 경로) — 원장은 대체된 표면으로 적는다(operation-consumer-census).
*/

/**
 * 게시판 마스터 관리 서비스 (Admin)
 */

class BoardAdminService extends ApiService {
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
            size: response.size ?? params.size ?? 10,
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

    /** 게시판 설정 수정. 읽은 버전과 다르면 409 다(ADR-0040 결정 10). */
    async updateBoardMaster(id: string, data: BoardMasterUpdateRequest, config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updateBoardMasterOperation, {
            path: { bbsId: id },
            body: data,
            config,
        });
    }

    /** 게시판 변경 이력(최신순). 게시글 행은 게시물 조회 대행 권한이 있을 때만 서버가 싣는다. */
    async getBoardChangeHistory(bbsId: string, params: { page?: number; size?: number } = {},
        config?: AxiosRequestConfig): Promise<PageResponse<BoardChange>> {
        const response = await this.executeGenerated(getBoardChangeHistoryOperation, {
            path: { bbsId },
            query: params,
            config,
        });
        return {
            list: response.list ?? [],
            total: response.total ?? 0,
            page: response.page ?? 1,
            size: response.size ?? params.size ?? 20,
            totalPage: response.totalPage ?? 1,
        };
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
}

export const boardAdminService = new BoardAdminService();
