import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * 서버 정보 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.system.ServerController
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
    /** 서버 목록 조회 */
    getServers: async (params?: SearchParams & { serverNm?: string }) => {
        return client.get<PaginationResponse<ServerDetail>>(BASE_URL, { params });
    },

    /** 서버 상세 조회 */
    getServer: async (serverId: string) => {
        return client.get<ServerDetail>(`${BASE_URL}/${serverId}`);
    },

    /** 서버 등록 */
    createServer: async (data: Partial<ServerDetail>) => {
        return client.post<string>(BASE_URL, data);
    },

    /** 서버 수정 */
    updateServer: async (serverId: string, data: Partial<ServerDetail>) => {
        return client.put<void>(`${BASE_URL}/${serverId}`, data);
    },

    /** 서버 삭제 */
    deleteServer: async (serverId: string) => {
        return client.delete<void>(`${BASE_URL}/${serverId}`);
    },
};
