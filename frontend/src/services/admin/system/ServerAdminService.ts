import { AdminService } from '@/services/core/ApiService';

export interface ServerInfo {
    serverId: string;
    serverNm: string;
    serverKnd: string; // 1:WAS, 2:DB, 3:WEB
    serverKndNm?: string;
    regstYmd?: string;
    lastUpdusrPnttm?: string;
}

interface PageResult<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
}

class ServerAdminService extends AdminService {
    constructor() {
        super('/servers');
    }

    async getServers(params: { page?: number; size?: number; serverNm?: string }, config?: any): Promise<PageResult<ServerInfo>> {
        return this.get<PageResult<ServerInfo>>('/', { ...config, params });
    }

    async getServer(id: string, config?: any): Promise<ServerInfo> {
        return this.get<ServerInfo>(`/${id}`, config);
    }

    async createServer(data: Omit<ServerInfo, 'serverId'>, config?: any): Promise<void> {
        return this.post('/', data, config);
    }

    async updateServer(id: string, data: Partial<ServerInfo>, config?: any): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    async deleteServer(id: string, config?: any): Promise<void> {
        return this.delete(`/${id}`, config);
    }
}

export const serverAdminService = new ServerAdminService();