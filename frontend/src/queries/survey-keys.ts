/**
 * 설문의 쿼리 키 — 설문 결과 통계, 설문 응답 상세, 여론조사 관리 목록.
 *
 * 통계는 통계 패널(SurveyStatsPanel)이, 응답 상세는 응답 상세 화면(SurveyResponseDetailClient)이 조회하고, 응답 목록의 제출 취소
 * (SurveyResponseClient)가 두 뿌리를 무효화한다. 여론조사 관리 목록은 목록 화면(SurveyManageClient)이 조회하고, 관리 상세의
 * 삭제·저장(SurveyManageDetailClient)이 뿌리를 무효화한다.
 * 세 뿌리는 서로 다른 캐시라 하나의 `all` 아래로 모으지 않는다 — 뿌리 이름을 바꾸면 이미 쓰는 캐시 키가 달라진다.
 * 다른 모듈을 import 하지 않는다(기능을 뺀 생성물의 연쇄 제거에 걸리지 않게).
 */
export const surveyKeys = {
  /** 설문 결과 통계 뿌리 — 응답 제출을 취소한 뒤 전체를 무효화한다. */
  statsRoot: ['survey-stats'] as const,
  /** 설문 하나의 결과 통계. 고른 설문이 없으면 null 이 온다(조회는 꺼져 있다). */
  stats: (srvySn: number | null) => [...surveyKeys.statsRoot, srvySn] as const,
  /** 설문 응답 상세 뿌리 — 응답 제출을 취소한 뒤 전체를 무효화한다. */
  responseDetailRoot: ['survey-response-detail'] as const,
  /** 응답 한 건의 상세. */
  responseDetail: (srvyRspnsSn: number) => [...surveyKeys.responseDetailRoot, srvyRspnsSn] as const,
  /**
   * 여론조사 관리 목록 뿌리 — 관리 상세에서 삭제·저장한 뒤 전체를 무효화한다. 목록 화면은 이 뿌리 뒤에 쪽·검색어·쪽당 건수를
   * 배열로 직접 펼친다 — 페이지 크기 결속 census 가 그 배열에서 쪽당 건수를 읽는다.
   */
  adminPollsRoot: ['admin-polls'] as const,
  /** 설문 하나의 상세(SurveyDetailClient) 뿌리 — 응답을 제출한 뒤 그 설문의 상세를 무효화한다. */
  detailRoot: ['survey'] as const,
  detail: (srvySn: number) => [...surveyKeys.detailRoot, srvySn] as const,
  /**
   * 내 응답 목록(SurveyResponseClient) 뿌리 — 응답을 제출·취소한 뒤 전체를 무효화한다. 목록 화면은 이 뿌리 뒤에 쪽·검색어를 배열로
   * 직접 펼친다(페이지 크기 결속 census 가 화면의 queryKey 배열을 읽는다).
   */
  myResponsesRoot: ['survey-responses'] as const,
};
