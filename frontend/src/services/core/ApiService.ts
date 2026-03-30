import client from '@/lib/api/client';
import type { AxiosRequestConfig } from 'axios';

/**
 * 기본 API 서비스 클래스
 * 모든 서비스는 특정 기본 경로(basePath)를 가지고 이를 기반으로 요청을 보낸다.
 */
export abstract class ApiService {
 protected basePath: string;
 protected client = client;

 constructor(basePath: string) {
 this.basePath = basePath;
 }

  protected async get<T = unknown>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
    // Spring Boot Backend (ComDefaultVO) 파라미터 매핑 지원
    if (config?.params) {
      const { params } = config;
      // 0-based page -> 1-based pageIndex
      if (params.page !== undefined && params.pageIndex === undefined) {
        params.pageIndex = (Number(params.page) || 0) + 1;
      }
      // page번호 -> pageIndex
      if (params['page번호'] !== undefined && params.pageIndex === undefined) {
        params.pageIndex = Number(params['page번호']) || 1;
      }
    }
    return client.get<T>(`${this.basePath}${path}`, config);
  }

 protected async post<T = unknown>(path: string = '', data?: unknown, config?: AxiosRequestConfig): Promise<T> {
 return client.post<T>(`${this.basePath}${path}`, data, config);
 }

 protected async put<T = unknown>(path: string = '', data?: unknown, config?: AxiosRequestConfig): Promise<T> {
 return client.put<T>(`${this.basePath}${path}`, data, config);
 }

 protected async patch<T = unknown>(path: string = '', data?: unknown, config?: AxiosRequestConfig): Promise<T> {
 return client.patch<T>(`${this.basePath}${path}`, data, config);
 }

 protected async delete<T = unknown>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
 return client.delete<T>(`${this.basePath}${path}`, config);
 }
}

/**
 * 사용자 전용 서비스 클래스
 */
export abstract class UserService extends ApiService {
  constructor(domainPath: string) {
    // baseURL에 이어지는 상대 경로로 변경 (슬래시 제거)
    super(`${domainPath.replace(/^\//, '')}`);
  }
}

/**
 * 관리자 전용 서비스 클래스
 */
export abstract class AdminService extends ApiService {
  constructor(domainPath: string) {
    // baseURL에 이어지는 상대 경로로 변경 (슬래시 제거)
    // /admin/system 대신 admin/system 사용
    super(`admin/system${domainPath}`);
  }
}
