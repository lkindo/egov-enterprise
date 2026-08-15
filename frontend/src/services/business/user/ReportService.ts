import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';
import { AxiosRequestConfig } from 'axios';

type WorkReportDto = components['schemas']['WorkReportDto'];

/** 화면에서 리소스 경로에 쓰는 자동 생성 일련번호가 존재하는 조회 결과 타입. */
export type WorkReport = WorkReportDto & Required<Pick<WorkReportDto, 'rptpSn'>>;

/**
 * 보고 관리 서비스 (User)
 */
class ReportService extends ApiService {
  constructor() {
    super('/work-reports');
  }

  /**
   * 보고 목록 조회
   */
  async getReports(
    params: { pageIndex?: number; pageUnit?: number; searchWrd?: string },
    config?: AxiosRequestConfig
  ): Promise<PageResponse<WorkReport>> {
    // ⚠ 서버는 @ModelAttribute BaseSearchDto 로 받아 searchKeyword/pageIndex/pageUnit 을 읽는다.
    //   종전에는 searchWrd/page/size 를 보냈다 — searchWrd 는 어떤 필드에도 바인딩되지 않아
    //   검색이 서버에 아예 도달하지 못했고(무음 실패), size 는 ApiService 가
    //   recordCountPerPage 로 바꿔 보내지만 컨트롤러가 pageUnit 을 읽어 무시됐다(10건 고정).
    //   호출부의 어휘(searchWrd)는 유지하되 여기서 서버 이름으로 옮겨 담는다.
    return this.get<PageResponse<WorkReport>>('', {
      ...config,
      params: {
        pageIndex: params.pageIndex ?? 1,
        pageUnit: params.pageUnit ?? 10,
        ...(params.searchWrd ? { searchKeyword: params.searchWrd } : {}),
      },
    });
  }

  /**
   * 보고 상세 조회
   */
  async getReport(rptpSn: number, config?: AxiosRequestConfig): Promise<WorkReport> {
    return this.get<WorkReport>(`/${rptpSn}`, config);
  }

  /**
   * 보고 등록
   */
  async createReport(data: Partial<WorkReport>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /**
   * 보고 수정 — 작성자 본인 또는 관리자만 가능하다(서버에서 검증).
   */
  async updateReport(rptpSn: number, data: Partial<WorkReport>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${rptpSn}`, data, config);
  }

  /**
   * 보고 삭제 — 작성자 본인 또는 관리자만 가능하다(서버에서 검증).
   */
  async deleteReport(rptpSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${rptpSn}`, config);
  }

  // [제거됨] confirmReport(승인/반려)
  //   `PUT /work-reports/{rptpSn}/confirm` 을 호출했으나 그런 엔드포인트는 백엔드에 존재하지 않고,
  //   프론트에도 호출자가 0이었다. 있지도 않은 기능을 있는 것처럼 보이게 하는 死코드라 삭제한다.
  //   승인 흐름이 필요해지면 백엔드 엔드포인트부터 만들고 다시 추가할 것.
}

export const reportService = new ReportService();
