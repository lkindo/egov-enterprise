import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import {
  Survey as SurveyInfo,
  SurveyQuestion,
  SurveyAnswer,
} from '@/types/business/survey';
import type { components } from '@/types/generated-api';
import {
  deleteQuestionOperation,
  deleteItemOperation,
  deleteSurveyOperation,
  deleteTemplateOperation,
  getQuestionsOperation,
  getSurveyOperation,
  getSurveysOperation,
  getTemplatesOperation,
  getTemplateOperation,
  insertItemOperation,
  insertQuestionOperation,
  insertSurveyOperation,
  insertTemplateOperation,
  updateItemOperation,
  updateQuestionOperation,
  updateSurveyOperation,
  updateTemplateOperation,
} from '@/types/generated-operations';

/**
 * 설문 템플릿 — 백엔드 `SurveyTemplateDto` 의 생성 타입을 SSOT 로 삼는다.
 *
 * ⚠ 종전에는 `Survey as SurveyTemplate` 별칭이었다. 그러나 템플릿의 실제 필드는
 * `srvyTmpltSn`·`srvyTmpltTypeCd`·`srvyTmpltPathNm`·`srvyTmpltExpln` 로 설문(`Survey`)과
 * **전혀 겹치지 않는다**. 로그 도메인에서 수제 타입이 어긋나 화면이 빈 값을 그리던 것과 같은
 * 결함이며, 템플릿 화면이 없어서 드러나지 않고 있었을 뿐이다.
 */
export type SurveyTemplate = components['schemas']['SurveyTemplateDto'];

type SurveyPageQuery = {
  keyword?: string;
  page?: number;
  size?: number;
  sort?: string[];
};

/** 공용 SearchParams의 레거시 어휘를 Spring Pageable OpenAPI query로 한 번만 정규화한다. */
function toSurveyPageQuery(params?: SearchParams): SurveyPageQuery {
  const page = typeof params?.page === 'number'
    ? params.page
    : typeof params?.pageIndex === 'number'
      ? params.pageIndex - 1
      : typeof params?.pageNo === 'number'
        ? params.pageNo - 1
        : undefined;
  const recordCountPerPage = params?.recordCountPerPage;
  const size = typeof params?.size === 'number'
    ? params.size
    : typeof params?.pageUnit === 'number'
      ? params.pageUnit
      : typeof recordCountPerPage === 'number'
        ? recordCountPerPage
        : undefined;
  const sort = params?.sort;

  return {
    keyword: params?.keyword || params?.searchKeyword || params?.searchWrd || '',
    ...(page !== undefined ? { page } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(sort !== undefined ? { sort: sort as string[] } : {}),
  };
}

/**
 * 설문 관리 서비스 (Admin)
 */
class SurveyAdminService extends AdminService {
  constructor() {
    super('/surveys');
  }

  /** 설문 목록 조회 */
  async getSurveyList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SurveyInfo>> {
    const response = await this.executeGenerated(getSurveysOperation, {
      query: toSurveyPageQuery(params),
      config,
    });
    return response as PageResponse<SurveyInfo>;
  }

  /** 설문 상세 조회 */
  async getSurvey(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyInfo> {
    return this.executeGenerated(getSurveyOperation, {
      path: { srvySn },
      config,
    }) as Promise<SurveyInfo>;
  }

  /** 설문 등록 */
  async createSurvey(data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(insertSurveyOperation, {
      body: data as components['schemas']['SurveyInfoDto'],
      config,
    });
  }

  /** 설문 수정 */
  async updateSurvey(srvySn: number, data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateSurveyOperation, {
      path: { srvySn },
      body: data as components['schemas']['SurveyInfoDto'],
      config,
    });
  }

  /** 설문 삭제 */
  async deleteSurvey(srvySn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteSurveyOperation, {
      path: { srvySn },
      config,
    });
  }

  /** 설문 템플릿목록 조회 */
  async getTemplateList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SurveyTemplate>> {
    const response = await this.executeGenerated(getTemplatesOperation, {
      query: toSurveyPageQuery(params),
      config,
    });
    return response as PageResponse<SurveyTemplate>;
  }

  /*
    [2026-09-08 PD-SRVY-001 결정] 설문 응답자 관리 표면을 걷었다.

    `tb_srvy_rspdnt` 는 성명·성별·생년월일·전화번호를 담는 개인정보인데 응답 결과
    (`tb_srvy_rslt`)와 **ID 로 연결돼 있지 않고**(결과는 `rspns_nm` 문자열만) 행을 만드는
    코드 경로가 저장소에 없어 구조적으로 비어 있었다 — 즉 이 화면은 **항상 빈 목록을 보여주는
    개인정보 화면**이었다. 서버 API 5본과 화면도 함께 제거했다.

    엔티티·리포지토리는 남는다(설문 템플릿 변경 가드가 existsBySrvySn 을 쓴다). 테이블 자체의
    처분은 파괴적 DB 변경이라 별도 승인 경계다.
  */

  // --- 템플릿 CRUD ---

  async getSurveyTemplate(srvyTmpltSn: number, config?: AxiosRequestConfig): Promise<SurveyTemplate> {
    return this.executeGenerated(getTemplateOperation, { path: { srvyTmpltSn }, config });
  }

  async createTemplate(data: Partial<SurveyTemplate>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(insertTemplateOperation, { body: data, config });
  }

  async updateTemplate(srvyTmpltSn: number, data: Partial<SurveyTemplate>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateTemplateOperation, {
      path: { srvyTmpltSn },
      body: data,
      config,
    });
  }

  async deleteTemplate(srvyTmpltSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteTemplateOperation, {
      path: { srvyTmpltSn },
      config,
    });
  }

  // --- 문항·항목 CRUD ---

  /**
   * 설문의 문항 목록. **항목까지 중첩해서 온다** — 백엔드가 단일 IN 조회로 묶어 주므로
   * 문항별 항목 조회를 따로 호출하면 안 된다(N+1 을 프론트에서 되살리는 셈이다).
   */
  async getQuestions(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyQuestion[]> {
    return this.executeGenerated(getQuestionsOperation, {
      path: { srvySn },
      config,
    }) as Promise<SurveyQuestion[]>;
  }

  async createQuestion(srvySn: number, data: Partial<SurveyQuestion>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(insertQuestionOperation, {
      path: { srvySn },
      body: data,
      config,
    });
  }

  async updateQuestion(
    srvySn: number,
    srvyQstnSn: number,
    data: Partial<SurveyQuestion>,
    config?: AxiosRequestConfig
  ): Promise<void> {
    return this.executeGenerated(updateQuestionOperation, {
      path: { srvySn, srvyQstnSn },
      body: data,
      config,
    });
  }

  async deleteQuestion(srvySn: number, srvyQstnSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteQuestionOperation, {
      path: { srvySn, srvyQstnSn },
      config,
    });
  }

  /** 항목은 문항 하위 자원이다 — 경로가 소속 문항을 강제한다. */
  async createItem(srvyQstnSn: number, data: Partial<SurveyAnswer>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(insertItemOperation, {
      path: { srvyQstnSn },
      body: data,
      config,
    });
  }

  async updateItem(srvyArtclSn: number, data: Partial<SurveyAnswer>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateItemOperation, {
      path: { srvyArtclSn },
      body: data,
      config,
    });
  }

  async deleteItem(srvyArtclSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteItemOperation, {
      path: { srvyArtclSn },
      config,
    });
  }
}

export const surveyAdminService = new SurveyAdminService();
