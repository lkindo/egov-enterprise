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
 return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
 }
 return '/api/v1';
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
 (config) => {
 let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
 
 // 문자열 "null"이나 "undefined"가 들어오는 경우 방지
 if (token === 'null' || token === 'undefined') {
 if (process.env.NODE_ENV === 'development') {
 console.warn(`[API Request] Token is invalid string: "${token}". Clearing it.`);
 }
 token = null;
 if (typeof window !== 'undefined') localStorage.removeItem('accessToken');
 }

 // 이미 헤더가 있거나(재시도 등) 토큰이 있는 경우 처리
 if (token && !config.headers['Authorization']) {
 config.headers['Authorization'] = `Bearer ${token}`;
 }

 if (process.env.NODE_ENV === 'development') {
 const hasAuth = !!config.headers['Authorization'];
 const tokenPreview = token ? `${token.substring(0, 10)}...` : 'NONE';
 console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url} | AuthHeader: ${hasAuth} | TokenInJS: ${tokenPreview}`);
 }
 return config;
 },
 (error) => Promise.reject(error)
);

let isRetrying = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
 failedQueue.forEach((prom) => {
 if (error) {
 prom.reject(error);
 } else {
 prom.resolve(token);
 }
 });
 failedQueue = [];
};

// Response interceptor: 401 → token refresh
axiosInstance.interceptors.response.use(
 (response) => response,
 async (error) => {
 const originalRequest = error.config as any;

 if (error.response?.status === 401 && !originalRequest._retry) {
 console.warn(`[API Response] 401 Unauthorized detected for: ${originalRequest.url}`);

 // 현재 페이지가 로그인 페이지이거나 요청 자체가 인증 관련(login, reissue)이면 재시도하지 않음
 if (typeof window !== 'undefined' &&
 (window.location.pathname.includes('/login') ||
 originalRequest.url?.includes('/auth/login') ||
 originalRequest.url?.includes('/auth/reissue'))) {
 console.log('[API interceptor] Authentication-related request failed, not retrying.');
 return Promise.reject(error);
 }

 if (isRetrying) {
 console.log(`[API interceptor] Refresh already in progress, queuing request: ${originalRequest.url}`);
 return new Promise((resolve, reject) => {
 failedQueue.push({ resolve, reject });
 })
 .then((token) => {
 console.log(`[API interceptor] Token refreshed, retrying queued request: ${originalRequest.url}`);
 originalRequest.headers['Authorization'] = `Bearer ${token}`;
 return axiosInstance(originalRequest);
 })
 .catch((err) => Promise.reject(err));
 }

 // 서버 사이드인 경우 reissue 시도하지 않고 즉시 에러 반환
 if (typeof window === 'undefined') {
 return Promise.reject(error);
 }

 console.log(`[API interceptor] Starting token reissue for: ${originalRequest.url}`);
 originalRequest._retry = true;
 isRetrying = true;

 try {
 // 재발급 요청은 인터셉터의 401 재시도 로직을 타지 않도록 별도 처리하거나 플래그 사용
 const res = await axiosInstance.post<ApiResponse<{ accessToken: string }>>(
 '/auth/reissue',
 {},
 { 
 _retry: true, 
 headers: { 'Authorization': '' } 
 } as any
 );

 const responseData = res.data;
 const accessToken = responseData?.data?.accessToken;

 if (!accessToken) {
 console.error('[API interceptor] No access token in reissue response', responseData);
 throw new Error('Token reissue failed: Empty token');
 }

 console.log('[API interceptor] Token reissue successful.');

 if (typeof window !== 'undefined') {
 localStorage.setItem('accessToken', accessToken);
 // 서버 사이드와 동기화를 위해 쿠키도 업데이트 (선택 사항)
 document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
 }

 processQueue(null, accessToken);
 isRetrying = false;
 
 originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
 console.log(`[API interceptor] Retrying original request: ${originalRequest.url}`);
 return axiosInstance(originalRequest);
 } catch (reissueError: any) {
 console.error('[API interceptor] Token reissue failed, redirecting to login.', reissueError.message);
 processQueue(reissueError, null);
 isRetrying = false;

 if (typeof window !== 'undefined') {
 // 단 한번의 재발급 실패로 바로 지우기 전에 401 응답인지 확인
 if (reissueError.response?.status === 401 || reissueError.response?.status === 403) {
 localStorage.removeItem('accessToken');
 localStorage.removeItem('role');
 document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
 
 if (!window.location.pathname.includes('/login')) {
 console.warn('[API interceptor] Redirecting to login due to failed reissue');
 window.location.href = `/login?expired=true&redirect=${encodeURIComponent(window.location.pathname)}`;
 }
 }
 }

 return Promise.reject(reissueError);
 }
 }

 // 에러 메시지 추출 및 이벤트 발생은 401 재시도 대상이 아닐 때만 수행 (선택 사항)
 const backendMessage = error.response?.data?.message;
 const message = backendMessage || error.message || '요청 처리 중 오류가 발생했습니다.';
 
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('api-error', {
 detail: { message, status: error.response?.status }
 }));
 }

 // 백엔드 메시지가 있는 경우 에러 객체의 메시지를 오버라이드하여 전달
 if (backendMessage) {
 error.message = backendMessage;
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
