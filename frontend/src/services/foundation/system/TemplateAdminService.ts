import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * 템플릿 정보 인터페이스
 */
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

  /** 템플릿 목록 조회 */
  async getTemplateList(config?: AxiosRequestConfig) {
    return this.get<TmplatInfo[]>('', config);
  }

  /** 템플릿 상세 조회 */
  async getTemplate(tmplatId: string, config?: AxiosRequestConfig) {
    return this.get<TmplatInfo>(`/${tmplatId}`, config);
  }

  /** 템플릿 등록 */
  async createTemplate(tmplatInfo: TmplatInfo, config?: AxiosRequestConfig) {
    return this.post<void>('', tmplatInfo, config);
  }
}

export const templateAdminService = new TemplateAdminService();
