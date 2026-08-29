import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';
import { ApiResponseLongSchema, SmsDtoSchema } from '@/types/generated-zod';

export type SmsDto = components['schemas']['SmsDto'];
type SmsRecptnDto = components['schemas']['SmsRecptnDto'];

const SmsWriteRequestSchema = SmsDtoSchema.extend({
  // 백엔드 SmsDto @NotEmpty/@Size(1..100). 생성 스키마의 required 배열을 실제 쓰기 경계까지 강화한다.
  recipients: SmsDtoSchema.shape.recipients.min(1).max(100),
});

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
  async sendSms(smsDto: SmsDto, config?: AxiosRequestConfig): Promise<number> {
    const request = SmsWriteRequestSchema.parse(smsDto);
    const response = await this.post<unknown>('', request, config);
    const smsTrsmSn = ApiResponseLongSchema.shape.data.parse(response);
    if (smsTrsmSn === undefined) throw new Error('SMS 전송 식별자가 응답에 없습니다.');
    return smsTrsmSn;
  }
}

export const smsAdminService = new SmsAdminService();
