import { AdminService } from '@/services/core/ApiService';

export interface BackupOpert {
    backupOpertId: string;
    backupOpertNm: string;
    backupOrginlDrctry: string;
    backupStreDrctry: string;
    cmprsSe: string;
    cmprsSeNm?: string;
    executCycle: string;
    executCycleNm?: string;
    executSchdulDe?: string;
    executSchdulHour: string;
    executSchdulMnt: string;
    executSchdulSecnd: string;
    executSchdulDfkSes?: string[];
    useAt: 'Y' | 'N';
}

export interface BackupResult {
    backupResultId: string;
    backupOpertId: string;
    backupOpertNm: string;
    backupOrginlDrctry: string;
    backupStreDrctry: string;
    sttus: string;
    sttusNm?: string;
    errorLog?: string;
    executBeginTime: string;
    executEndTime: string;
}

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

class BackupAdminService extends AdminService {
    constructor() {
        super('/system/backups');
    }

    async getOperations(params: { page?: number; size?: number; keyword?: string; condition?: string }, config?: any): Promise<PageResult<BackupOpert>> {
        return this.get<PageResult<BackupOpert>>('/operations', { ...config, params });
    }

    async getOperation(id: string, config?: any): Promise<BackupOpert> {
        return this.get<BackupOpert>(`/operations/${id}`, config);
    }

    async createOperation(data: Partial<BackupOpert>, config?: any): Promise<void> {
        return this.post('/operations', data, config);
    }

    async updateOperation(id: string, data: Partial<BackupOpert>, config?: any): Promise<void> {
        return this.put(`/operations/${id}`, data, config);
    }

    async deleteOperation(id: string, config?: any): Promise<void> {
        return this.delete(`/operations/${id}`, config);
    }

    async getResults(params: { page?: number; size?: number; sttus?: string; keyword?: string; condition?: string }, config?: any): Promise<PageResult<BackupResult>> {
        return this.get<PageResult<BackupResult>>('/results', { ...config, params });
    }
}

export const backupAdminService = new BackupAdminService();
