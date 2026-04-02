import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams, UserLog, LoginLog as LoginLogType, WebLog, PrivacyLog, TransferLog } from '@/types/foundation/system';
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
 * 시스템로그 관리님쒕퉬님(Admin)
 */
class SystemLogAdminService extends AdminService {
  constructor() {
    super('/logs');
  }

  /**
   * 시스템로그 紐⑸줉 조회
   */
  async getSystemLogs(params: { page?: number; size?: number; searchWrd?: string } | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SysLog>> {
    return this.get<PageResponse<SysLog>>('/system', {
      ...config,
      params: {
        ...params,
        pageIndex: (('page' in params ? params.page : 0) || 0) + 1,
        searchKeyword: ('searchWrd' in params ? params.searchWrd : '') || '',
      },
    });
  }

  /**
   * 시스템로그 상세 조회
   */
  async getSystemLog(requstId: string, config?: AxiosRequestConfig): Promise<SysLog> {
    return this.get<SysLog>(`/system/${requstId}`, config);
  }

  /**
   * 로그인로그 紐⑸줉 조회
   */
  async getLoginLogs(params: { page?: number; size?: number; searchWrd?: string } | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LoginLog>> {
    return this.get<PageResponse<LoginLog>>('/login', {
      ...config,
      params: {
        ...params,
        pageIndex: (('page' in params ? params.page : 0) || 0) + 1,
        searchKeyword: ('searchWrd' in params ? params.searchWrd : '') || '',
      },
    });
  }

  /**
   * 로그인로그 상세 조회
   */
  async getLoginLog(logId: string, config?: AxiosRequestConfig): Promise<LoginLog> {
    return this.get<LoginLog>(`/login/${logId}`, config);
  }

  /**
   * 媛쒖씤?뺣낫 ?묎렐 로그 紐⑸줉 조회
   */
  async getPrivacyLogs(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<PrivacyLog>> {
    return this.get<PageResponse<PrivacyLog>>('/privacy', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || params.page || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }

  /**
   * 사용자로그 紐⑸줉 조회 (관리자님
   */
  async getUserLogs(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<UserLog>> {
    return this.get<PageResponse<UserLog>>('/user', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || params.page || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }

  /**
   * 님로그 紐⑸줉 조회 (HTTP 요청 님
   */
  async getWebLogs(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<WebLog>> {
    return this.get<PageResponse<WebLog>>('/web', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || params.page || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }

  /**
   * ≪닔님로그 紐⑸줉 조회
   */
  async getTransferLogs(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<TransferLog>> {
    return this.get<PageResponse<TransferLog>>('/transfer', {
      ...config,
      params: {
        ...params,
        pageIndex: params.pageIndex || params.page || 1,
        searchKeyword: params.searchKeyword || '',
      },
    });
  }
}

export const systemLogAdminService = new SystemLogAdminService();
