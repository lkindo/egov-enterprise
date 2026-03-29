import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * SMS 통계 DTO
 */
export interface SmsDto {
  smsId?: string;
  trnsmitTelno: string;
  trnsmitCn: string;
  trnsmitPnttm?: string;
  frstRegisterId?: string;
  frstRegistPnttm?: string;
  recptnTelno?: string; // 발송 시 사용할 수 있음
  recipients?: SmsRecptnDto[];
}

/**
 * SMS 수신자 DTO
 */
export interface SmsRecptnDto {
  smsId: string;
  recptnTelno: string;
  resultCode?: string;
  resultMssage?: string;
}

class SmsAdminService extends ApiService {
  constructor() {
    super('/admin/operation/sms');
  }

  /** SMS 발송 내역 조회 */
  async getSmsList(params?: { searchCondition?: string; searchKeyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<SmsDto>>('', { ...config, params });
  }

  /** SMS 상세 조회 */
  async getSms(smsId: string, config?: AxiosRequestConfig) {
    return this.get<SmsDto>(`/${smsId}`, config);
  }

  /** SMS 수신자 목록 조회 */
  async getSmsRecipients(smsId: string, config?: AxiosRequestConfig) {
    return this.get<SmsRecptnDto[]>(`/${smsId}/recipients`, config);
  }

  /** SMS 발송 */
  async sendSms(smsDto: SmsDto, config?: AxiosRequestConfig) {
    return this.post<string>('', smsDto, config);
  }
}

export const smsAdminService = new SmsAdminService();
