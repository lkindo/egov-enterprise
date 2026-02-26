import client from '@/lib/api/client';

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

export const backupService = {
    getOperations: async (params: { page?: number; size?: number; keyword?: string; condition?: string }, config?: any): Promise<PageResult<BackupOpert>> =>
        client.get<PageResult<BackupOpert>>('/admin/system/backups/operations', { ...config, params }),

    getOperation: async (id: string, config?: any): Promise<BackupOpert> =>
        client.get<BackupOpert>(`/admin/system/backups/operations/${id}`, config),

    createOperation: async (data: Partial<BackupOpert>, config?: any): Promise<void> =>
        client.post('/admin/system/backups/operations', data, config),

    updateOperation: async (id: string, data: Partial<BackupOpert>, config?: any): Promise<void> =>
        client.put(`/admin/system/backups/operations/${id}`, data, config),

    deleteOperation: async (id: string, config?: any): Promise<void> =>
        client.delete(`/admin/system/backups/operations/${id}`, config),

    getResults: async (params: { page?: number; size?: number; sttus?: string; keyword?: string; condition?: string }, config?: any): Promise<PageResult<BackupResult>> =>
        client.get<PageResult<BackupResult>>('/admin/system/backups/results', { ...config, params }),
};
