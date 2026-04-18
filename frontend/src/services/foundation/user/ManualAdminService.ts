import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

/**
 * 온라인 매뉴얼 DTO
 */
export interface ManualDto {
  onlineMnlId?: string; // 온라인매뉴얼ID
  onlineMnlNm: string; // 온라인매뉴얼명
  onlineMnlDc: string; // 온라인매뉴얼설명
  onlineMnlCours: string; // 온라인매뉴얼경로
  frstRegisterId?: string; // 최초등록자ID
  createdDate?: string; // 생성일시
}

/**
 * 온라인 매뉴얼 관리 서비스
 * 백엔드 HelpApiController (/api/v1/help/manuals)와 연동
 */
class ManualAdminService extends ApiService {
  constructor() {
    super('/help');
  }

  /**
   * 온라인 매뉴얼 목록 조회
   * @param params 검색 파라미터
   * @returns 온라인 매뉴얼 페이지 결과
   */
  public async getManualList(params: any = {}, config?: AxiosRequestConfig): Promise<PageResponse<ManualDto>> {
    return this.get<PageResponse<ManualDto>>('/manuals', { ...config, params });
  }

  /**
   * 온라인 매뉴얼 상세 조회
   * @param mnlId 매뉴얼 ID
   * @returns 온라인 매뉴얼 상세 정보
   */
  public async getManual(mnlId: string): Promise<ManualDto> {
    return this.get<ManualDto>(`/manuals/${mnlId}`);
  }

  /**
   * 온라인 매뉴얼 등록
   * @param manual 매뉴얼 정보
   * @returns 생성된 매뉴얼 ID
   */
  public async createManual(manual: ManualDto): Promise<string> {
    return this.post<string>('/manuals', manual);
  }

  /**
   * 온라인 매뉴얼 수정
   * @param mnlId 매뉴얼 ID
   * @param manual 수정할 매뉴얼 정보
   */
  public async updateManual(mnlId: string, manual: ManualDto): Promise<void> {
    return this.put<void>(`/manuals/${mnlId}`, manual);
  }

  /**
   * 온라인 매뉴얼 삭제
   * @param mnlId 매뉴얼 ID
   */
  public async deleteManual(mnlId: string): Promise<void> {
    return this.delete<void>(`/manuals/${mnlId}`);
  }
}

export const manualAdminService = new ManualAdminService();
