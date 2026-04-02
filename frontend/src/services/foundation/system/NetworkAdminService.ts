import { AdminService } from '@/services/core/ApiService';
import { SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

/**
 * ㅽ듃?뚰겕 ?명봽님관리님쒕퉬님(Admin)
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

 /** ㅽ듃?뚰겕 紐⑸줉 조회 */
 async getNetworks(params?: SearchParams, config?: AxiosRequestConfig): Promise<Network[]> {
 return this.get<Network[]>('', { ...config, params });
 }

 /** ㅽ듃?뚰겕 등록 */
 async createNetwork(data: Network, config?: AxiosRequestConfig): Promise<void> {
 return this.post('', data, config);
 }

 /** ㅽ듃?뚰겕 ?섏젙 */
 async updateNetwork(id: string, data: Partial<Network>, config?: AxiosRequestConfig): Promise<void> {
 return this.put(`/${id}`, data, config);
 }

 /** ㅽ듃?뚰겕 님젣 */
 async deleteNetwork(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.delete(`/${id}`, config);
 }
}

export const networkAdminService = new NetworkAdminService();
