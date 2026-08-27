import client, { reissueSession } from '@/lib/api/client';

/**
 * 인증 서비스
 */

export interface LoginResponse {
 accessToken: string;
 role: string;
}

export interface AuthUser {
 id: string;
 /** Board.userId처럼 esntlId 축을 쓰는 도메인의 본인 판정 전용 불투명 식별자. */
 esntlId?: string;
 name: string;
 role?: string;
 userSe?: string;
 email?: string;
}

/** 기존 소비자 호환 별칭. 신규 인증 경계 코드는 AuthUser 의미를 따른다. */
export type UserInfo = AuthUser;

function isRecord(value: unknown): value is Record<string, unknown> {
 return typeof value === 'object' && value !== null;
}

function identityText(value: unknown): string | undefined {
 return typeof value === 'string' && value.length > 0 && value === value.trim()
   ? value
   : undefined;
}

function optionalText(value: unknown): string | undefined {
 return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

/**
 * `/auth/me` 응답을 전역 인증 상태의 명시적 allowlist로 축소한다.
 * 필수 loginId/표시명이 모호하면 세션을 신뢰하지 않으며, esntlId가 없다고 loginId로 대체하지 않는다.
 */
export function normalizeAuthUser(value: unknown): AuthUser {
 if (!isRecord(value)) throw new Error('현재 사용자 응답이 올바르지 않습니다.');

 const id = identityText(value.id);
 const name = optionalText(value.name);
 if (!id || !name) throw new Error('현재 사용자 응답이 올바르지 않습니다.');

 const user: AuthUser = { id, name };
 const esntlId = identityText(value.esntlId);
 const role = identityText(value.role);
 const userSe = identityText(value.userSe);
 const email = optionalText(value.email);

 if (esntlId) user.esntlId = esntlId;
 if (role) user.role = role;
 if (userSe) user.userSe = userSe;
 if (email) user.email = email;
 return user;
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

 /**
  * 토큰 갱신 (Next.js Route Handler를 통해 HttpOnly 쿠키 재발행).
  *
  * 자동 재발급(axios 인터셉터)과 **단일 실행을 공유**한다 — 백엔드가 리프레시 토큰을 회전시키므로
  * 두 경로가 따로 쏘면 늦게 도착한 쪽만 401 이 되고, 세션은 연장됐는데 호출자만 실패로 본다.
  * 새 토큰은 Route Handler 가 HttpOnly 쿠키로 심으므로 돌려줄 값이 없다.
  */
 reissue: async (): Promise<void> => {
   await reissueSession();
 },

 /** 현재 사용자정보 조회 (백엔드에 직접 쏘며, 미들웨어가 accessToken 쿠키를 낚아채 Bearer 헤더를 주입해 줌) */
 getCurrentUser: async (): Promise<UserInfo> => {
   const response = await client.get<unknown>(`${BASE_URL}/me`);
   return normalizeAuthUser(response);
 },
};
