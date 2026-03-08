import client from '@/lib/api/client';
import type { AxiosRequestConfig } from 'axios';

/**
 * 疫꿸퀡??API ??뺥돩???????
 * ??뺥돩???袁⑥컭?紐껎?疫꿸퀡??野껋럥以?basePath)??筌╈돦??酉鍮??덈뼄.
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
 * ????癒?뒠 ??뺥돩??甕곗쥙???????? * 疫꿸퀡??野껋럥以? /... (?袁⑹뒄???怨뺤뵬 筌왖??
 */
export abstract class UserService extends ApiService {
    constructor(domainPath: string) {
        super(`${domainPath}`);
    }
}

/**
 * ?온?귐딆쁽????뽯뮞????뺥돩??甕곗쥙???????? * 疫꿸퀡??野껋럥以? /admin/system
 */
export abstract class AdminService extends ApiService {
    constructor(domainPath: string) {
        super(`/admin/system${domainPath}`);
    }
}
