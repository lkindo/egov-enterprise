import axios from 'axios';
import { reissueSession } from '@/lib/api/client';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import {
 authLoginDataSchema,
 authLoginResponseSchema,
 authLogoutDataSchema,
 authLogoutResponseSchema,
 type AuthLoginData,
} from '@/lib/auth/auth-bff-contract';
import {
 getCurrentUserOperation,
 type GeneratedOperationRequest,
} from '@/types/generated-operations';

/**
 * 인증 서비스
 */

export type LoginResponse = AuthLoginData;

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

// login/logout은 토큰을 HttpOnly 쿠키로 바인딩하는 Next Route Handler의 전체 envelope를
// strict Zod로 검증해야 한다. 그래서 data만 풀어주는 일반 API client와 분리한 Axios special
// transport를 쓴다. baseURL:''은 '/api/v1/api/auth/*' 이중 prefix 회귀를 차단한다.
const ROUTE_HANDLER = { baseURL: '', withCredentials: true } as const;

function axiosErrorResponseData(error: unknown): unknown {
 if (!isRecord(error) || !isRecord(error.response)) return undefined;
 return error.response.data;
}

export const authService = {
 /** 로그인 (Next.js Route Handler를 통해 HttpOnly 쿠키 바인딩) */
 login: async (loginData: GeneratedOperationRequest<'login'>): Promise<LoginResponse> => {
   // 동일 도메인 Next.js API Route Handler로 라우팅
   let response;
   try {
     response = await axios.post<unknown>('/api/auth/login', loginData, ROUTE_HANDLER);
   } catch (error: unknown) {
     const responseData = axiosErrorResponseData(error);
     const failure = authLoginResponseSchema.safeParse(responseData);
     if (failure.success && !failure.data.success) throw new Error(failure.data.message);
     if (responseData !== undefined) throw new Error('로그인 응답이 올바르지 않습니다.');
     throw error;
   }
   const parsed = authLoginResponseSchema.parse(response.data);
   if (!parsed.success) throw new Error(parsed.message);
   return authLoginDataSchema.parse(parsed.data);
 },

 /** 로그아웃 (Next.js Route Handler를 통해 로컬/원격 세션 쿠키 해제) */
 logout: async (): Promise<void> => {
   const response = await axios.post<unknown>('/api/auth/logout', undefined, ROUTE_HANDLER);
   const parsed = authLogoutResponseSchema.parse(response.data);
   authLogoutDataSchema.parse(parsed.data);
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
   const response = await executeGeneratedOperation(getCurrentUserOperation, {});
   return normalizeAuthUser(response);
 },
};
