import { redirect } from 'next/navigation';

/**
 * 설문 관리 목록으로 보낸다.
 *
 * [2026-09-12 §A3-1] 이 라우트는 설문 등록 입력만 있는 전용 페이지였다 — 입력 4개(설문명·시작일·
 * 종료일·유형)뿐이고 응답 선택지는 소스에 고정돼 있어 리치 텍스트·첨부·마법사·공유 URL·대형 구조물
 * 어느 조건도 충족하지 않았다. 목록의 조회 상태(page·pageSize·검색어)가 useState·URL 미탑재라
 * 이동만으로 맥락이 전손됐다. 등록은 목록의 `SurveyFormDialog` 모달이 받는다.
 *
 * 라우트를 지우지 않고 보내는 이유는 DEC-OPS-034 선례와 같다 — 문자열 URL 참조는 정적 분석으로
 * 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30).
 */
export default function SurveyManageCreateRedirectPage() {
  redirect('/admin/survey/manage');
}
