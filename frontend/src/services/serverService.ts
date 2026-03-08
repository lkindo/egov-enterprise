import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * ??뺤쒔 ?類ｋ궖 ?온????뺥돩??(Admin)
 * 獄쏄퉮肉?? com.company.project.api.controller.system.ServerController
 */
export interface ServerDetail {
    serverId: string;
    serverNm: string;
    serverKnd: string;
    serverIp: string;
    serverPort: string;
}

const BASE_URL = '/admin/system/servers';

export const serverService = {
    /** ??뺤쒔 筌뤴뫖以?鈺곌퀬??*/
    getServers: async (params?: SearchParams & { serverNm?: string }) => {
        return client.get<PaginationResponse<ServerDetail>>(BASE_URL, { params });
    },

    /** ??뺤쒔 ?怨멸쉭 鈺곌퀬??*/
    getServer: async (serverId: string) => {
        return client.get<ServerDetail>(`${BASE_URL}/${serverId}`);
    },

    /** ??뺤쒔 ?源낆쨯 */
    createServer: async (data: Partial<ServerDetail>) => {
        return client.post<string>(BASE_URL, data);
    },

    /** ??뺤쒔 ??륁젟 */
    updateServer: async (serverId: string, data: Partial<ServerDetail>) => {
        return client.put<void>(`${BASE_URL}/${serverId}`, data);
    },

    /** ??뺤쒔 ????*/
    deleteServer: async (serverId: string) => {
        return client.delete<void>(`${BASE_URL}/${serverId}`);
    },
};
