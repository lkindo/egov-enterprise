import { defineContributions } from '@/extensions/slots';
import { SurveyToAnswerCard } from '@/app/components/dashboard/SurveyHome';

/**
 * 설문 → 업무 홈 기여(2026-10-20). '참여할 설문' 카드다. 설문이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져 이 카드만 사라진다.
 * 노출은 카드가 부르는 설문 목록 API(GET /surveys)의 권한(SURVEY_READ)이다 — 기본 그룹은 셋 모두 가져 화면이 같다. 노출일 뿐 인가는
 * 서버가 한다(H3).
 */
export default defineContributions('home-sections', [
  {
    id: 'surveys-to-answer',
    placement: 'cards',
    order: 26,
    Component: SurveyToAnswerCard,
    visibleWhen: { permissions: ['SURVEY_READ'] },
  },
]);
