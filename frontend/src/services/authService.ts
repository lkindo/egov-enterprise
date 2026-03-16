import client from '@/lib/api/client';

/**
 * ?紐꾩쵄 獄?亦낅슦釉???뺥돩?? */

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
        return client.post<LoginResponse>(`${BASE_URL}/login`, loginData);
    },

    /** 로그아웃 */
    logout: async (): Promise<void> => {
        return client.post<void>(`${BASE_URL}/logout`);
    },

    /** 토큰 재발행 */
    reissue: async (): Promise<{ accessToken: string }> => {
        return client.post<{ accessToken: string }>(`${BASE_URL}/reissue`);
    },

    /** 현재 사용자 정보 조회 */
    getCurrentUser: async (): Promise<UserInfo> => {
        return client.get<UserInfo>(`${BASE_URL}/me`);
    },
};
