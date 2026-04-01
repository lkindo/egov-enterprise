import { AdminService } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

/**
 * ?꾩넚/?숆린님?쒕쾭 愿由님쒕퉬님(Admin)
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

 /** ?숆린님?쒕쾭 紐⑸줉 조회 */
 async getSyncServers(config?: AxiosRequestConfig): Promise<SyncServer[]> {
 return this.get<SyncServer[]>('', config);
 }

 /** ?숆린님?쒕쾭 등록 */
 async createSyncServer(data: SyncServer, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** ?숆린님?쒕쾭 ?섏젙 */
 async updateSyncServer(id: string, data: Partial<SyncServer>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** ?숆린님?쒕쾭 님젣 */
 async deleteSyncServer(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }

 /** ?숆린님?ㅽ뻾 */
 async executeSync(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.post(`/${id}/execute`, {}, config);
 }
}

export const syncAdminService = new SyncAdminService();
