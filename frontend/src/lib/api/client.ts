import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';

// 백엔드 공통 응답 포맷
export interface ApiResponse<T = unknown> {
    success: boolean;
    code: string;
    message: string;
    data: T;
}

const getBaseURL = () => {
    if (typeof window === 'undefined') {
        return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
    }
    return '/api/v1';
};

const axiosInstance = axios.create({
    baseURL: getBaseURL(),
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// Request interceptor: Access Token 첨부
axiosInstance.interceptors.request.use(
    (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            if (process.env.NODE_ENV === 'development') {
                console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

let isRetrying = false;

// Response interceptor: 401 → token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry && !isRetrying) {
            // 서버 사이드인 경우 reissue 시도하지 않고 즉시 에러 반환
            if (typeof window === 'undefined') {
                return Promise.reject(error);
            }

            originalRequest._retry = true;
            isRetrying = true;
            try {
                const res = await axios.post('/api/v1/auth/reissue', {}, { withCredentials: true });
                const accessToken = res.data?.data?.accessToken || res.data?.accessToken;
                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                
                if (typeof window !== 'undefined') {
                    localStorage.setItem('accessToken', accessToken);
                }
                
                isRetrying = false;
                return axiosInstance(originalRequest);
            } catch (reissueError) {
                isRetrying = false;
                
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('accessToken');
                    if (!window.location.pathname.includes('/login')) {
                        window.location.href = '/login?expired=true';
                    }
                }
                
                return Promise.reject(reissueError);
            }
        }
        return Promise.reject(error);
    }
);

/**
 * 타입 안전 API 클라이언트.
 * 반환값은 백엔드 ApiResponse<T>.data (실제 페이로드).
 * 실패(success=false) 시 Error를 throw합니다.
 */
const client = {
    async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const res = await axiosInstance.get<ApiResponse<T>>(url, config);
        return extractData<T>(res.data);
    },
    async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const res = await axiosInstance.post<ApiResponse<T>>(url, data, config);
        return extractData<T>(res.data);
    },
    async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const res = await axiosInstance.put<ApiResponse<T>>(url, data, config);
        return extractData<T>(res.data);
    },
    async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const res = await axiosInstance.patch<ApiResponse<T>>(url, data, config);
        return extractData<T>(res.data);
    },
    async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const res = await axiosInstance.delete<ApiResponse<T>>(url, config);
        return extractData<T>(res.data);
    },
};

/** ApiResponse에서 data를 추출. success=false면 Error throw. */
function extractData<T>(body: ApiResponse<T> | T): T {
    // 백엔드 표준 응답 구조인 경우
    if (body && typeof body === 'object' && 'success' in body) {
        const apiBody = body as ApiResponse<T>;
        if (!apiBody.success) {
            throw new Error(apiBody.message || '요청 처리 중 오류가 발생했습니다.');
        }
        return apiBody.data;
    }
    // 표준 구조가 아닌 경우 그대로 반환
    return body as T;
}

export default client;
