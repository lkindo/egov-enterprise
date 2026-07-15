import client from '@/lib/api/client';

/**
 * 인증 서비스
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
 /** 로그인 (Next.js Route Handler를 통해 HttpOnly 쿠키 바인딩) */
 login: async (loginData: Record<string, string>): Promise<LoginResponse> => {
   // 동일 도메인 Next.js API Route Handler로 라우팅
   return client.post<LoginResponse>('/api/auth/login', loginData);
 },

 /** 로그아웃 (Next.js Route Handler를 통해 로컬/원격 세션 쿠키 해제) */
 logout: async (): Promise<void> => {
   return client.post<void>('/api/auth/logout');
 },

 /** 토큰 갱신 (Next.js Route Handler를 통해 HttpOnly 쿠키 재발행) */
 reissue: async (): Promise<{ accessToken: string }> => {
   return client.post<{ accessToken: string }>('/api/auth/reissue');
 },

 /** 현재 사용자정보 조회 (백엔드에 직접 쏘며, 미들웨어가 accessToken 쿠키를 낚아채 Bearer 헤더를 주입해 줌) */
 getCurrentUser: async (): Promise<UserInfo> => {
   return client.get<UserInfo>(`${BASE_URL}/me`);
 },
};
