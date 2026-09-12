import { redirect } from 'next/navigation';

/**
 * `/admin/collaboration/address-book/insert-address-book` 은 주소록 목록으로 보낸다.
 *
 * [2026-09-12 §A3-1] 이 라우트는 명함 등록 입력만 있는 전용 페이지였다. 리치 텍스트·첨부·마법사·
 * 공유 URL·대형 구조물 어느 조건도 충족하지 않아 페이지가 정당화되지 않았고, 목록의 조회 상태
 * (pageNo·searchWrd·pageUnit)가 전부 useState·URL 미탑재라 **이동만으로 검색 맥락이 전손**됐다.
 * 등록 폼은 목록의 `AddressBookCreateDialog` 모달로 옮겼다 — 저장 후 현재 페이지·검색어 그대로
 * 목록만 다시 읽는다.
 *
 * 라우트를 지우지 않고 보내는 이유는 DEC-OPS-034 선례와 같다 — 문자열 URL 참조는 정적 분석으로
 * 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30).
 */
export default function AddressBookInsertRedirectPage() {
  redirect('/admin/collaboration/address-book/select-address-book-list');
}
