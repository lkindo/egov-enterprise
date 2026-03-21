import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

export interface SysLog {
  requstId: string;
  occcrrncDe: string;
  srvcNm: string;
  methodNm: string;
  processSeCode: string;
  processSeCodeNm: string;
  processTime: string;
  rqesterIp: string;
  rqesterId: string;
  rqsterNm: string;
  trgetMenuNm?: string;
}

export interface LoginLog {
  logId: string;
  creatDt: string;
  loginMthd: string;
  loginIp: string;
  loginId: string;
  loginNm: string;
}

/**
 * 시스템 로그 관리 서비스 (Admin)
 */
class SystemLogAdminService extends AdminService {
  constructor() {
    super('/logs');
  }

  /**
   * 시스템 로그 목록 조회
   */
  async getSystemLogs(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<SysLog>> {
    return this.get<PageResponse<SysLog>>('/system', {
      ...config,
      params: {
        ...params,
        pageIndex: (params.page || 0) + 1,
        searchKeyword: params.searchWrd || '',
      },
    });
  }

  /**
   * 시스템 로그 상세 조회
   */
  async getSystemLog(requstId: string, config?: AxiosRequestConfig): Promise<SysLog> {
    return this.get<SysLog>(`/system/${requstId}`, config);
  }

  /**
   * 로그인 로그 목록 조회
   */
  async getLoginLogs(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<LoginLog>> {
    return this.get<PageResponse<LoginLog>>('/login', {
      ...config,
      params: {
        ...params,
        pageIndex: (params.page || 0) + 1,
        searchKeyword: params.searchWrd || '',
      },
    });
  }

  /**
   * 로그인 로그 상세 조회
   */
  async getLoginLog(logId: string, config?: AxiosRequestConfig): Promise<LoginLog> {
    return this.get<LoginLog>(`/login/${logId}`, config);
  }

  /**
   * 개인정보 접근 로그 목록 조회
   */
  async getPrivacyLogs(params: any, config?: AxiosRequestConfig): Promise<PageResponse<any>> {
    return this.get<PageResponse<any>>('/privacy', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }

  /**
   * 사용자 로그 목록 조회 (관리자용)
   */
  async getUserLogs(params: any, config?: AxiosRequestConfig): Promise<PageResponse<any>> {
    return this.get<PageResponse<any>>('/user', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }

  /**
   * 웹 로그 목록 조회 (HTTP 요청 등)
   */
  async getWebLogs(params: any, config?: AxiosRequestConfig): Promise<PageResponse<any>> {
    return this.get<PageResponse<any>>('/web', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }

  /**
   * 송수신 로그 목록 조회
   */
  async getTransferLogs(params: any, config?: AxiosRequestConfig): Promise<PageResponse<any>> {
    return this.get<PageResponse<any>>('/transfer', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }
}

export const systemLogAdminService = new SystemLogAdminService();
