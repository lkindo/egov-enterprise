import { AdminService } from '@/services/core/ApiService';
import { SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

/**
 * 네트워크 인프라 관리 서비스 (Admin)
 */
export interface Network {
 ntwrkId: string;
 manageIem: string;
 ntwrkIp: string;
 gtwy: string;
 subnet: string;
 domnServer: string;
 userNm: string;
 useAt: string;
}

class NetworkAdminService extends AdminService {
 constructor() {
 super('/network');
 }

 /** 네트워크 목록 조회 */
 async getNetworks(params?: SearchParams, config?: AxiosRequestConfig): Promise<Network[]> {
 return this.get<Network[]>('', { ...config, params });
 }

 /** 네트워크 등록 */
 async createNetwork(data: Network, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** 네트워크 수정 */
 async updateNetwork(id: string, data: Partial<Network>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** 네트워크 삭제 */
 async deleteNetwork(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }
}

export const networkAdminService = new NetworkAdminService();
