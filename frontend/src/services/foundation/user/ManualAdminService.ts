import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/modernization';
import { AxiosRequestConfig } from 'axios';


/**
 * 온라인 매뉴얼 DTO
 */
export interface ManualDto {
  onlnMnlSn?: number; // 온라인매뉴얼일련번호
  onlnMnlNm: string; // 온라인매뉴얼명
  onlnMnlExpln: string; // 온라인매뉴얼설명
  onlnMnlDfn: string; // 온라인매뉴얼경로(정의)
  onlnMnlSeCd?: string; // 온라인매뉴얼구분코드
  createdBy?: string; // 최초등록자ID
  crtDt?: string; // 생성일시
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
  public async getManualList(params: unknown = {}, config?: AxiosRequestConfig): Promise<PageResponse<ManualDto>> {
    return this.get<PageResponse<ManualDto>>('/manuals', { ...config, params });
  }

  /**
   * 온라인 매뉴얼 상세 조회
   * @param onlnMnlSn 매뉴얼 일련번호
   * @returns 온라인 매뉴얼 상세 정보
   */
  public async getManual(onlnMnlSn: number): Promise<ManualDto> {
    return this.get<ManualDto>(`/manuals/${onlnMnlSn}`);
  }

  /**
   * 온라인 매뉴얼 등록
   * @param manual 매뉴얼 정보
   * @returns 생성된 매뉴얼 ID
   */
  public async createManual(manual: ManualDto): Promise<number> {
    return this.post<number>('/manuals', manual);
  }

  /**
   * 온라인 매뉴얼 수정
   * @param onlnMnlSn 매뉴얼 일련번호
   * @param manual 수정할 매뉴얼 정보
   */
  public async updateManual(onlnMnlSn: number, manual: ManualDto): Promise<void> {
    return this.put<void>(`/manuals/${onlnMnlSn}`, manual);
  }

  /**
   * 온라인 매뉴얼 삭제
   * @param onlnMnlSn 매뉴얼 일련번호
   */
  public async deleteManual(onlnMnlSn: number): Promise<void> {
    return this.delete<void>(`/manuals/${onlnMnlSn}`);
  }
}

export const manualAdminService = new ManualAdminService();
