import { Vote } from 'lucide-react';
import { defineContributions } from '@/extensions/slots';
import {
  SURVEY_STATS_EXPORT_HEADERS,
  SURVEY_STATS_LIST_KEY,
  SurveyStatsBody,
  loadSurveyStatsList,
  surveyStatsExportRows,
} from '@/app/admin/survey/components/StatsHubSurveyTab';

/**
 * 설문 → 통계 셸 기여(허브 분해 H4). '설문조사 분석' 탭이다. 전용 라우트가 없어 현재 경로의 `?tab=SURVEYS` 로 연다. 설문이 빠진
 * 구성에서는 이 파일이 기능과 함께 직접 지워져 이 탭만 사라지고 통계 셸은 그대로다.
 *
 * 노출은 탭이 부르는 설문 목록 API 와 같은 권한(SURVEY_READ_ALL)이다(허브 분해 H5). 종전에는 통계 조회 권한만으로 보여, 그 권한만 가진
 * 사용자 정의 그룹은 탭을 열면 목록이 403 이었다. 기본 그룹은 두 권한을 함께 가져 화면이 같다. 노출일 뿐 인가는 서버가 한다(H3).
 */
export default defineContributions('stats-panels', [
  {
    id: 'SURVEYS',
    placement: 'hub-tab',
    kind: 'body',
    order: 60,
    label: '설문조사 분석',
    title: '설문조사 결과 분석',
    icon: Vote,
    queryKey: SURVEY_STATS_LIST_KEY,
    load: loadSurveyStatsList,
    Body: SurveyStatsBody,
    exportRows: surveyStatsExportRows,
    exportHeaders: SURVEY_STATS_EXPORT_HEADERS,
    visibleWhen: { permissions: ['SURVEY_READ_ALL'] },
  },
]);
