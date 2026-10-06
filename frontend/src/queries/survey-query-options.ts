import { queryOptions } from '@tanstack/react-query';
import { surveyParticipationService } from '@/services/foundation/survey/SurveyParticipationService';

export function surveyListOptions(page: number, size: number) {
  return queryOptions({
    queryKey: ['surveys', 'list', { page, size }],
    queryFn: ({ signal }) => surveyParticipationService.getSurveys({ page, size }, { signal }),
    // 표의 오류 안내와 재시도가 이 조회를 소유한다. 최초 5xx도 목록 안에서 복구한다.
    throwOnError: false,
  });
}
