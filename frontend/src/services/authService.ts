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
    /** 嚥≪뮄???*/
    login: async (loginData: Record<string, string>): Promise<LoginResponse> => {
        const response = await client.post<any>(`${BASE_URL}/login`, loginData);
        return response?.result || response;
    },

    /** 嚥≪뮄??袁⑹뜍 */
    logout: async (): Promise<void> => {
        const response = await client.post<any>(`${BASE_URL}/logout`);
        return response?.result || response;
    },

    /** ?醫뤾쿃 ??而삥묾?*/
    reissue: async (): Promise<{ accessToken: string }> => {
        const response = await client.post<any>(`${BASE_URL}/reissue`);
        return response?.result || response;
    },

    /** ?袁⑹삺 ??????類ｋ궖 鈺곌퀬??*/
    getCurrentUser: async (): Promise<UserInfo> => {
        const response = await client.get<any>(`${BASE_URL}/me`);
        return response?.result || response;
    },
};
