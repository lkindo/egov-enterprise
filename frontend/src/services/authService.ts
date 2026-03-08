import client from '@/lib/api/client';

/**
 * 인증 및 권한 서비스
 */

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
    /** 로그인 */
    login: async (loginData: Record<string, string>): Promise<LoginResponse> => {
        const response = await client.post<any>(`${BASE_URL}/login`, loginData);
        return response?.result || response;
    },

    /** 로그아웃 */
    logout: async (): Promise<void> => {
        const response = await client.post<any>(`${BASE_URL}/logout`);
        return response?.result;
    },

    /** 토큰 재발급 */
    reissue: async (): Promise<{ accessToken: string }> => {
        const response = await client.post<any>(`${BASE_URL}/reissue`);
        return response?.result;
    },

    /** 현재 사용자 정보 조회 */
    getCurrentUser: async (): Promise<UserInfo> => {
        const response = await client.get<any>(`${BASE_URL}/me`);
        return response?.result;
    },
};
