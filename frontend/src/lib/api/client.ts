import axios from 'axios';
import { AUTH_BROWSER_REQUEST_TIMEOUT_MS } from '@/lib/auth/auth-request-policy';
import type { AxiosRequestConfig } from 'axios';
import { cache } from 'react';
import { runOnSessionLost } from '@/lib/auth/before-sign-out';
import { effectiveBrowserLocale } from '@/i18n/surfaces';

import { authReissueResponseSchema } from '@/lib/auth/auth-reissue-contract';
import { forwardedClientIpHeaders } from '@/lib/api/forwarded-client-ip';
import {
  advanceAuthorizationRequestEpoch,
  assertCurrentAuthorizationRequest,
  assertRequestAllowedWhileSignedOut,
  getAuthorizationRequestEpoch,
  isSessionTransitionPending,
  isSignedOut,
  markSignedOut,
  notifyAuthorizationChanged,
} from '@/lib/auth/authorization-state';
import { isCanceledRequest } from '@/lib/safe-error-log';
import { loginReturnPath } from '@/lib/auth/login-return-path';
import { hardNavigateToInternalRoute } from '@/lib/navigation/internal-route';

/*
 * 요청 단위 옵션 확장.
 *
 * `suppressErrorToast` 를 선언한 요청의 실패는 전역 `api-error` 토스트를 띄우지 않는다 —
 * **호출부가 화면에서 그 실패를 이미 처리하는 경우**에만 쓴다(예: 첨부 이미지가 대체 표시로 넘어감).
 * 선언하지 않으면 종전대로 토스트가 뜬다.
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    suppressErrorToast?: boolean;
    _authorizationEpoch?: number;
  }
}

/** 필드 단위 검증 오류 1건. 백엔드 검증 실패 응답의 `errors` 항목이다. [W1-14] */
export interface FieldErrorItem {
  field: string;
  message: string;
}

const getBaseURL = () => {
  // 브라우저: 동일 출처(same-origin) 상대 경로 → next.config rewrites('/api/v1/:path*')가 백엔드로 프록시
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  // SSR/서버 컴포넌트: 내부 절대 출처로 백엔드를 직접 호출 (프록시 홉 우회)
  return process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api/v1';
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: { 
    'Content-Type': 'application/json',
    ...(typeof window === 'undefined' ? { 'Connection': 'close' } : {})
  },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  timeout: 15000,
});

// Request interceptor: Access Token 첨부
axiosInstance.interceptors.request.use(
  async (config) => {
    // Keep an existing epoch on retries: an old mutation must never run as the next account.
    assertCurrentAuthorizationRequest(config._authorizationEpoch);
    // 로그아웃 뒤 화면에 남은 조회가 401·재발급으로 번지지 않게 한다(DIP B4).
    assertRequestAllowedWhileSignedOut(config.url);
    config._authorizationEpoch ??= getAuthorizationRequestEpoch();
    let token = null;
    
    if (typeof window === 'undefined') {
      // SSR 환경: next/headers의 cookies()를 사용하여 토큰 추출 (Next.js 15 대응)
      // 서버 컴포넌트에서는 브라우저와 달리 쿠키가 자동으로 백엔드 API 서버로 전달되지 않으므로 헤더에 Bearer 토큰을 직접 동봉해 준다.
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        token = cookieStore.get('accessToken')?.value || null;
      } catch {
        // 빌드 타임이나 만료된 세션 시 cookies() 접근 불가 상황 대응
        token = null;
      }
      // 서버 컴포넌트·서버 액션의 백엔드 호출도 사용자 IP 를 싣는다(ADR-0019). 싣지 않으면 모든 사용자의
      // 서버 측 조회가 Next 주소 하나의 요청 제한 버킷을 같이 쓴다. 신뢰 앞단 프록시가 없으면 넘기지 않는다.
      // 요청 범위 밖(빌드 타임)이면 headers() 가 실패하므로 토큰 처리와 분리해 조용히 건너뛴다.
      try {
        const { headers } = await import('next/headers');
        for (const [name, value] of Object.entries(forwardedClientIpHeaders(await headers()))) {
          if (!config.headers[name]) config.headers[name] = value;
        }
      } catch {
        // 요청 범위 밖 — 넘길 사용자 IP 가 없다.
      }
    }
    
    // 브라우저 클라이언트 환경(typeof window !== 'undefined')에서는 
    // 브라우저의 withCredentials: true 속성에 의해 accessToken HttpOnly 쿠키가 자동으로 Next.js Middleware로 전달되며,
    // Next.js Middleware 가 이 쿠키를 낚아채 백엔드로 Authorization: Bearer <token> 헤더를 주입해 전송하므로 클라이언트 단에서는 헤더 주입이 면제됩니다.

    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // [2026-11-26 ADR-0063] 백엔드 오류 문구도 지금 화면의 로케일을 따른다(ko/en MessageSource, ADR-0002 가 유지한 계약) — 번역을 마치지
    //   않은 화면은 영어를 골랐어도 한국어로 그리므로 한국어를 싣는다. 브라우저 요청만 싣는다(서버 렌더의 요청은 기본 한국어다). 헤더 이름은
    //   대소문자를 가리지 않는다 — 호출부가 소문자로 이미 실었으면 덮지 않는다.
    if (typeof window !== 'undefined' && !hasHeader(config.headers, 'Accept-Language')) {
      config.headers['Accept-Language'] = effectiveBrowserLocale();
    }

    return config;
  },
  (error) => Promise.reject(error)
);

interface QueueItem {
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}

let isRetrying = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/** 진행 중인 재발급. 있으면 새로 쏘지 않고 그 결과를 함께 기다린다. */
let inFlightReissue: Promise<void> | null = null;

/**
 * 세션 재발급을 **단일 실행(single-flight)** 으로 수행한다.
 *
 * <p>백엔드는 재발급 때 리프레시 토큰을 <b>회전</b>시킨다 — 같은 토큰으로 두 번 부르면 두 번째는
 * 401(SESSION_EXPIRED)이다(2026-08-27 실측). 그런데 재발급을 부르는 경로는 둘이다:
 * 401 을 만난 요청의 자동 재발급(아래 인터셉터)과, 사용자가 누르는 세션 연장 버튼
 * ({@link ../../app/components/ui/session-expiry-warning}). 종전에는 두 경로가 서로를 몰라
 * 겹치면 늦게 도착한 쪽만 401 이 됐고, <b>세션은 연장됐는데 버튼만 실패</b>로 보였다.
 *
 * <p>여기서 한 번만 쏘고 결과를 공유하면 그 경합 자체가 사라진다. 실패도 공유되므로
 * 호출자마다 다른 결론을 내리는 일이 없다.
 */
export function reissueSession(): Promise<void> {
  if (inFlightReissue) return inFlightReissue;

  inFlightReissue = axiosInstance
    .post<unknown>(
      '/api/auth/reissue',
      {},
      {
        _retry: true,
        // baseURL:'' — Route Handler(/api/auth/reissue) 직결. 미지정 시 '/api/v1' 전치되어
        // '/api/v1/api/auth/reissue'→백엔드 401 로 재발급 자체가 파손된다.
        baseURL: '',
        timeout: AUTH_BROWSER_REQUEST_TIMEOUT_MS,
        headers: { 'Authorization': '' },
      } as AxiosRequestConfig & { _retry: boolean }
    )
    .then((res) => {
      const validation = authReissueResponseSchema.safeParse(res.data);
      if (!validation.success || !validation.data.success) throw new Error('Token reissue failed');
      notifyAuthorizationChanged();
    })
    .finally(() => {
      inFlightReissue = null;
    });

  return inFlightReissue;
}

/** 로그인 화면(`/login`, 그 아래 경로)인가. 경로 어딘가에 `/login` 이 든 관리 화면은 아니다. */
export function isLoginScreen(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/login/');
}

/** 요청 헤더에 이 이름이 있는가(대소문자 무관). axios 는 보통 AxiosHeaders 를 주지만 호출부가 평범한 객체를 넘길 수도 있다. */
function hasHeader(headers: unknown, name: string): boolean {
  if (!headers || typeof headers !== 'object') return false;
  const candidate = headers as { has?: (header: string) => boolean };
  if (typeof candidate.has === 'function') return candidate.has(name);
  const lower = name.toLowerCase();
  return Object.entries(headers as Record<string, unknown>).some(([key, value]) => key.toLowerCase() === lower && value !== undefined && value !== null && value !== '');
}

// Response interceptor: 401 시 token refresh
/**
 * 서버 문구가 없는 요청 실패를 사용자에게 보여 줄 한국어 안내로 바꾼다.
 * axios 원문(`Network Error`·`timeout of 15000ms exceeded`·`Request failed with status code 500`)은
 * 무엇을 해야 하는지 말하지 않는다. 원문은 호출부가 받는 오류 객체에 그대로 남는다.
 */
export type RequestFailureKind = 'timeout' | 'offline' | 'generic';

/** 서버 문구가 없는 요청 실패의 종류 — 전역 알림은 이 종류를 지금 화면의 로케일 문구(카탈로그 transport)로 그린다(ADR-0063). */
function requestFailureKind(error: { code?: string; response?: unknown }): RequestFailureKind {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return 'timeout';
  if (!error.response) return 'offline';
  return 'generic';
}

const REQUEST_FAILURE_TEXT: Record<RequestFailureKind, string> = {
  timeout: '서버 응답이 늦어 요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  offline: '서버에 연결하지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
  generic: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

function describeRequestFailure(error: { code?: string; response?: unknown }): string {
  return REQUEST_FAILURE_TEXT[requestFailureKind(error)];
}

axiosInstance.interceptors.response.use(
  (response) => {
    assertCurrentAuthorizationRequest(response.config?._authorizationEpoch);
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    assertCurrentAuthorizationRequest(originalRequest?._authorizationEpoch);

    // A denied operation refreshes display grants, never the access token or the mutation itself.
    // Excluding identity/refresh requests prevents a rejected recheck from triggering itself.
    if (error.response?.status === 403 &&
        !/(?:^|\/)(?:auth\/|users\/me(?:$|\?))/.test(originalRequest?.url ?? '')) {
      notifyAuthorizationChanged();
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      // [2026-11-21] 로그인 화면 자신만 뺀다 — 종전 부분 문자열 판정은 `/admin/security/login-policy`·`/admin/system/logs/login`
      //   같은 관리 화면도 로그인 화면으로 보아, 그 화면들에서는 세션이 만료돼도 재발급·로그인 이동 없이 요청이 조용히 실패했다.
      if (typeof window !== 'undefined' &&
        (isSignedOut() || isLoginScreen(window.location.pathname) ||
        originalRequest.url?.includes('/api/auth/login') ||
        originalRequest.url?.includes('/api/auth/reissue'))) {
        return Promise.reject(error);
      }

      if (isRetrying) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(() => {
          // 재갱신된 토큰은 HttpOnly 쿠키로 알아서 브라우저가 전송하므로, Authorization 헤더를 굳이 수동 첨부할 필요가 없습니다.
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
      }

      if (typeof window === 'undefined') {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      isRetrying = true;

      try {
        // Next.js Route Handler의 토큰 재발행 API 호출 (/api/auth/reissue)
        // 응답 바디에는 토큰이 없다 — 새 accessToken 은 Route Handler 가 HttpOnly 쿠키로 재설정한다.
        // 인터셉터는 200/success 를 "재발급 성공" 신호로만 사용하고, 원요청을 재시도하면 브라우저가
        // 새 HttpOnly 쿠키를 전송 → 미들웨어가 Bearer 를 주입한다.
        // 세션 연장 버튼과 같은 단일 실행을 공유한다(reissueSession 주석 참조).
        await reissueSession();

        processQueue(null, 'reissued');
        isRetrying = false;

        return axiosInstance(originalRequest);
      } catch (reissueError: unknown) {
        let finalReissueError: Error;
        if (reissueError instanceof Error) {
          finalReissueError = reissueError;
        } else {
          finalReissueError = new Error('Token reissue failed');
        }
        // [2026-10-24] 재발급을 기다리는 사이 로그아웃이나 추가 인증 등록(일반 세션을 폐기한다)으로 넘어갔거나, 그 등록 요청이 아직
        //   진행 중이면 세션 만료가 아니다 — 그 화면을 지키고 만료 화면으로 보내지 않는다. 등록 시작 전에 나간 홈 조회가 401 을 받아
        //   등록 모달을 걷던 경합이다(run 40054825686). 등록 응답보다 재발급 실패가 먼저 끝나는 순서는 진행 중 표지가 막는다.
        const superseded = isSignedOut() || isSessionTransitionPending() || (originalRequest._authorizationEpoch !== undefined
          && originalRequest._authorizationEpoch !== getAuthorizationRequestEpoch());
        if (superseded) {
          finalReissueError = new Error('인증 상태가 바뀌어 재발급 실패를 세션 만료로 다루지 않았습니다.');
          finalReissueError.name = 'CanceledError';
        }

        processQueue(finalReissueError, null);
        isRetrying = false;

        if (typeof window !== 'undefined' && !superseded) {
          // 로그인 문서가 열리기 전에 이전 화면의 늦은 응답과 새 재발급을 막는다.
          markSignedOut();
          advanceAuthorizationRequestEpoch();
          // 세션은 이미 끝났다 — 보낼 수 없는 대기 일(결재 대기 승인)을 거두고 다시 로그인할 때 볼 안내를 남긴다(2026-11-25).
          runOnSessionLost();
          // 세션 만료 시 로그인 화면으로 포워딩
          // [결정 17] 경로와 구조 키(게시판·글·탭·쪽)만 넘겨, 다시 로그인하면 보던 자리로 돌아간다.
          hardNavigateToInternalRoute(
            `/login?expired=true&redirect=${encodeURIComponent(loginReturnPath(window.location.pathname, window.location.search))}`,
            window.location,
            '/login?expired=true',
          );
        }

        return Promise.reject(finalReissueError);
      }
    }

    const backendMessage = error.response?.data?.message;
    // [2026-09-15 DEC-OPS-100] axios 의 transport 문구(연결 실패·시간 초과·상태 코드만 있는 실패)는
    //   사용자에게 보여 줄 문장이 아니다(콘텐츠 가이드 §5). 서버가 준 문구만 그대로 싣고, 나머지는
    //   실패 형태에 맞는 한국어 안내로 바꾼다. 아래 finalError.message 는 원문을 유지한다 —
    //   admin/error.tsx 가 그 원문에서 401·403·404 를 판정한다.
    const message = backendMessage || describeRequestFailure(error);
    // 호출부가 스스로 취소한 요청(AbortController)은 실패가 아니다 — 알릴 것이 없다.
    const cancelled = isCanceledRequest(error);
    
    /*
     * [2026-08-26] 모든 실패를 전역 토스트로 올리면 **호출부가 이미 처리한 실패까지 화면을 가린다**.
     * 실측 사례: 대시보드 배너의 첨부 이미지가 404 일 때 `AttachmentImage` 는 조용히 대체 표시로
     * 넘어가는데, 이 인터셉터가 5초마다 `Request failed with status code 404` 토스트를 띄웠다 —
     * 사용자가 할 수 있는 일이 없는 실패를 반복해서 알린 셈이다.
     *
     * 그래서 호출부가 `suppressErrorToast` 로 "이 실패는 내가 화면에서 처리한다"를 선언할 수 있게 한다.
     * 기본값은 종전 그대로 토스트를 띄우는 쪽이라, 선언하지 않은 호출부의 동작은 바뀌지 않는다.
     */
    const suppressToast = Boolean(
      (error.config as (AxiosRequestConfig & { suppressErrorToast?: boolean }) | undefined)?.suppressErrorToast,
    );

    if (typeof window !== 'undefined' && !suppressToast && !cancelled) {
      window.dispatchEvent(new CustomEvent('api-error', {
        // transport: 서버 문구가 없을 때의 실패 종류 — 전역 알림이 지금 화면의 로케일로 다시 쓴다. message 는 종전 그대로(한국어 안내 또는
        //   서버 문구)라 이 이벤트를 듣는 다른 곳의 의미가 바뀌지 않는다.
        detail: { message, status: error.response?.status, transport: backendMessage ? undefined : requestFailureKind(error) }
      }));
    }

    let finalError = error;
    if (!(error instanceof Error) && typeof error === 'object' && error !== null) {
      finalError = new Error((error as Record<string, unknown>).message as string || backendMessage || describeRequestFailure(error));
      Object.assign(finalError, error);
    }

    if (backendMessage && finalError instanceof Error) {
      finalError.message = backendMessage;
    }

    return Promise.reject(finalError);
  }
);

/** 생성 operation 의 query 를 OpenAPI 기본 style=form·explode=true wire 형식으로 직렬화한다(배열은 같은 key 반복). */
function serializeGeneratedFormExplodeQuery(params: unknown): string {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    throw new Error('생성 API 쿼리 파라미터를 wire 형식으로 직렬화할 수 없습니다.');
  }

  const searchParams = new URLSearchParams();
  const append = (name: string, value: unknown) => {
    if (value === undefined) return;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error('생성 API 쿼리 파라미터를 wire 형식으로 직렬화할 수 없습니다.');
    }
    searchParams.append(name, String(value));
  };

  for (const [name, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => append(name, item));
    else append(name, value);
  }
  return searchParams.toString();
}

function withGeneratedQuerySerializer(config: AxiosRequestConfig): AxiosRequestConfig;
function withGeneratedQuerySerializer(config?: AxiosRequestConfig): AxiosRequestConfig | undefined;
function withGeneratedQuerySerializer(config?: AxiosRequestConfig): AxiosRequestConfig | undefined {
  if (config?.params === undefined) return config;
  return {
    ...config,
    // OpenAPI query의 기본 style=form, explode=true: 배열은 bracket이 아니라 같은 key를 반복한다.
    // getRaw/requestRaw는 generated executor 전용 seam이며 호출자 paramsSerializer는 앞단에서 차단된다.
    paramsSerializer: { serialize: serializeGeneratedFormExplodeQuery },
  };
}

const client = {
  /**
   * Generated operation 경계가 공통 envelope를 직접 검증할 수 있도록 원문 body를 보존한다.
   *
   * <p>[2026-11-25 품질 평가] React.cache 는 서버 컴포넌트 렌더 한 번 안에서 <b>같은 인자</b>로 부른 결과만 재사용한다 — 브라우저에서는
   * 효과가 없고, 서버에서도 호출마다 새 config 객체를 넘기면(쿠키 전달 등) 재사용되지 않는다. 일반적인 요청 중복 제거로 기대하지 않는다
   * (화면의 중복 조회는 React Query 키가 맡는다).
   */
  getRaw: cache(async (url: string, config?: AxiosRequestConfig): Promise<unknown> => {
    const res = await axiosInstance.get<unknown>(url, withGeneratedQuerySerializer(config));
    return res.data;
  }),
  /** GET 외 generated operation용 raw transport. URL·method·body는 descriptor executor가 소유한다. */
  requestRaw: async (config: AxiosRequestConfig): Promise<unknown> => {
    const res = await axiosInstance.request<unknown>(withGeneratedQuerySerializer(config));
    return res.data;
  },
};

export default client;
