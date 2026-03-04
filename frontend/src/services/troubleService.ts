import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * 장애 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.system.TroblController
 */
export interface Trouble {
    troblId: string;
    troblNm: string;
    troblKnd: string;
    troblRqesterNm: string;
    troblDc: string;
    processSttus: string;
    troblProcessResult: string;
    troblOpetrNm: string;
    occrrncDe: string;
}

const BASE_URL = '/admin/system/troubles';

export const troubleService = {
    /** 장애 목록 조회 */
    getTroubles: async (params?: SearchParams & { strTroblNm?: string; strTroblKnd?: string; strProcessSttus?: string }) => {
        return client.get<PaginationResponse<Trouble>>(BASE_URL, { params });
    },

    /** 장애 처리 목록 조회 */
    getTroubleProcesses: async (params?: SearchParams) => {
        return client.get<PaginationResponse<Trouble>>(`${BASE_URL}/processes`, { params });
    },

    /** 장애 상세 조회 */
    getTrouble: async (troblId: string) => {
        return client.get<Trouble>(`${BASE_URL}/${troblId}`);
    },

    /** 장애 등록 */
    createTrouble: async (data: Partial<Trouble>) => {
        return client.post<string>(BASE_URL, data);
    },

    /** 장애 정보 수정 */
    updateTrouble: async (troblId: string, data: Partial<Trouble>) => {
        return client.put<void>(`${BASE_URL}/${troblId}`, data);
    },

    /** 장애 처리 요청 */
    requestProcess: async (troblId: string) => {
        return client.patch<void>(`${BASE_URL}/${troblId}/request`);
    },

    /** 장애 처리 결과 등록 */
    processTrouble: async (troblId: string, data: Partial<Trouble>) => {
        return client.patch<void>(`${BASE_URL}/${troblId}/process`, data);
    },

    /** 장애 삭제 */
    deleteTrouble: async (troblId: string) => {
        return client.delete<void>(`${BASE_URL}/${troblId}`);
    },
};
