import client from '@/lib/api/client';
import type { AxiosRequestConfig } from 'axios';

/**
 * 기본 API 서비스 클래스
 * 모든 서비스는 특정 기본 경로 (basePath) 를 가지며 이를 기반으로 요청을 보냅니다.
 */
export abstract class ApiService {
  protected basePath: string;
  protected client = client;

  constructor(basePath: string) {
    this.basePath = basePath.replace(/^\//, '');
    // Ensure basePath ends with / if path is provided later, 
    // but the current implementation uses `${this.basePath}${path}`
    // so if basePath is 'boards' and path is '/1', it's 'boards/1'.
    // If path is '', it's 'boards'.
  }

  protected async get<T = unknown>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
    // Spring Boot Backend (BaseSearchDto) 파라미터 매핑 지원
    let requestConfig = config;
    if (config?.params) {
      const { params } = config;
      // 0-based page -> 1-based pageIndex
      if (params.page !== undefined && params.pageIndex === undefined) {
        params.pageIndex = (Number(params.page) || 0) + 1;
        delete params.page;
      }
      // size -> recordCountPerPage 매핑 (BaseSearchDto 표준)
      if (params.size !== undefined && params.recordCountPerPage === undefined) {
        params.recordCountPerPage = params.size;
        delete params.size;
      }
      // page 번호 -> pageIndex (legacy support)
      if (params['page 번호'] !== undefined && params.pageIndex === undefined) {
        params.pageIndex = Number(params['page 번호']) || 1;
        delete params['page 번호'];
      }
      requestConfig = { ...config, params };
    }
    return client.get<T>(`${this.basePath}${path}`, requestConfig);
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
 * 사용자용 서비스 클래스
 */
export abstract class UserService extends ApiService {
  constructor(domainPath: string) {
    // baseURL에 이어지는 상대 경로로 변경 (슬래시 제거)
    super(`${domainPath.replace(/^\//, '')}`);
  }
}

/**
 * 관리자용 서비스 클래스
 */
export abstract class AdminService extends ApiService {
  constructor(domainPath: string, category: string = 'system') {
    // baseURL에 이어지는 상대 경로로 변경 (슬래시 제거)
    // category를 동적으로 받아 system, content, operation 등 지원
    super(`admin/${category}${domainPath}`);
  }
}
