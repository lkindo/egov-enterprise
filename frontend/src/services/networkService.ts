import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * ??쎈뱜??곌쾿 ?온??獄?筌뤴뫀??怨뺤춦 ??뺥돩??(Admin)
 * 獄쏄퉮肉?? com.company.project.api.controller.system.NtwrkController
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
    /** ??쎈뱜??곌쾿 筌뤴뫖以?鈺곌퀬??*/
    getNetworks: async (params?: SearchParams) => {
        return client.get<PaginationResponse<NetworkInfo>>(BASE_URL, { params });
    },

    /** ??쎈뱜??곌쾿 ?怨멸쉭 鈺곌퀬??*/
    getNetwork: async (ntwrkId: string) => {
        return client.get<NetworkInfo>(`${BASE_URL}/${ntwrkId}`);
    },

    /** ??쎈뱜??곌쾿 ?源낆쨯 */
    createNetwork: async (data: Partial<NetworkInfo>) => {
        return client.post<string>(BASE_URL, data);
    },

    /** ??쎈뱜??곌쾿 ??륁젟 */
    updateNetwork: async (ntwrkId: string, data: Partial<NetworkInfo>) => {
        return client.put<void>(`${BASE_URL}/${ntwrkId}`, data);
    },

    /** ??쎈뱜??곌쾿 ????*/
    deleteNetwork: async (ntwrkId: string) => {
        return client.delete<void>(`${BASE_URL}/${ntwrkId}`);
    },

    /** (筌뤴뫀??怨뺤춦) ??쎈뱜??곌쾿 ??뺥돩???怨밴묶 鈺곌퀬??- 癰귢쑬猷??뚢뫂?껅에?살쑎 ?袁⑹뒄??????됱몵???袁⑹삺 ?닌듼??醫? */
    getStatus: async (params?: SearchParams) => {
        return client.get<PaginationResponse<NetworkStatusDetailed>>('/admin/system/ntwrksvc-monitoring', { params });
    },

    /** ??쎈뱜??곌쾿 嚥≪뮄??鈺곌퀬??(Alias) */
    getNetworkLogs: async (params?: SearchParams) => {
        return client.get<PaginationResponse<NetworkStatusDetailed>>('/admin/system/ntwrksvc-monitoring', { params });
    },
};
