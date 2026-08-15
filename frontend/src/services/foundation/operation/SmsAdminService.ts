import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';

export type SmsDto = components['schemas']['SmsDto'];
type SmsRecptnDto = components['schemas']['SmsRecptnDto'];

class SmsAdminService extends ApiService {
  constructor() {
    super('/admin/operation/sms');
  }

  /** SMS 발송 내역 조회 */
  async getSmsList(params?: { searchCondition?: string; searchKeyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<SmsDto>>('', { ...config, params });
  }

  /** SMS 상세 조회 */
  async getSms(smsTrsmSn: number, config?: AxiosRequestConfig) {
    return this.get<SmsDto>(`/${smsTrsmSn}`, config);
  }

  /** SMS 수신자 목록 조회 */
  async getSmsRecipients(smsTrsmSn: number, config?: AxiosRequestConfig) {
    return this.get<SmsRecptnDto[]>(`/${smsTrsmSn}/recipients`, config);
  }

  /** SMS 발송 실행 */
  async sendSms(smsDto: SmsDto, config?: AxiosRequestConfig) {
    return this.post<number>('', smsDto, config);
  }
}

export const smsAdminService = new SmsAdminService();
