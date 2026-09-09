import { queryOptions } from '@tanstack/react-query';
import { surveyAdminService } from '@/services/foundation/survey/SurveyAdminService';

export function surveyListOptions(page: number, size: number) {
  return queryOptions({
    queryKey: ['surveys', 'list', { page, size }],
    queryFn: ({ signal }) => surveyAdminService.getSurveys({ page, size }, { signal }),
    // 표의 오류 안내와 재시도가 이 조회를 소유한다. 최초 5xx도 목록 안에서 복구한다.
    throwOnError: false,
  });
}
