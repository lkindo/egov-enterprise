import type { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { copyPageResponse } from '@/services/core/page-response';
import type {
  Survey,
  SurveyAnswer,
  SurveyQuestion,
  SurveyResponseSubmit,
} from '@/types/business/survey';
import type { PageResponse } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';
import {
  getQuestions_1Operation,
  getSurvey_1Operation,
  getSurveys_1Operation,
  submitOperation,
} from '@/types/generated-operations';

type SurveySearchParams = NonNullable<operations['getSurveys_1']['parameters']['query']>;

function requireSurvey(item: components['schemas']['SurveyInfoDto']): Survey {
  if (
    typeof item.srvySn !== 'number'
    || typeof item.srvyTtl !== 'string'
    || (item.srvyPrps != null && typeof item.srvyPrps !== 'string')
    || (item.srvyWrtGdCn != null && typeof item.srvyWrtGdCn !== 'string')
    || (item.srvyTrgt != null && typeof item.srvyTrgt !== 'string')
    || (item.srvyBgngYmd != null && typeof item.srvyBgngYmd !== 'string')
    || (item.srvyEndYmd != null && typeof item.srvyEndYmd !== 'string')
    || typeof item.srvyTmpltSn !== 'number'
    || (item.frstRgtrId != null && typeof item.frstRgtrId !== 'string')
    || (item.crtDt != null && typeof item.crtDt !== 'string')
  ) {
    throw new Error('설문 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    srvySn: item.srvySn,
    srvyTtl: item.srvyTtl,
    // 서버 DTO의 미입력(null/누락)은 빈 텍스트로 정규화해 목록 전체를 숨기지 않는다.
    srvyPrps: item.srvyPrps ?? '',
    srvyWrtGdCn: item.srvyWrtGdCn ?? '',
    srvyTrgt: item.srvyTrgt ?? '',
    srvyBgngYmd: item.srvyBgngYmd ?? '',
    srvyEndYmd: item.srvyEndYmd ?? '',
    srvyTmpltSn: item.srvyTmpltSn,
    ...(item.frstRgtrId == null ? {} : { frstRgtrId: item.frstRgtrId }),
    crtDt: item.crtDt ?? '',
    // [2026-10-01] 서버가 판정한 응답 여부를 버리지 않는다 — 목록의 '응답 완료' 표시가 이 값을 읽는다.
    ...(typeof item.responded === 'boolean' ? { responded: item.responded } : {}),
    // [결정 21] 작성 중(N)인 설문은 편집 권한자에게만 오며, 목록이 그 사실을 표시한다.
    ...(typeof item.rlsYn === 'string' ? { rlsYn: item.rlsYn } : {}),
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

/**
 * 설문 참여 서비스 — 응답자 화면(`/survey`)이 설문 목록·상세·문항을 읽고 응답을 제출한다.
 * 설문·문항·템플릿을 고치는 관리 서비스는 `foundation/system/SurveyAdminService` 다. 결과 통계는
 * `lib/api/survey` 의 `getSurveyStats` 가 소유한다.
 */
class SurveyParticipationService extends ApiService {
  async getSurveys(
    params: SurveySearchParams,
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<Survey>> {
    const response = await this.executeGenerated(getSurveys_1Operation, { query: params, config });
    return copyPageResponse(response, '설문', requireSurvey);
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
}

export const surveyParticipationService = new SurveyParticipationService();
