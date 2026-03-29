import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 온라인 매뉴얼 DTO
 */
export interface ManualDto {
  onlineMnlId?: string;
  onlineMnlNm: string;
  onlineMnlDc: string;
  onlineMnlCours: string;
  frstRegisterId?: string;
  frstRegistPnttm?: string;
}

class ManualAdminService extends ApiService {
  constructor() {
    super('/api/v1/help');
  }

  /** 매뉴얼 목록 조회 */
  async getManualList(params?: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<ManualDto>>('/manuals', { ...config, params });
  }

  /** 매뉴얼 상세 조회 */
  async getManual(mnlId: string, config?: AxiosRequestConfig) {
    return this.get<ManualDto>(`/manuals/${mnlId}`, config);
  }

  /** 매뉴얼 등록 */
  async createManual(dto: ManualDto, config?: AxiosRequestConfig) {
    return this.post<string>('/manuals', dto, config);
  }

  /** 매뉴얼 수정 */
  async updateManual(mnlId: string, dto: ManualDto, config?: AxiosRequestConfig) {
    return this.put<void>(`/manuals/${mnlId}`, dto, config);
  }

  /** 매뉴얼 삭제 */
  async deleteManual(mnlId: string, config?: AxiosRequestConfig) {
    return this.delete<void>(`/manuals/${mnlId}`, config);
  }
}

export const manualAdminService = new ManualAdminService();
