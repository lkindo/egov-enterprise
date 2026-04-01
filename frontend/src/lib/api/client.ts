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
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1/';
  }
  return '/api/v1/';
};

const axiosInstance = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  timeout: 15000,
});

// Request interceptor: Access Token 첨부
axiosInstance.interceptors.request.use(
  async (config) => {
    let token = null;
    
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('accessToken');
    } else {
      // SSR 환경: next/headers의 cookies()를 사용하여 토큰 추출 (Next.js 15 대응)
      try {
        const { cookies } = await import('next/headers');
        const cookieStore = await cookies();
        token = cookieStore.get('accessToken')?.value || null;
      } catch (e) {
        // 빌드 타임이나 만료된 세션 시 cookies() 접근 불가 상황 대응
        token = null;
      }
    }
    
    if (token === 'null' || token === 'undefined') {
      token = null;
      if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
    }

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
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/reissue'))) {
        return Promise.reject(error);
      }

      if (isRetrying) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
          }
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
        const res = await axiosInstance.post<ApiResponse<{ accessToken: string }>>(
          '/auth/reissue',
          {},
          { 
            _retry: true, 
            headers: { 'Authorization': '' } 
          } as AxiosRequestConfig & { _retry: boolean }
        );

        const responseData = res.data;
        const accessToken = responseData?.data?.accessToken;

        if (!accessToken) throw new Error('Token reissue failed: Empty token');

        localStorage.setItem('accessToken', accessToken);
        document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;

        processQueue(null, accessToken);
        isRetrying = false;
        
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        }
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
          localStorage.removeItem('accessToken');
          localStorage.removeItem('role');
          document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
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
