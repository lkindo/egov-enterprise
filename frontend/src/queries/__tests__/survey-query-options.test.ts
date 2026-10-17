import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({ getSurveys: vi.fn() }));

vi.mock('@/services/foundation/survey/SurveyParticipationService', () => ({ surveyParticipationService: service }));

import { surveyListOptions } from '../survey-query-options';

/*
 * 설문 참여 목록(SurveyClient)은 이 factory 로 조회한다. 페이지 크기 결속 census 는 화면이 쪽·크기를 factory 인자로 넘기는지만 보고,
 * 그 인자가 queryKey 에 들어간다는 사실은 여기서 지킨다 — 크기가 키에 없으면 크기를 바꿔도 캐시가 그대로라 컨트롤이 조용히 죽는다.
 */
describe('survey query ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('목록 queryKey 가 쪽·크기를 담아 크기를 바꾸면 다른 캐시 항목이 된다', () => {
    expect(surveyListOptions(2, 20).queryKey).toEqual(['surveys', 'list', { page: 2, size: 20 }]);
    expect(surveyListOptions(2, 50).queryKey).not.toEqual(surveyListOptions(2, 20).queryKey);
    expect(surveyListOptions(3, 20).queryKey).not.toEqual(surveyListOptions(2, 20).queryKey);
  });

  it('목록 query options 가 같은 쪽·크기로 서비스 호출까지 소유한다', async () => {
    service.getSurveys.mockResolvedValueOnce({ list: [], total: 0 });
    const options = surveyListOptions(1, 10);
    const signal = new AbortController().signal;

    await options.queryFn?.({ queryKey: options.queryKey, signal } as never);

    expect(service.getSurveys).toHaveBeenCalledWith({ page: 1, size: 10 }, { signal });
  });
});
