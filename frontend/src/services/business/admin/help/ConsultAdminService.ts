import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CnsltVO, CnsltSearchParams } from '@/types/business/consult';
import { AxiosRequestConfig } from 'axios';

/**
 * 상담 관리 서비스 (Admin)
 */
class ConsultAdminService extends AdminService {
  constructor() {
    super('system', 'cnslt');
  }

  /**
   * 상담 목록 조회
   */
  async getConsultations(
    params: CnsltSearchParams, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<CnsltVO>> {
    return this.get<PageResponse<CnsltVO>>('', { 
      ...config, 
      params 
    });
  }

  /**
   * 상담 상세 조회
   */
  async getConsultation(id: string, config?: AxiosRequestConfig): Promise<CnsltVO> {
    return this.get<CnsltVO>(`/${id}`, config);
  }

  /**
   * 상담 등록
   */
  async createConsultation(data: Partial<CnsltVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /**
   * 상담 답변 처리
   */
  async answerConsultation(id: string, answerCn: string, config?: AxiosRequestConfig): Promise<void> {
    return this.patch<void>(`/${id}/answer`, answerCn, {
      ...config,
      headers: { 
        ...config?.headers,
        'Content-Type': 'text/plain' 
      }
    });
  }

  /**
   * 상담 삭제
   */
  async deleteConsultation(id: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${id}`, config);
  }
}

export const consultAdminService = new ConsultAdminService();
export default consultAdminService;
