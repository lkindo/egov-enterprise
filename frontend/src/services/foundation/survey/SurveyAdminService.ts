import type { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import type {
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponseSubmit,
  SurveyResultStats,
} from '@/types/business/survey';
import type { PageResponse } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';
import {
  getQuestions_1Operation,
  getStatsOperation,
  getSurvey_1Operation,
  getSurveys_1Operation,
  submitOperation,
} from '@/types/generated-operations';

type SurveySearchParams = NonNullable<operations['getSurveys_1']['parameters']['query']>;

function requireSurvey(item: components['schemas']['SurveyInfoDto']): Survey {
  if (
    typeof item.srvySn !== 'number'
    || typeof item.srvyTtl !== 'string'
    || typeof item.srvyPrps !== 'string'
    || typeof item.srvyWrtGdCn !== 'string'
    || typeof item.srvyTrgt !== 'string'
    || typeof item.srvyBgngYmd !== 'string'
    || typeof item.srvyEndYmd !== 'string'
    || typeof item.srvyTmpltSn !== 'number'
    || typeof item.crtDt !== 'string'
  ) {
    throw new Error('설문 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    srvySn: item.srvySn,
    srvyTtl: item.srvyTtl,
    srvyPrps: item.srvyPrps,
    srvyWrtGdCn: item.srvyWrtGdCn,
    srvyTrgt: item.srvyTrgt,
    srvyBgngYmd: item.srvyBgngYmd,
    srvyEndYmd: item.srvyEndYmd,
    srvyTmpltSn: item.srvyTmpltSn,
    ...(item.frstRgtrId === undefined ? {} : { frstRgtrId: item.frstRgtrId }),
    crtDt: item.crtDt,
  };
}

function requireSurveyAnswer(item: components['schemas']['SurveyArticleDto']): SurveyAnswer {
  if (
    typeof item.srvyArtclSn !== 'number'
    || typeof item.srvyQstnSn !== 'number'
    || typeof item.srvySn !== 'number'
    || typeof item.artclSn !== 'number'
    || typeof item.artclCn !== 'string'
    || typeof item.etcAnsYn !== 'string'
    || typeof item.srvyTmpltSn !== 'number'
    || typeof item.frstRgtrId !== 'string'
    || typeof item.crtDt !== 'string'
  ) {
    throw new Error('설문 항목 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    srvyArtclSn: item.srvyArtclSn,
    srvyQstnSn: item.srvyQstnSn,
    srvySn: item.srvySn,
    artclSn: item.artclSn,
    artclCn: item.artclCn,
    etcAnsYn: item.etcAnsYn,
    srvyTmpltSn: item.srvyTmpltSn,
    frstRgtrId: item.frstRgtrId,
    crtDt: item.crtDt,
  };
}

function requireSurveyQuestion(item: components['schemas']['SurveyQuestionDto']): SurveyQuestion {
  if (
    typeof item.srvyQstnSn !== 'number'
    || typeof item.srvySn !== 'number'
    || typeof item.qstnSn !== 'number'
    || typeof item.qstnTypeCd !== 'string'
    || typeof item.qstnCn !== 'string'
    || typeof item.maxChcCnt !== 'number'
    || typeof item.srvyTmpltSn !== 'number'
    || typeof item.frstRgtrId !== 'string'
    || typeof item.crtDt !== 'string'
    || !Array.isArray(item.items)
  ) {
    throw new Error('설문 문항 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    srvyQstnSn: item.srvyQstnSn,
    srvySn: item.srvySn,
    qstnSn: item.qstnSn,
    qstnTypeCd: item.qstnTypeCd,
    qstnCn: item.qstnCn,
    maxChcCnt: item.maxChcCnt,
    srvyTmpltSn: item.srvyTmpltSn,
    frstRgtrId: item.frstRgtrId,
    crtDt: item.crtDt,
    items: item.items.map(requireSurveyAnswer),
  };
}

function requireSurveyStats(item: components['schemas']['SurveyStatsDto']): SurveyResultStats {
  if (
    typeof item.srvyQstnSn !== 'number'
    || typeof item.qstnCn !== 'string'
    || typeof item.qstnTypeCd !== 'string'
    || typeof item.srvyArtclSn !== 'number'
    || typeof item.count !== 'number'
    || typeof item.percentage !== 'number'
  ) {
    throw new Error('설문 통계 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    srvyQstnSn: item.srvyQstnSn,
    qstnCn: item.qstnCn,
    qstnTypeCd: item.qstnTypeCd,
    srvyArtclSn: item.srvyArtclSn,
    ...(item.artclCn === undefined ? {} : { artclCn: item.artclCn }),
    count: item.count,
    percentage: item.percentage,
  };
}

function requireSurveyPage(
  response: {
    list?: components['schemas']['SurveyInfoDto'][];
    total?: number;
    page?: number;
    size?: number;
    totalPage?: number;
  },
): PageResponse<Survey> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('설문 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list.map(requireSurvey),
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/** 설문 관리 서비스 (Admin). */
class SurveyAdminService extends ApiService {
  constructor() {
    super('/surveys');
  }

  async getSurveys(
    params: SurveySearchParams,
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<Survey>> {
    const response = await this.executeGenerated(getSurveys_1Operation, { query: params, config });
    return requireSurveyPage(response);
  }

  async getSurvey(srvySn: number, config?: AxiosRequestConfig): Promise<Survey> {
    const response = await this.executeGenerated(getSurvey_1Operation, { path: { srvySn }, config });
    return requireSurvey(response);
  }

  async getQuestions(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyQuestion[]> {
    const response = await this.executeGenerated(getQuestions_1Operation, { path: { srvySn }, config });
    return response.map(requireSurveyQuestion);
  }

  async submitAnswers(
    srvySn: number,
    payload: SurveyResponseSubmit,
    config?: AxiosRequestConfig,
  ): Promise<number> {
    return this.executeGenerated(submitOperation, { path: { srvySn }, body: payload, config });
  }

  async getStats(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyResultStats[]> {
    const response = await this.executeGenerated(getStatsOperation, { path: { srvySn }, config });
    return response.map(requireSurveyStats);
  }
}

export const surveyAdminService = new SurveyAdminService();
