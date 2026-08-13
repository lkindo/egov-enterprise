import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface Hpcm {
  hlpSn?: number;
  hlpSeCd?: string;
  hlpDfn?: string;
  hlpExpln?: string;
  frstRgtrId?: string;
  lastMdfrId?: string;
}

class HpcmAdminService extends ApiService {
  constructor() {
    super('help/hpcm'); // /api/v1/help/hpcm
  }

  /** 도움말 목록 조회 */
  async getHpcmList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Hpcm>> {
    return this.get<PageResponse<Hpcm>>('', { ...config, params });
  }

  /** 도움말 상세 조회 */
  async getHpcm(hlpSn: number, config?: AxiosRequestConfig): Promise<Hpcm> {
    return this.get<Hpcm>(`/${hlpSn}`, config);
  }

  /** 도움말 등록 */
  async createHpcm(data: Partial<Hpcm>, config?: AxiosRequestConfig): Promise<number> {
    return this.post<number>('', data, config);
  }

  /** 도움말 수정 */
  async updateHpcm(hlpSn: number, data: Partial<Hpcm>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${hlpSn}`, data, config);
  }

  /** 도움말 삭제 */
  async deleteHpcm(hlpSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${hlpSn}`, config);
  }
}

export const hpcmAdminService = new HpcmAdminService();
