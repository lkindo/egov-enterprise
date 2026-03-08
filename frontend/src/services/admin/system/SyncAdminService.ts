import { ApiService } from '@/services/core/ApiService';

export interface SyncServer {
    serverId: string;
    serverNm: string;
    serverIp: string;
    serverPort: number;
    targetDrctry: string;
    syncDt: string;
    syncAt: 'Y' | 'N';
}

class SyncAdminService extends ApiService {
    constructor() {
        super('/admin/system/sync-servers');
    }

    async getSyncServers(config?: any): Promise<SyncServer[]> {
        return this.get<SyncServer[]>('', config);
    }

    async executeSync(id: string, config?: any): Promise<void> {
        return this.post(`/${id}/execute`, {}, config);
    }

    async createSyncServer(data: Omit<SyncServer, 'serverId'>, config?: any): Promise<void> {
        return this.post('', data, config);
    }

    async updateSyncServer(id: string, data: Partial<SyncServer>, config?: any): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    async deleteSyncServer(id: string, config?: any): Promise<void> {
        return this.delete(`/${id}`, config);
    }
}

export const syncAdminService = new SyncAdminService();
