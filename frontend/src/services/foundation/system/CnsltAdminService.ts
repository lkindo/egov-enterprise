import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/foundation/system';
import { CnsltVO as Consult } from '@/types/business/consult';

/**
 * 상담 관리 서비스 (Admin)
 */
class CnsltAdminService extends AdminService {
  constructor() {
    super('/cnslt');
  }

  /** 상담 목록 조회 */
  async getConsultationList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<Consult>> {
    return this.get<PaginationResponse<Consult>>('', { ...config, params });
  }

  /** 상담 상세 조회 */
  async getConsultation(dscsnId: string, config?: AxiosRequestConfig): Promise<Consult> {
    return this.get<Consult>(`/${dscsnId}`, config);
  }

  /** 상담 답변 등록 */
  async answerConsultation(dscsnId: string, data: Partial<Consult>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${dscsnId}/answer`, data, config);
  }

  /** 상담 삭제 */
  async deleteConsultation(dscsnId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${dscsnId}`, config);
  }
}

export const cnsltAdminService = new CnsltAdminService();
