import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
    BoardMasterBatchStatusRequestSchema,
    BoardPostPeriodBatchRequestSchema,
    BoardPostPinBatchRequestSchema,
} from '@/types/generated-zod';
import {
    createBoardMasterOperation,
    deleteBoardMasterPhysicallyOperation,
    getBoardChangeHistoryOperation,
    getBoardMasterListOperation,
    getBoardMasterOperation,
    isBoardMasterDeletableOperation,
    updateBoardMasterOperation,
    updateBoardMasterStatusInBatchOperation,
    updatePostPeriodOperation,
    updatePostPeriodsInBatchOperation,
    updatePostPinOperation,
    updatePostPinsInBatchOperation,
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
/** 운영 화면 빠른 편집의 게시 기간 변경(ADR-0040 결정 3·10). 목록에서 읽은 게시글 version 이 필수다. */
export type BoardPostPeriodRequest = components['schemas']['BoardPostPeriodRequest'];
/** 운영 화면의 게시 종료일 일괄 처리. END_DATE 는 새 종료일로 바꾸고 CLEAR_END 는 종료일을 비운다(대상 1~100건). */
export type BoardPostPeriodBatchRequest = components['schemas']['BoardPostPeriodBatchRequest'];
/** 운영 화면의 상단 고정·해제 한 건(ADR-0040 결정 5). 고정 종료일을 비우면 서버가 오늘부터 게시판의 고정 기본 일수 뒤로 정한다. */
export type BoardPostPinRequest = components['schemas']['BoardPostPinRequest'];
/** 운영 화면의 상단 고정·해제 일괄 처리(대상 1~100건). 하나라도 맞지 않으면 서버가 전체를 적용하지 않는다. */
export type BoardPostPinBatchRequest = components['schemas']['BoardPostPinBatchRequest'];

// 현재 Zod generator는 OpenAPI array의 minItems/maxItems를 코드에 반영하지 않는다.
// generated object/element 계약은 유지하고, 서버 @Size(1..100)만 서비스 경계에서 정확히 보강한다.
const BoardMasterBatchStatusBoundarySchema = BoardMasterBatchStatusRequestSchema.extend({
    bbsIds: BoardMasterBatchStatusRequestSchema.shape.bbsIds.min(1).max(100),
});
// [2026-10-23 ADR-0040 결정 10] 게시 종료일 일괄 처리도 같은 서버 경계(@Size(1..100))를 서비스 경계에서 확인한다 — 0건·101건은
//   요청을 보내지 않는다.
const BoardPostPeriodBatchBoundarySchema = BoardPostPeriodBatchRequestSchema.extend({
    pstSns: BoardPostPeriodBatchRequestSchema.shape.pstSns.min(1).max(100),
});
// [2026-10-23 ADR-0040 결정 5] 상단 고정 일괄 처리도 같은 서버 경계(@Size(max=100), @NotEmpty)를 서비스 경계에서 확인한다.
const BoardPostPinBatchBoundarySchema = BoardPostPinBatchRequestSchema.extend({
    pstSns: BoardPostPinBatchRequestSchema.shape.pstSns.min(1).max(100),
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

    /**
     * 운영 화면의 게시 기간 변경(빠른 편집, ADR-0040 결정 3·10). 게시글 전체 수정 권한(지정 게시판이면 그 편집 권한도)이 필요하다.
     * 읽은 version 과 다르면 409, 예약을 받지 않는 게시판의 미래 시작일·오늘보다 이른 종료일·뒤바뀐 기간은 400 이다. 보내지 않은
     * 날짜는 서버가 지금 값을 유지한다 — 종료일 해제는 일괄 처리(CLEAR_END)만 한다.
     */
    async updatePostPeriod(bbsId: string, pstSn: number, request: BoardPostPeriodRequest,
        config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updatePostPeriodOperation, {
            path: { bbsId, pstSn },
            body: request,
            config,
        });
    }

    /**
     * 운영 화면의 게시 종료일 일괄 처리(ADR-0040 결정 10). 서버가 모든 대상을 다시 판정해 하나라도 어긋나면 아무것도 바꾸지 않는다
     * (사유를 그대로 돌려준다). 대상별 버전은 받지 않는다.
     */
    async updatePostPeriodsInBatch(bbsId: string, request: BoardPostPeriodBatchRequest,
        config?: AxiosRequestConfig): Promise<void> {
        const body = BoardPostPeriodBatchBoundarySchema.parse(request);
        return this.executeGenerated(updatePostPeriodsInBatchOperation, {
            path: { bbsId },
            body,
            config,
        });
    }

    /**
     * 운영 화면의 상단 고정·해제 한 건(ADR-0040 결정 5). 게시글 상단 고정 권한(BOARD_PIN, 지정 게시판이면 그 편집 권한도)이 필요하다.
     * 고정은 게시판이 고정을 받을 때만, 상한 안에서만 된다(400). 해제는 설정과 상관없이 되고 종료일을 보내지 않는다. 게시글 버전을
     * 올리지 않으므로 버전을 보내지 않는다.
     */
    async updatePostPin(bbsId: string, pstSn: number, request: BoardPostPinRequest,
        config?: AxiosRequestConfig): Promise<void> {
        return this.executeGenerated(updatePostPinOperation, {
            path: { bbsId, pstSn },
            body: request,
            config,
        });
    }

    /**
     * 운영 화면의 상단 고정·해제 일괄 처리(ADR-0040 결정 5·10). 서버가 마스터를 잠그고 모든 대상을 다시 판정해 하나라도 어긋나면
     * (상한 초과·답글·다른 게시판 글) 아무것도 바꾸지 않는다.
     */
    async updatePostPinsInBatch(bbsId: string, request: BoardPostPinBatchRequest,
        config?: AxiosRequestConfig): Promise<void> {
        const body = BoardPostPinBatchBoundarySchema.parse(request);
        return this.executeGenerated(updatePostPinsInBatchOperation, {
            path: { bbsId },
            body,
            config,
        });
    }
}

export const boardAdminService = new BoardAdminService();
