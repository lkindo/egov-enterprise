import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import { cache } from 'react';

// 백엔드 공통 응답 포맷
export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data: T;
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
    let token = null;
    
    if (typeof window === 'undefined') {
      // SSR 환경: next/headers의 cookies()를 사용하여 토큰 추출 (Next.js 15 대응)
      // 서버 컴포넌트에서는 브라우저와 달리 쿠키가 자동으로 백엔드 API 서버로 전달되지 않으므로 헤더에 Bearer 토큰을 직접 동봉해 준다.
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        token = cookieStore.get('accessToken')?.value || null;
      } catch (e) {
        // 빌드 타임이나 만료된 세션 시 cookies() 접근 불가 상황 대응
        token = null;
      }
    }
    
    // 브라우저 클라이언트 환경(typeof window !== 'undefined')에서는 
    // 브라우저의 withCredentials: true 속성에 의해 accessToken HttpOnly 쿠키가 자동으로 Next.js Middleware로 전달되며,
    // Next.js Middleware 가 이 쿠키를 낚아채 백엔드로 Authorization: Bearer <token> 헤더를 주입해 전송하므로 클라이언트 단에서는 헤더 주입이 면제됩니다.

    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
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

// Response interceptor: 401 시 token refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (typeof window !== 'undefined' &&
        (window.location.pathname.includes('/login') ||
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
        const res = await axiosInstance.post<ApiResponse<unknown>>(
          '/api/auth/reissue',
          {},
          {
            _retry: true,
            headers: { 'Authorization': '' }
          } as AxiosRequestConfig & { _retry: boolean }
        );

        if (!res.data?.success) throw new Error('Token reissue failed');

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

        processQueue(finalReissueError, null);
        isRetrying = false;

        if (typeof window !== 'undefined') {
          // 세션 만료 시 로그인 화면으로 포워딩
          window.location.href = `/login?expired=true&redirect=${encodeURIComponent(window.location.pathname)}`;
        }

        return Promise.reject(finalReissueError);
      }
    }

    const backendMessage = error.response?.data?.message;
    const message = backendMessage || error.message || '요청 처리 중 오류가 발생했습니다.';
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('api-error', {
        detail: { message, status: error.response?.status }
      }));
    }

    let finalError = error;
    if (!(error instanceof Error) && typeof error === 'object' && error !== null) {
      finalError = new Error((error as Record<string, unknown>).message as string || backendMessage || 'Unknown Network/System Error');
      Object.assign(finalError, error);
    }

    if (backendMessage && finalError instanceof Error) {
      finalError.message = backendMessage;
    }

    return Promise.reject(finalError);
  }
);

/**
 * 표준화된 API 클라이언트
 * Optimization: Priority 3 - React.cache를 사용한 서버 사이드 요청 중복 제거
 */
const client = {
  get: cache(async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await axiosInstance.get<ApiResponse<T>>(url, config);
    return extractData<T>(res.data);
  }),
  post: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const res = await axiosInstance.post<ApiResponse<T>>(url, data, config);
    return extractData<T>(res.data);
  },
  put: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const res = await axiosInstance.put<ApiResponse<T>>(url, data, config);
    return extractData<T>(res.data);
  },
  patch: async <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    const res = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
    return extractData<T>(res.data);
  },
  delete: async <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const res = await axiosInstance.delete<ApiResponse<T>>(url, config);
    return extractData<T>(res.data);
  },
};

/** ApiResponse에서 data를 추출. success=false면 Error throw. */
function extractData<T>(body: ApiResponse<T> | T): T {
  if (body && typeof body === 'object' && 'success' in body) {
    const apiBody = body as ApiResponse<T>;
    if (!apiBody.success) {
      throw new Error(apiBody.message || '요청 처리 중 오류가 발생했습니다.');
    }
    return apiBody.data;
  }
  return body as T;
}

export default client;
