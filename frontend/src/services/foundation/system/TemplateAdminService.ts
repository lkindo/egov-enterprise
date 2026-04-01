import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * ?쒗뵆由님뺣낫 ?명꽣?섏씠님 */
export interface TmplatInfo {
  tmplatId?: string;
  tmplatNm: string;
  tmplatSeCode: string;
  tmplatCours: string;
  useAt: string;
  frstRegisterId?: string;
  frstRegistPnttm?: string;
}

class TemplateAdminService extends AdminService {
  constructor() {
    super('/templates');
  }

  /** ?쒗뵆由?紐⑸줉 조회 */
  async getTemplateList(config?: AxiosRequestConfig) {
    return this.get<TmplatInfo[]>('', config);
  }

  /** ?쒗뵆由님곸꽭 조회 */
  async getTemplate(tmplatId: string, config?: AxiosRequestConfig) {
    return this.get<TmplatInfo>(`/${tmplatId}`, config);
  }

  /** ?쒗뵆由?등록 */
  async createTemplate(tmplatInfo: TmplatInfo, config?: AxiosRequestConfig) {
    return this.post<void>('', tmplatInfo, config);
  }
}

export const templateAdminService = new TemplateAdminService();
