'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { todayStorageYmd } from '@/lib/format-date';
import { getSurveyStatus } from '@/lib/survey-status';
import { surveyParticipationService } from '@/services/foundation/survey/SurveyParticipationService';
import { HomeSummaryCard, summaryValue } from './HomeSummaryCard';

/**
 * 업무 홈의 '참여할 설문' 카드(2026-10-20). 설문 기능 소유이고 업무 홈 셸에는 home-sections 기여(extensions/survey/home-sections.ts)로
 * 들어간다. 노출은 카드가 부르는 설문 목록 API 의 권한(SURVEY_READ)이다.
 *
 * 원천은 설문 참여 화면(/survey)과 같은 목록이고, 같은 판정으로 고른다: 진행 중(getSurveyStatus — 서버의 응답 기간 판정과 같은 규칙)이고
 * 서버가 실어 준 응답 여부(responded, DEC-OPS-197)가 '응답함' 이 아닌 공개 설문이다. 작성 중(rlsYn 'N')인 설문은 편집 권한자에게만
 * 오며 응답할 수 없으므로 세지 않는다. 서버가 진행 중 필터를 따로 주지 않으므로 한 번에 받는 상한(100건)만큼 읽고, 설문이 그보다
 * 많으면 범위를 밝힌다.
 */
const PAGE_LIMIT = 100;
const MAX_ITEMS = 2;

export function SurveyToAnswerCard() {
  const { user } = useAuth();
  const surveys = useQuery({
    queryKey: ['home', 'surveys-to-answer', user?.id],
    queryFn: () => surveyParticipationService.getSurveys({ page: 1, size: PAGE_LIMIT }),
    retry: false,
  });
  const today = todayStorageYmd();
  const list = surveys.data?.list ?? [];
  const open = list.filter(survey => survey.rlsYn !== 'N' && survey.responded !== true && getSurveyStatus(survey, today) === 'active');
  const partial = typeof surveys.data?.total === 'number' && surveys.data.total > list.length;
  return (
    <HomeSummaryCard
      href="/survey"
      label="참여할 설문"
      value={summaryValue(surveys, surveys.data ? open.length : null)}
      items={open.slice(0, MAX_ITEMS).map(survey => survey.srvyTtl || `${survey.srvySn}번 설문`)}
      note={partial ? `설문 ${list.length}건에서 셌습니다.` : undefined}
    />
  );
}
