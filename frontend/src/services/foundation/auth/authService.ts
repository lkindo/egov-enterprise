import client from '@/lib/api/client';

/**
 * ?筌뤾쑴理님?雅?굝님뇡님?類λ룴님 */

export interface LoginResponse {
 accessToken: string;
 role: string;
}

export interface UserInfo {
 id: string;
 name: string;
 role?: string;
 userSe?: string;
}

const BASE_URL = 'auth';

export const authService = {
 /** 濡쒓렇님*/
 login: async (loginData: Record<string, string>): Promise<LoginResponse> => {
 return client.post<LoginResponse>(`${BASE_URL}/login`, loginData);
 },

 /** 濡쒓렇?꾩썐 */
 logout: async (): Promise<void> => {
 return client.post<void>(`${BASE_URL}/logout`);
 },

 /** ?좏겙 ?щ컻님*/
 reissue: async (): Promise<{ accessToken: string }> => {
 return client.post<{ accessToken: string }>(`${BASE_URL}/reissue`);
 },

 /** 현재 ?ъ슜님?뺣낫 조회 */
 getCurrentUser: async (): Promise<UserInfo> => {
 return client.get<UserInfo>(`${BASE_URL}/me`);
 },
};
