import { redirect } from 'next/navigation';

/**
 * `/admin/survey` 는 실데이터가 단 한 건도 없는 목업 화면이었다.
 *
 * 종전 `SurveyHubClient`(이 디렉터리의 동명 파일, 삭제됨)는 설문 4건·총 참여 1,458명·
 * 완료율 78.2%·이탈률 12.4%·"+12.4% INCREMENTAL" 을 전부 소스에 하드코딩하고 있었고,
 * '분석 아카이브'·'신규 설문 생성'·'Protocol Link'·'Export Data' 네 버튼은 핸들러가 없었다.
 * 감사 P1-5(근거 없는 지표 카드는 삭제)·P1-6(핸들러 없는 死버튼은 삭제)를 그대로 적용하면
 * 남는 요소가 0개라 화면 자체가 성립하지 않는다.
 *
 * 라우트를 지우지 않고 실제 허브로 보내는 이유:
 *  - `tb_menu_info` 어느 행도 `/admin/survey` 를 가리키지 않지만(V2_30 실측), 문자열 URL 참조는
 *    정적 분석으로 잡히지 않아 라우트 물리 삭제는 과거 오삭제 사고 전례가 있다.
 *  - 리다이렉트는 기존 북마크·외부 링크를 404 로 만들지 않으면서 목업 노출만 끝낸다.
 */
export default function SurveyRootPage() {
  redirect('/admin/survey/hub');
}
