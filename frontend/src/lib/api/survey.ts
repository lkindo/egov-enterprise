import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { QustnrRespondInfo, SurveyResultStats } from '@/types/business/survey';
import type { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';
import {
  deleteResponseOperation,
  getResponseOperation,
  getResponsesOperation,
  getStatsOperation,
} from '@/types/generated-operations';

/**
 * 설문 응답(`tb_srvy_rslt`) API.
 *
 * 백엔드는 D-4 3단계에서 신설했다. 그 전까지 이 파일의 4개 중 3개는 존재하지 않는 경로를
 * 가리켰고, 화면이 `as any` 로 받아 **조용히 빈 목록**을 그려 그 사실이 드러나지 않았다.
 */

function requireSurveyResponse(
  item: components['schemas']['SurveyResultDto'],
): QustnrRespondInfo {
  if (
    typeof item.srvyRspnsSn !== 'number'
    || typeof item.srvySn !== 'number'
    || typeof item.srvyTmpltSn !== 'number'
    || typeof item.srvyQstnSn !== 'number'
    || typeof item.srvyArtclSn !== 'number'
    || (item.rspdntAnsCn !== null && typeof item.rspdntAnsCn !== 'string')
    || (item.rspnsNm !== null && typeof item.rspnsNm !== 'string')
    || (item.etcAnsCn !== null && typeof item.etcAnsCn !== 'string')
    || (item.frstRgtrId !== null && typeof item.frstRgtrId !== 'string')
    || (item.crtDt !== null && typeof item.crtDt !== 'string')
  ) {
    throw new Error('설문 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    srvyRspnsSn: item.srvyRspnsSn,
    srvySn: item.srvySn,
    srvyTmpltSn: item.srvyTmpltSn,
    srvyQstnSn: item.srvyQstnSn,
    srvyArtclSn: item.srvyArtclSn,
    rspdntAnsCn: item.rspdntAnsCn ?? '',
    rspnsNm: item.rspnsNm ?? '',
    etcAnsCn: item.etcAnsCn ?? '',
    frstRgtrId: item.frstRgtrId ?? '',
    crtDt: item.crtDt ?? '',
  };
}

function requireSurveyResponsePage(
  page: components['schemas']['PageResponseSurveyResultDto'],
): PageResponse<QustnrRespondInfo> {
  if (
    !Array.isArray(page.list)
    || typeof page.total !== 'number'
    || typeof page.page !== 'number'
    || typeof page.size !== 'number'
    || typeof page.totalPage !== 'number'
  ) {
    throw new Error('설문 응답 목록이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: page.list.map(requireSurveyResponse),
    total: page.total,
    page: page.page,
    size: page.size,
    totalPage: page.totalPage,
  };
}

function requireSurveyStats(
  item: components['schemas']['SurveyStatsDto'],
): SurveyResultStats {
  if (
    typeof item.srvyQstnSn !== 'number'
    || typeof item.qstnCn !== 'string'
    || typeof item.qstnTypeCd !== 'string'
    || typeof item.srvyArtclSn !== 'number'
    || typeof item.count !== 'number'
    || typeof item.percentage !== 'number'
  ) {
    throw new Error('설문 통계가 필수 계약과 일치하지 않습니다.');
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

/** 설문 응답 목록 (관리자). 응답자명 부분일치 검색. */
export const getQustnrRespondInfoList = async (
  params: { keyword?: string; page?: number; size?: number } = {}
): Promise<PageResponse<QustnrRespondInfo>> => {
  const response = await executeGeneratedOperation(getResponsesOperation, { query: params });
  return requireSurveyResponsePage(response);
};

export const getQustnrRespondInfoDetail = async (srvyRspnsSn: number): Promise<QustnrRespondInfo> => {
  const response = await executeGeneratedOperation(getResponseOperation, { path: { srvyRspnsSn } });
  return requireSurveyResponse(response);
};

/** 응답 삭제는 백엔드가 `@AdminOnly` 다 — ADMIN 이 아니면 403. */
export const deleteQustnrRespondInfo = async (srvyRspnsSn: number): Promise<void> => {
  return executeGeneratedOperation(deleteResponseOperation, { path: { srvyRspnsSn } });
};

/** 문항별 항목 응답 분포. 화면 2곳(`/survey/stats`·`/survey/[id]`)이 같은 형태를 렌더한다. */
export const getSurveyStats = async (data: { srvySn: number }): Promise<SurveyResultStats[]> => {
  const response = await executeGeneratedOperation(getStatsOperation, { path: { srvySn: data.srvySn } });
  return response.map(requireSurveyStats);
};
