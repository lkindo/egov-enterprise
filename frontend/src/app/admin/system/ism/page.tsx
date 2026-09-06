import { redirect } from 'next/navigation';

/**
 * `/admin/system/ism` 은 정본 결재 허브(`/approvals`)로 보낸다.
 *
 * [2026-09-06 DEC-OPS-040] 이 화면은 "시스템에서 발생하는 약식 결재 요청" 이라고 설명했지만 실제 조회는
 * 결재자 본인 기준(`type=received`)이고 승인도 본인만 가능해 `/approvals` 와 같은 개인 결재함이었다
 * (감사 D08-05, DEC-OPS-039 가 consolidate-to-canonical 로 제안 → owner 승인). 같은 일을 하는 두 화면이
 * 두 어휘('최종 승인' vs '결재 승인')로 갈려 있던 것을 정본 하나로 모은다.
 *
 * 라우트를 지우지 않고 보내는 이유는 `/admin/community/boards/write` 와 같다 — 메뉴(tb_menu_info)와 문자열
 * URL 참조는 정적 분석으로 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30). 메뉴 행은 그대로 두고 별칭이
 * 리다이렉트로 흡수한다.
 */
export default function InformalSanctionRedirectPage() {
  redirect('/approvals');
}
