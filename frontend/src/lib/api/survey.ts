import client from './client';
import { QustnrRespondInfo, SurveyResultStats } from '@/types/business/survey';
import type { PageResponse } from '@/types/foundation/system';

/**
 * 설문 응답(`tb_srvy_rslt`) API.
 *
 * 백엔드는 D-4 3단계에서 신설했다. 그 전까지 이 파일의 4개 중 3개는 존재하지 않는 경로를
 * 가리켰고, 화면이 `as any` 로 받아 **조용히 빈 목록**을 그려 그 사실이 드러나지 않았다.
 */

/** 설문 응답 목록 (관리자). 응답자명 부분일치 검색. */
export const getQustnrRespondInfoList = async (
  params: { keyword?: string; page?: number; size?: number } = {}
): Promise<PageResponse<QustnrRespondInfo>> => {
  return client.get<PageResponse<QustnrRespondInfo>>('/admin/system/survey-responses', {
    params,
    headers: { Accept: 'application/json' },
  });
};

export const getQustnrRespondInfoDetail = async (id: string): Promise<QustnrRespondInfo> => {
  return client.get<QustnrRespondInfo>(`/admin/system/survey-responses/${id}`);
};

/** 응답 삭제는 백엔드가 `@AdminOnly` 다 — ADMIN 이 아니면 403. */
export const deleteQustnrRespondInfo = async (id: string): Promise<void> => {
  return client.delete(`/admin/system/survey-responses/${id}`);
};

/** 문항별 항목 응답 분포. 화면 2곳(`/survey/stats`·`/survey/[id]`)이 같은 형태를 렌더한다. */
export const getSurveyStats = async (data: { srvyId: string }): Promise<SurveyResultStats[]> => {
  return client.get<SurveyResultStats[]>(`/surveys/${data.srvyId}/stats`);
};
