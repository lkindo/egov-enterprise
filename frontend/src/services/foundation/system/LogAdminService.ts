import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface LoginLog {
 logId: string;
 creatDt: string;
 loginMthd: string;
 loginId: string;
 loginNm: string;
 loginIp: string;
 errCo: number;
}

export interface SystemLog {
 requestId: string;
 jobSeCode: string;
 insttCode: string;
 occurrncDe: string;
 rqesterIp: string;
 rqesterId: string;
 trgetMenuNm: string;
 svcNm: string;
 methodNm: string;
 processSeCode: string;
 processTime: number;
 rspnsCode: string;
 errorSe: string;
 errorCo: number;
 errorMssage: string;
}

/**
 * 濡쒓렇 愿由님쒕퉬님(Admin)
 */
class LogAdminService extends AdminService {
 constructor() {
 super('/logs');
 }

 /** 濡쒓렇님濡쒓렇 紐⑸줉 조회 */
 async getLoginLogList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LoginLog>> {
 return this.get<PageResponse<LoginLog>>('/login', { ...config, params });
 }

 /** 濡쒓렇님濡쒓렇 ?곸꽭 조회 */
 async getLoginLog(id: string, config?: AxiosRequestConfig): Promise<LoginLog> {
 return this.get<LoginLog>(`/login/${id}`, config);
 }

 /** ?쒖뒪님濡쒓렇 紐⑸줉 조회 */
 async getSystemLogList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SystemLog>> {
 return this.get<PageResponse<SystemLog>>('/system', { ...config, params });
 }

 /** ?쒖뒪님濡쒓렇 ?곸꽭 조회 */
 async getSystemLog(id: string, config?: AxiosRequestConfig): Promise<SystemLog> {
 return this.get<SystemLog>(`/system/${id}`, config);
 }
}

export const logAdminService = new LogAdminService();
