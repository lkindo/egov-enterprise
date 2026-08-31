import { AdminService } from '@/services/core/ApiService';
import { SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
 createNetworkOperation,
 deleteNetworkOperation,
 getStatusOperation,
 updateNetworkOperation,
} from '@/types/generated-operations';

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
 useYn: 'Y' | 'N';
}

class NetworkAdminService extends AdminService {
 constructor() {
 super('/ntwrksvc-monitoring');
 }

 /** ㅽ듃?뚰겕 목록 조회 */
 async getNetworks(params?: SearchParams, config?: AxiosRequestConfig): Promise<Network[]> {
 const pageIndex = params?.pageIndex
 ?? params?.pageNo
 ?? (params?.page !== undefined ? params.page + 1 : undefined);
 const recordCountPerPage = typeof params?.recordCountPerPage === 'number'
 ? params.recordCountPerPage
 : undefined;
 const pageUnit = params?.pageUnit
 ?? recordCountPerPage
 ?? params?.size
 ?? (typeof params?.pageSize === 'number' ? params.pageSize : undefined);
 const generatedConfig = config ? { ...config } : undefined;
 if (generatedConfig) delete generatedConfig.params;
 return this.executeGenerated(getStatusOperation, {
 query: {
 ...(pageIndex !== undefined ? { pageIndex } : {}),
 ...(pageUnit !== undefined ? { pageUnit } : {}),
 ...(params?.searchCondition !== undefined ? { searchCondition: params.searchCondition } : {}),
 ...(params?.searchKeyword !== undefined || params?.searchWrd !== undefined
 ? { searchKeyword: params.searchKeyword ?? params.searchWrd }
 : {}),
 },
 config: generatedConfig,
 }) as unknown as Promise<Network[]>;
 }

 /** ㅽ듃?뚰겕 등록 */
 async createNetwork(data: Partial<Network>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(createNetworkOperation, {
 body: data as GeneratedOperationRequest<'createNetwork'>,
 config,
 });
 }

 /** ㅽ듃?뚰겕 수정 */
 async updateNetwork(id: string, data: Partial<Network>, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(updateNetworkOperation, {
 path: { id },
 body: data as GeneratedOperationRequest<'updateNetwork'>,
 config,
 });
 }

 /** ㅽ듃?뚰겕 님젣 */
 async deleteNetwork(id: string, config?: AxiosRequestConfig): Promise<void> {
 return this.executeGenerated(deleteNetworkOperation, {
 path: { id },
 config,
 });
 }
}

export const networkAdminService = new NetworkAdminService();
