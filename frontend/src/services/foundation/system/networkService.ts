import client from '@/lib/api/client';
import { SearchParams, PageResponse } from '@/types/foundation/system';

/**
 * ㅽ듃?뚰겕 관리및 명⑤땲?곕쭅 ?쒕퉬님(Admin)
 * ?곌껐: com.company.project.api.controller.system.NtwrkController
 */
export interface NetworkInfo {
 ntwrkId: string;
 manageIem: string;
 ntwrkIp: string;
 userNm: string;
 subnet: string;
 gtwy: string;
 domnServer: string;
 useAt: "Y" | "N";
}

export interface NetworkStatusDetailed {
 sysNm: string;
 sysIp: string;
 sysPort: string;
 svcSttus: string;
 logDt: string;
}

const BASE_URL = '/admin/system/networks';

export const networkService = {
 /** ㅽ듃?뚰겕 목록 조회 */
 getNetworks: async (params?: SearchParams): Promise<PageResponse<NetworkInfo>> => {
 return client.get<PageResponse<NetworkInfo>>(BASE_URL, { params });
 },

 /** ㅽ듃?뚰겕 상세 조회 */
 getNetwork: async (ntwrkId: string): Promise<NetworkInfo> => {
 return client.get<NetworkInfo>(`${BASE_URL}/${ntwrkId}`);
 },

 /** ㅽ듃?뚰겕 湲곗큹 정보 등록 */
 createNetwork: async (data: Partial<NetworkInfo>): Promise<string> => {
 return client.post<string>(BASE_URL, data);
 },

 /** ㅽ듃?뚰겕 정보 수정 */
 updateNetwork: async (ntwrkId: string, data: Partial<NetworkInfo>): Promise<void> => {
 return client.put<void>(`${BASE_URL}/${ntwrkId}`, data);
 },

 /** ㅽ듃?뚰겕 정보 님젣 */
 deleteNetwork: async (ntwrkId: string): Promise<void> => {
 return client.delete<void>(`${BASE_URL}/${ntwrkId}`);
 },

 /** (명⑤땲?곕쭅) ㅽ듃?뚰겕 ?쒕퉬님?곹깭 목록 조회 */
 getStatus: async (params?: SearchParams): Promise<PageResponse<NetworkStatusDetailed>> => {
 return client.get<PageResponse<NetworkStatusDetailed>>('/admin/system/ntwrksvc-monitoring', { params });
 },

 /** ㅽ듃?뚰겕 로그 조회 (Alias) */
 getNetworkLogs: async (params?: SearchParams): Promise<PageResponse<NetworkStatusDetailed>> => {
 return client.get<PageResponse<NetworkStatusDetailed>>('/admin/system/ntwrksvc-monitoring', { params });
 },
};
