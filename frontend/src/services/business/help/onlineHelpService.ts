import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { FaqVO, OnlineHelpSearchParams } from '@/types/business/onlineHelp';
import { AxiosRequestConfig } from 'axios';

/**
 * 온라인 헬프(FAQ) 서비스
 * 백엔드 FaqApiController 연동 (/api/v1/faqs)
 */
class OnlineHelpService extends ApiService {
  constructor() {
    super('faqs');
  }

  /** FAQ 목록 조회 */
  async getFaqList(params: OnlineHelpSearchParams, config?: AxiosRequestConfig): Promise<PageResponse<FaqVO>> {
    return this.get<PageResponse<FaqVO>>('', {
      ...config,
      params: {
        ...params,
        keyword: params.searchKeyword
      }
    });
  }

  /** FAQ 상세 조회 */
  async getFaqDetail(faqId: string, config?: AxiosRequestConfig): Promise<FaqVO> {
    return this.get<FaqVO>(`/${faqId}`, config);
  }

  /** FAQ 등록 (관리용) */
  async createFaq(faq: Partial<FaqVO>, config?: AxiosRequestConfig): Promise<string> {
    return this.post<string>('', faq, config);
  }

  /** FAQ 수정 (관리용) */
  async updateFaq(faqId: string, faq: Partial<FaqVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${faqId}`, faq, config);
  }

  /** FAQ 삭제 (관리용) */
  async deleteFaq(faqId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${faqId}`, config);
  }
}

export const onlineHelpService = new OnlineHelpService();

// Backward compatibility exports
export const getFaqList = onlineHelpService.getFaqList.bind(onlineHelpService);
export const getFaqDetail = onlineHelpService.getFaqDetail.bind(onlineHelpService);

export default onlineHelpService;
