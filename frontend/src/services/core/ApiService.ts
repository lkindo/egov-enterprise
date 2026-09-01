import client from '@/lib/api/client';
import type { AxiosRequestConfig } from 'axios';
import type {
  GeneratedOperationDescriptor,
  GeneratedOperationResponse,
} from '@/types/generated-operations';
import {
  type GeneratedMultipartDescriptor,
  type GeneratedMultipartOperationArguments,
  type GeneratedOperationArguments,
} from '@/lib/api/generated-operation';
import {
  executeGeneratedMultipartOperation,
  executeGeneratedOperation,
} from '@/lib/api/generated-api-client';

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
        // Do NOT delete params.page to support Spring Data Pageable
      }
      // size -> recordCountPerPage 매핑 (BaseSearchDto 표준)
      if (params.size !== undefined && params.recordCountPerPage === undefined) {
        params.recordCountPerPage = params.size;
        // Do NOT delete params.size to support Spring Data Pageable
      }
      // pageSize -> recordCountPerPage & size 매핑 (Common DTO support)
      if (params.pageSize !== undefined) {
        if (params.recordCountPerPage === undefined) params.recordCountPerPage = params.pageSize;
        if (params.size === undefined) params.size = params.pageSize;
      }
      // page 번호 -> pageIndex (legacy support)
      if (params['page 번호'] !== undefined && params.pageIndex === undefined) {
        params.pageIndex = Number(params['page 번호']) || 1;
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

  /**
   * OpenAPI operationId에서 생성한 method/path/request/response 계약을 한 번에 실행한다.
   * 기존 basePath와 호출자 generic은 의도적으로 사용하지 않는다.
   */
  protected async executeGenerated<const Descriptor extends GeneratedOperationDescriptor>(
    descriptor: Descriptor,
    args: GeneratedOperationArguments<Descriptor>,
  ): Promise<GeneratedOperationResponse<Descriptor>> {
    return executeGeneratedOperation(descriptor, args);
  }

  /** Multipart bytes는 FormData가, method/path/JSON 응답은 generated descriptor가 소유한다. */
  protected async executeGeneratedMultipart<const Descriptor extends GeneratedMultipartDescriptor>(
    descriptor: Descriptor,
    args: GeneratedMultipartOperationArguments<Descriptor>,
  ): Promise<GeneratedOperationResponse<Descriptor>> {
    return executeGeneratedMultipartOperation(descriptor, args);
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
    const cleanedPath = domainPath.replace(/^\//, '');
    super(`admin/${category}/${cleanedPath}`);
  }
}
