import client from '@/lib/api/client';
import type { AxiosRequestConfig } from 'axios';

/**
 * 기본 API 서비스 클래스.
 * 서비스 도메인별 기본 경로(basePath)를 캡슐화합니다.
 */
export abstract class ApiService {
    protected basePath: string;
    protected client = client;

    constructor(basePath: string) {
        this.basePath = basePath;
    }

    protected async get<T = unknown>(path: string = '', config?: AxiosRequestConfig): Promise<T> {
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
 * 사용자용 서비스 베이스 클래스
 * 기본 경로: /... (필요에 따라 지정)
 */
export abstract class UserService extends ApiService {
    constructor(domainPath: string) {
        super(`${domainPath}`);
    }
}

/**
 * 관리자용 시스템 서비스 베이스 클래스
 * 기본 경로: /admin/system
 */
export abstract class AdminService extends ApiService {
    constructor(domainPath: string) {
        super(`/admin/system${domainPath}`);
    }
}