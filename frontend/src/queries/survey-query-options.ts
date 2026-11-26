import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { surveyParticipationService } from '@/services/foundation/survey/SurveyParticipationService';
import { homeKeys } from '@/queries/home-keys';
import { surveyKeys } from '@/queries/survey-keys';

export function surveyListOptions(page: number, size: number) {
  return queryOptions({
    queryKey: ['surveys', 'list', { page, size }],
    queryFn: ({ signal }) => surveyParticipationService.getSurveys({ page, size }, { signal }),
    // 표의 오류 안내와 재시도가 이 조회를 소유한다. 최초 5xx도 목록 안에서 복구한다.
    throwOnError: false,
  });
}

/**
 * 설문 하나에 응답한 뒤 낡는 조회(2026-11-14). 그 설문의 통계·상세와, 응답 여부를 보이는 목록('응답함')·홈의 답할 설문 카드·
 * 내 응답 목록이다. 종전에는 통계·상세만 무효화해 목록과 홈 카드가 최대 60초 동안 제출 전 상태를 보였다.
 */
export function surveyResponseStaleKeys(srvySn: number) {
  return [
    surveyKeys.stats(srvySn),
    surveyKeys.detail(srvySn),
    ['surveys'],
    [...homeKeys.all, 'surveys-to-answer'],
    surveyKeys.myResponsesRoot,
  ] as const;
}

export function invalidateAfterSurveyResponse(queryClient: QueryClient, srvySn: number) {
  for (const queryKey of surveyResponseStaleKeys(srvySn)) void queryClient.invalidateQueries({ queryKey });
}
