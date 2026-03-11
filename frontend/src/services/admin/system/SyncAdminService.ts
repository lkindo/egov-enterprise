import client from '@/lib/api/client';

/**
 * 전송/동기화 서버 관리 서비스 (Admin)
 */
export interface SyncServer {
    serverId: string;
    serverNm: string;
    serverIp: string;
    serverPort: number;
    targetDrctry: string;
}

const BASE_URL = '/admin/system/sync';

export const syncAdminService = {
    /** 동기화 서버 목록 조회 */
    getSyncServers: async (config?: any) => {
        return client.get<SyncServer[]>(BASE_URL, config);
    },

    /** 동기화 서버 등록 */
    createSyncServer: async (data: SyncServer, config?: any) => {
        return client.post(BASE_URL, data, config);
    },

    /** 동기화 서버 수정 */
    updateSyncServer: async (id: string, data: Partial<SyncServer>, config?: any) => {
        return client.put(`${BASE_URL}/${id}`, data, config);
    },

    /** 동기화 서버 삭제 */
    deleteSyncServer: async (id: string, config?: any) => {
        return client.delete(`${BASE_URL}/${id}`, config);
    },

    /** 동기화 실행 */
    executeSync: async (id: string, config?: any) => {
        return client.post(`${BASE_URL}/${id}/execute`, {}, config);
    }
};
