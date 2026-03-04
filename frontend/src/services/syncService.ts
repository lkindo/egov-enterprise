import client from '@/lib/api/client';
import { SearchParams, PaginationResponse } from '@/types/system';

/**
 * 서버 동기화 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.system.SynchrnServerController
 */
export interface SyncServer {
    serverId: string;
    serverNm: string;
    serverIp: string;
    serverPort: string;
    targetDrctry: string;
    syncAt: "Y" | "N";
}

const BASE_URL = '/admin/system/sync-servers';

export const syncService = {
    /** 동기화 서버 목록 조회 */
    getSyncServers: async (params?: SearchParams & { serverNm?: string }) => {
        return client.get<PaginationResponse<SyncServer>>(BASE_URL, { params });
    },

    /** 동기화 서버 상세 조회 */
    getSyncServer: async (serverId: string) => {
        return client.get<SyncServer>(`${BASE_URL}/${serverId}`);
    },

    /** 동기화 서버 등록 */
    createSyncServer: async (data: Partial<SyncServer>) => {
        return client.post<string>(BASE_URL, data);
    },

    /** 동기화 서버 수정 */
    updateSyncServer: async (serverId: string, data: Partial<SyncServer>) => {
        return client.put<void>(`${BASE_URL}/${serverId}`, data);
    },

    /** 동기화 서버 삭제 */
    deleteSyncServer: async (serverId: string) => {
        return client.delete<void>(`${BASE_URL}/${serverId}`);
    },

    /** FTP 파일 목록 조회 */
    getFtpFiles: async (serverId: string) => {
        return client.get<string[]>(`${BASE_URL}/${serverId}/files`);
    },
};