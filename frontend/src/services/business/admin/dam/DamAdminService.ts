import { AdminService } from '@/services/core/ApiService';
import { KnoManagementVO, KnoSearchParams } from '@/types/business/dam';
import { PageResponse } from '@/services/core/ApiService';
import { AxiosRequestConfig } from 'axios';

/**
 * 지식 정보 관리 (DAM) 어드민 서비스
 */
export class DamAdminService extends AdminService {
  constructor() {
    // Backend API mapping: /admin/digital-assets
    super('digital-assets');
  }

  /**
   * 지식 정보 목록 조회
   */
  async getKnoList(
    params: KnoSearchParams = {}, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<KnoManagementVO>> {
    return this.get<PageResponse<KnoManagementVO>>('', { 
      ...config, 
      params 
    });
  }

  /**
   * 지식 정보 상세 조회
   */
  async getKnoDetail(
    knoId: string, 
    config?: AxiosRequestConfig
  ): Promise<KnoManagementVO> {
    return this.get<KnoManagementVO>(`/${knoId}`, config);
  }

  /**
   * 지식 정보 등록
   */
  async createKno(
    data: Partial<KnoManagementVO>, 
    config?: AxiosRequestConfig
  ): Promise<void> {
    return this.post('', data, config);
  }

  /**
   * 지식 정보 수정
   */
  async updateKno(
    knoId: string, 
    data: Partial<KnoManagementVO>, 
    config?: AxiosRequestConfig
  ): Promise<void> {
    return this.put(`/${knoId}`, data, config);
  }

  /**
   * 지식 정보 삭제
   */
  async deleteKno(
    knoId: string, 
    config?: AxiosRequestConfig
  ): Promise<void> {
    return this.delete(`/${knoId}`, config);
  }
}

export const damAdminService = new DamAdminService();
