import client from './client';
import { QustnrRespondInfo, SurveyResultStats } from '@/types/business/survey';
import type { PageResponse } from '@/types/foundation/system';

/**
 * 설문 응답(`tb_srvy_rslt`) 조회 API.
 *
 * ⚠ 아래 4개 중 목록을 제외한 3개는 **백엔드 엔드포인트가 아직 없다**(D-4 3단계에서 신설 예정).
 * 호출하면 404 가 나고 화면은 오류 상태를 표시한다 — 의도된 정직한 실패다.
 * 종전에는 반환 타입이 `unknown`/부정확이라 화면이 `as any` 로 받아 **조용히 빈 목록**을 그렸고,
 * 그 탓에 "엔드포인트가 없다" 는 사실이 화면에서 드러나지 않았다.
 */

/**
 * 설문 응답 목록.
 *
 * ⚠ 현재 `/surveys`(설문 *정의* 목록)를 가리킨다 — 응답 목록 엔드포인트가 없기 때문이다.
 * 3단계에서 신설 후 경로를 교체한다. 타입은 화면이 실제로 기대하는 응답(`QustnrRespondInfo`)
 * 기준으로 선언해 두어, 경로 교체 시 화면이 그대로 맞물리게 한다.
 */
export const getQustnrRespondInfoList = async (
  params: { keyword?: string; page?: number; size?: number } = {}
): Promise<PageResponse<QustnrRespondInfo>> => {
  return client.get<PageResponse<QustnrRespondInfo>>('/surveys', {
    params,
    headers: { Accept: 'application/json' },
  });
};

export const getQustnrRespondInfoDetail = async (id: string): Promise<QustnrRespondInfo> => {
  return client.get<QustnrRespondInfo>(`/survey/response/${id}`);
};

export const deleteQustnrRespondInfo = async (id: string): Promise<void> => {
  return client.delete(`/survey/response/${id}`);
};

/** 문항별 항목 응답 분포. 화면 2곳(`/survey/stats`·`/survey/[id]`)이 같은 형태를 렌더한다. */
export const getSurveyStats = async (data: {
  srvyId: string;
  srvyTmpltId?: string;
  type?: string;
}): Promise<SurveyResultStats[]> => {
  return client.get<SurveyResultStats[]>('/survey/stats', { params: data });
};
