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

// Next.js Route Handler(/api/auth/*)는 동일 출처 절대경로다. axiosInstance 의 baseURL(브라우저='/api/v1')
// 이 전치되면 '/api/v1/api/auth/*' 가 되어 백엔드 프록시로 새 나가 401(Route Handler 미도달, HttpOnly 쿠키 미설정).
// baseURL:'' 로 오버라이드해 Route Handler 로 정확히 라우팅한다. (getCurrentUser 는 백엔드 직결이라 baseURL 유지)
const ROUTE_HANDLER = { baseURL: '' } as const;

export const authService = {
 /** 로그인 (Next.js Route Handler를 통해 HttpOnly 쿠키 바인딩) */
 login: async (loginData: Record<string, string>): Promise<LoginResponse> => {
   // 동일 도메인 Next.js API Route Handler로 라우팅
   return client.post<LoginResponse>('/api/auth/login', loginData, ROUTE_HANDLER);
 },

 /** 로그아웃 (Next.js Route Handler를 통해 로컬/원격 세션 쿠키 해제) */
 logout: async (): Promise<void> => {
   return client.post<void>('/api/auth/logout', undefined, ROUTE_HANDLER);
 },

 /** 토큰 갱신 (Next.js Route Handler를 통해 HttpOnly 쿠키 재발행) */
 reissue: async (): Promise<{ accessToken: string }> => {
   return client.post<{ accessToken: string }>('/api/auth/reissue', undefined, ROUTE_HANDLER);
 },

 /** 현재 사용자정보 조회 (백엔드에 직접 쏘며, 미들웨어가 accessToken 쿠키를 낚아채 Bearer 헤더를 주입해 줌) */
 getCurrentUser: async (): Promise<UserInfo> => {
   return client.get<UserInfo>(`${BASE_URL}/me`);
 },
};
