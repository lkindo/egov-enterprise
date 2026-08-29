import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
    ApiResponseBooleanSchema,
    ApiResponseLongSchema,
    ApiResponseStringSchema,
    BoardMasterBatchDeleteRequestSchema,
    BoardMasterBatchStatusRequestSchema,
    BoardMasterDtoSchema,
    BoardSaveRequestSchema,
    PageResponseBoardMasterDtoSchema,
} from '@/types/generated-zod';
import { z } from 'zod';

export type BoardMaster = components['schemas']['BoardMasterDto'];
export type BoardMasterListParams = NonNullable<
    operations['getBoardMasterList']['parameters']['query']
>;
export type BoardArticleCreateRequest = components['schemas']['BoardSaveRequest'];

// 물리 레거시 행은 atch_psblty_file_sz가 nullable이므로 상세 응답 adapter에서만 optional로 받는다.
// 쓰기 요청은 아래 BoardMasterDtoSchema를 그대로 사용해 required 계약을 유지한다.
const BoardMasterDetailSchema = BoardMasterDtoSchema.extend({
    atchPsbltyFileSz: BoardMasterDtoSchema.shape.atchPsbltyFileSz.optional(),
});
export type BoardMasterDetail = z.infer<typeof BoardMasterDetailSchema>;

/** 목록 API는 전체 BoardMasterDto가 아니라 이 projection만 채운다. */
const BoardMasterSummarySchema = BoardMasterDtoSchema.pick({
    bbsId: true,
    bbsTtl: true,
    bbsTypeCd: true,
    bbsTypeCdNm: true,
    bbsAtrbCd: true,
    bbsAtrbCdNm: true,
    tmpltId: true,
    useYn: true,
    crtDt: true,
}).extend({
    bbsId: BoardMasterDtoSchema.shape.bbsId.unwrap(),
});

export type BoardMasterSummary = z.infer<typeof BoardMasterSummarySchema>;

const BoardMasterSummaryPageSchema = PageResponseBoardMasterDtoSchema.omit({ list: true }).extend({
    list: z.array(z.preprocess(omitNullProperties, BoardMasterSummarySchema)).optional(),
});

// 현재 Zod generator는 OpenAPI array의 minItems/maxItems를 코드에 반영하지 않는다.
// generated object/element 계약은 유지하고, 서버 @Size(1..100)만 서비스 경계에서 정확히 보강한다.
const BoardMasterBatchStatusBoundarySchema = BoardMasterBatchStatusRequestSchema.extend({
    bbsIds: BoardMasterBatchStatusRequestSchema.shape.bbsIds.min(1).max(100),
});
const BoardMasterBatchDeleteBoundarySchema = BoardMasterBatchDeleteRequestSchema.extend({
    bbsIds: BoardMasterBatchDeleteRequestSchema.shape.bbsIds.min(1).max(100),
});

/**
 * Java DTO의 optional 필드는 OpenAPI상 optional이지만 Jackson은 DB null을 JSON null로 직렬화한다.
 * generated schema를 완화하지 않고, 서비스 adapter에서 null 속성만 생략 형태로 정규화한다.
 */
function omitNullProperties(value: unknown): unknown {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
    return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== null));
}

/**
 * 게시판 마스터 관리 서비스 (Admin)
 */

class BoardAdminService extends AdminService {
    constructor() {
        super('/board-masters');
    }

    /** 게시판 목록 조회 */
    async getBoardMasterList(params: BoardMasterListParams = {}, config?: AxiosRequestConfig): Promise<PageResponse<BoardMasterSummary>> {
        // generated BaseSearchDto가 이미 pageIndex/pageUnit을 소유하므로 legacy page/size 변환을 우회한다.
        const response = await this.client.get<unknown>(this.basePath, {
            ...config,
            params: { ...params },
        });
        const parsed = BoardMasterSummaryPageSchema.parse(response);
        return {
            list: parsed.list ?? [],
            total: parsed.total ?? 0,
            page: parsed.page ?? 1,
            size: parsed.size ?? params.pageUnit ?? params.pageSize ?? 10,
            totalPage: parsed.totalPage ?? 1,
        };
    }

    /** 게시판 상세 조회 */
    async getBoardMaster(id: string, config?: AxiosRequestConfig): Promise<BoardMasterDetail> {
        const response = await this.get<unknown>(`/${id}`, config);
        return BoardMasterDetailSchema.parse(omitNullProperties(response));
    }

    /** 게시판 등록 */
    async createBoardMaster(data: BoardMaster, config?: AxiosRequestConfig): Promise<string> {
        const request = BoardMasterDtoSchema.parse(data);
        const response = await this.post<unknown>('', request, config);
        const bbsId = ApiResponseStringSchema.shape.data.parse(response);
        if (bbsId === undefined) throw new Error('게시판 식별자가 응답에 없습니다.');
        return bbsId;
    }

    /** 게시판 수정 */
    async updateBoardMaster(id: string, data: BoardMaster, config?: AxiosRequestConfig): Promise<void> {
        const request = BoardMasterDtoSchema.parse(data);
        return this.put(`/${id}`, request, config);
    }


    /** 게시판 삭제 */
    async deleteBoardMaster(id: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${id}`, config);
    }

    /** 게시판 물리삭제 가능 여부 확인 */
    async isBoardMasterDeletable(id: string, config?: AxiosRequestConfig): Promise<boolean> {
        const response = await this.get<unknown>(`/${id}/deletable`, config);
        const deletable = ApiResponseBooleanSchema.shape.data.parse(response);
        if (deletable === undefined) throw new Error('게시판 삭제 가능 여부가 응답에 없습니다.');
        return deletable;
    }

    /** 게시판 영구 물리삭제 */
    async deleteBoardMasterPhysically(id: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${id}/physical`, config);
    }

    /** 게시판 일괄 상태 제어 */
    async batchUpdateBoardMasterStatus(bbsIds: string[], useYn: 'Y' | 'N', config?: AxiosRequestConfig): Promise<void> {
        const request = BoardMasterBatchStatusBoundarySchema.parse({ bbsIds, useYn });
        return this.post('/batch/status', request, config);
    }

    /** 게시판 일괄 영구 물리삭제 */
    async batchDeleteBoardMastersPhysically(bbsIds: string[], config?: AxiosRequestConfig): Promise<void> {
        const request = BoardMasterBatchDeleteBoundarySchema.parse({ bbsIds });
        return this.post('/batch/delete', request, config);
    }

    /** 게시글 등록 (Article) */
    async createBoardArticle(data: BoardArticleCreateRequest, config?: AxiosRequestConfig): Promise<number> {
        // 백엔드 BbsApiController.createBoard는 @RequestMapping("/api/v1/bbs") 아래 @PostMapping("/{bbsId}")를 가짐
        // multipart/form-data 형식으로 전송 필요
        const request = BoardSaveRequestSchema.parse(data);
        const formData = new FormData();

        // 'board' 파트 추가 (JSON 데이터를 Blob으로 감싸서 Content-Type 지정)
        const boardBlob = new Blob([JSON.stringify(request)], { type: 'application/json' });
        formData.append('board', boardBlob);

        // bbsId를 경로 파라미터로 사용 (/api/v1/bbs/{bbsId})
        const response = await this.client.post<unknown>(`/bbs/${request.bbsId}`, formData, {
            ...config,
            headers: {
                ...config?.headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        const pstSn = ApiResponseLongSchema.shape.data.parse(response);
        if (pstSn === undefined) throw new Error('게시글 식별자가 응답에 없습니다.');
        return pstSn;
    }
}

export const boardAdminService = new BoardAdminService();
