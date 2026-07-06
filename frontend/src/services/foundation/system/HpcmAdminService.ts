import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface Hpcm {
  hpcmId: string;
  hpcmSe: string;
  hpcmNm: string;
  hpcmDc: string;
  hlpId?: string;
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
  async getHpcm(id: string, config?: AxiosRequestConfig): Promise<Hpcm> {
    return this.get<Hpcm>(`/${id}`, config);
  }

  /** 도움말 등록 */
  async createHpcm(data: Partial<Hpcm>, config?: AxiosRequestConfig): Promise<string> {
    return this.post<string>('', data, config);
  }

  /** 도움말 수정 */
  async updateHpcm(id: string, data: Partial<Hpcm>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${id}`, data, config);
  }

  /** 도움말 삭제 */
  async deleteHpcm(id: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${id}`, config);
  }
}

export const hpcmAdminService = new HpcmAdminService();
