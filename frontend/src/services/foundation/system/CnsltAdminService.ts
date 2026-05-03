import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/foundation/system';
import { CnsltVO as Consult } from '@/types/business/consult';

/**
 * ?곷떞 관리님쒕퉬님(Admin)
 */
class CnsltAdminService extends AdminService {
  constructor() {
    super('/cnslt');
  }

  /** ?곷떞 목록 조회 */
  async getConsultationList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PaginationResponse<Consult>> {
    return this.get<PaginationResponse<Consult>>('', { ...config, params });
  }

  /** ?곷떞 상세 조회 */
  async getConsultation(cnsltId: string, config?: AxiosRequestConfig): Promise<Consult> {
    return this.get<Consult>(`/${cnsltId}`, config);
  }

  /** ?곷떞 ?듬? 등록 */
  async answerConsultation(cnsltId: string, data: Partial<Consult>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${cnsltId}/answer`, data, config);
  }

  /** ?곷떞 님젣 */
  async deleteConsultation(cnsltId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${cnsltId}`, config);
  }
}

export const cnsltAdminService = new CnsltAdminService();
