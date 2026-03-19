import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

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

class SyncAdminService extends AdminService {
 constructor() {
 super('/sync');
 }

 /** 동기화 서버 목록 조회 */
 async getSyncServers(config?: AxiosRequestConfig): Promise<SyncServer[]> {
 return this.get<SyncServer[]>('', config);
 }

 /** 동기화 서버 등록 */
 async createSyncServer(data: SyncServer, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** 동기화 서버 수정 */
 async updateSyncServer(id: string, data: Partial<SyncServer>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** 동기화 서버 삭제 */
 async deleteSyncServer(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }

 /** 동기화 실행 */
 async executeSync(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.post(`/${id}/execute`, {}, config);
 }
}

export const syncAdminService = new SyncAdminService();
