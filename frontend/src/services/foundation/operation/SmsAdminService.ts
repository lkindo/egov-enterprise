import type { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import type { PageResponse } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';
import {
  getSmsListOperation,
  getSmsOperation,
  getSmsRecipientsOperation,
  sendSmsOperation,
} from '@/types/generated-operations';

export type SmsDto = components['schemas']['SmsDto'];
type SmsRecptnDto = components['schemas']['SmsRecptnDto'];
type SmsSearchParams = NonNullable<operations['getSmsList']['parameters']['query']>;

function requireSmsPage(
  response: {
    list?: SmsDto[];
    total?: number;
    page?: number;
    size?: number;
    totalPage?: number;
  },
): PageResponse<SmsDto> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('SMS 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list,
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

class SmsAdminService extends ApiService {
  constructor() {
    super('/admin/operation/sms');
  }

  /** SMS 발송 내역 조회 */
  async getSmsList(params: SmsSearchParams = {}, config?: AxiosRequestConfig): Promise<PageResponse<SmsDto>> {
    const response = await this.executeGenerated(getSmsListOperation, { query: params, config });
    return requireSmsPage(response);
  }

  /** SMS 상세 조회 */
  async getSms(smsTrsmSn: number, config?: AxiosRequestConfig): Promise<SmsDto> {
    return this.executeGenerated(getSmsOperation, { path: { smsTrsmSn }, config });
  }

  /** SMS 수신자 목록 조회 */
  async getSmsRecipients(smsTrsmSn: number, config?: AxiosRequestConfig): Promise<SmsRecptnDto[]> {
    return this.executeGenerated(getSmsRecipientsOperation, { path: { smsTrsmSn }, config });
  }

  /** SMS 발송 실행 */
  async sendSms(smsDto: SmsDto, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(sendSmsOperation, { body: smsDto, config });
  }
}

export const smsAdminService = new SmsAdminService();
