import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * ⑤씪님留ㅻ돱님DTO
 */
export interface ManualDto {
  onlineMnlId?: string;
  onlineMnlNm: string;
  onlineMnlDc: string;
  onlineMnlCours: string;
  frstRegisterId?: string;
  createdDate?: string;
}

class ManualAdminService extends ApiService {
  constructor() {
    super('/api/v1/help');
  }

  /** 留ㅻ돱님紐⑸줉 조회 */
  async getManualList(params?: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<ManualDto>>('/manuals', { ...config, params });
  }

  /** 留ㅻ돱님상세 조회 */
  async getManual(mnlId: string, config?: AxiosRequestConfig) {
    return this.get<ManualDto>(`/manuals/${mnlId}`, config);
  }

  /** 留ㅻ돱님등록 */
  async createManual(dto: ManualDto, config?: AxiosRequestConfig) {
    return this.post<string>('/manuals', dto, config);
  }

  /** 留ㅻ돱님?섏젙 */
  async updateManual(mnlId: string, dto: ManualDto, config?: AxiosRequestConfig) {
    return this.put<void>(`/manuals/${mnlId}`, dto, config);
  }

  /** 留ㅻ돱님님젣 */
  async deleteManual(mnlId: string, config?: AxiosRequestConfig) {
    return this.delete<void>(`/manuals/${mnlId}`, config);
  }
}

export const manualAdminService = new ManualAdminService();
