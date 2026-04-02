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
 * 로그 관리님쒕퉬님(Admin)
 */
class LogAdminService extends AdminService {
 constructor() {
 super('/logs');
 }

 /** 로그인로그 紐⑸줉 조회 */
 async getLoginLogList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LoginLog>> {
 return this.get<PageResponse<LoginLog>>('/login', { ...config, params });
 }

 /** 로그인로그 상세 조회 */
 async getLoginLog(id: string, config?: AxiosRequestConfig): Promise<LoginLog> {
 return this.get<LoginLog>(`/login/${id}`, config);
 }

 /** 시스템로그 紐⑸줉 조회 */
 async getSystemLogList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SystemLog>> {
 return this.get<PageResponse<SystemLog>>('/system', { ...config, params });
 }

 /** 시스템로그 상세 조회 */
 async getSystemLog(id: string, config?: AxiosRequestConfig): Promise<SystemLog> {
 return this.get<SystemLog>(`/system/${id}`, config);
 }
}

export const logAdminService = new LogAdminService();
