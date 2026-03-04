import client from '@/lib/api/client';

/**
 * 인증 및 권한 서비스
 * 백엔드: com.company.project.api.auth.AuthController
 */

export interface LoginResponse {
    accessToken: string;
    role: string;
}

export interface UserInfo {
    id: string;
    name: string;
    role?: string;
    userSe?: string; // 사용자 구분 추가 (USR, EMP 등)
}

const BASE_URL = '/auth';

export const authService = {
    /** 로그인 */
    login: async (loginData: Record<string, string>): Promise<LoginResponse> => {
        return client.post<LoginResponse>(`${BASE_URL}/login`, loginData);
    },

    /** 로그아웃 */
    logout: async (): Promise<void> => {
        return client.post<void>(`${BASE_URL}/logout`);
    },

    /** 토큰 재발급 (인터셉터에서 사용) */
    reissue: async (): Promise<{ accessToken: string }> => {
        return client.post<{ accessToken: string }>(`${BASE_URL}/reissue`);
    },

    /** 현재 사용자 정보 조회 */
    getCurrentUser: async (): Promise<UserInfo> => {
        return client.get<UserInfo>(`${BASE_URL}/me`);
    },
};