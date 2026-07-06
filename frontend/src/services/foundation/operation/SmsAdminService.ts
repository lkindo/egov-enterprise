import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * SMS 전송 내역 DTO
 */
export interface SmsDto {
  smsId?: string;
  sndngTelno: string; // 발신 번호
  sndngCn: string;    // 발신 내용
  trnsmitPnttm?: string;
  frstRgtrId?: string;
  crtDt?: string;
  rcptnTelno?: string;  // 수신 번호 (단일 수신 시 사용)
  recipients?: SmsRecptnDto[]; // 수신자 목록 (다중 수신 시 사용)
}

/**
 * SMS 수신 정보 DTO
 */
interface SmsRecptnDto {
  smsId?: string;
  rcptnTelno: string; // 수신 번호
  rsltCd?: string; // 결과 코드 (P: 대기, S: 성공, F: 실패)
  rsltMsg?: string;
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

  /** SMS 발송 실행 */
  async sendSms(smsDto: SmsDto, config?: AxiosRequestConfig) {
    return this.post<string>('', smsDto, config);
  }
}

export const smsAdminService = new SmsAdminService();
