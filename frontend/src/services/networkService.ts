import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * 네트워크 관리 및 모니터링 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.system.NtwrkController
 */
export interface NetworkInfo {
    ntwrkId: string;
    manageIem: string;
    ntwrkIp: string;
    userNm: string;
    subnet: string;
    gtwy: string;
    domnServer: string;
    useAt: "Y" | "N";
}

export interface NetworkStatusDetailed {
    sysNm: string;
    sysIp: string;
    sysPort: string;
    svcSttus: string;
    logDt: string;
}

const BASE_URL = '/admin/system/networks';

export const networkService = {
    /** 네트워크 목록 조회 */
    getNetworks: async (params?: SearchParams) => {
        return client.get<PaginationResponse<NetworkInfo>>(BASE_URL, { params });
    },

    /** 네트워크 상세 조회 */
    getNetwork: async (ntwrkId: string) => {
        return client.get<NetworkInfo>(`${BASE_URL}/${ntwrkId}`);
    },

    /** 네트워크 등록 */
    createNetwork: async (data: Partial<NetworkInfo>) => {
        return client.post<string>(BASE_URL, data);
    },

    /** 네트워크 수정 */
    updateNetwork: async (ntwrkId: string, data: Partial<NetworkInfo>) => {
        return client.put<void>(`${BASE_URL}/${ntwrkId}`, data);
    },

    /** 네트워크 삭제 */
    deleteNetwork: async (ntwrkId: string) => {
        return client.delete<void>(`${BASE_URL}/${ntwrkId}`);
    },

    /** (모니터링) 네트워크 서비스 상태 조회 - 별도 컨트롤러 필요할 수 있으나 현재 구조 유지 */
    getStatus: async (params?: SearchParams) => {
        return client.get<PaginationResponse<NetworkStatusDetailed>>('/admin/system/ntwrksvc-monitoring', { params });
    },

    /** 네트워크 로그 조회 (Alias) */
    getNetworkLogs: async (params?: SearchParams) => {
        return client.get<PaginationResponse<NetworkStatusDetailed>>('/admin/system/ntwrksvc-monitoring', { params });
    },
};
