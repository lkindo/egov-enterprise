import { redirect } from 'next/navigation';

/**
 * 스크랩 목록으로 보낸다.
 *
 * [2026-09-12 §A3-1] 이 라우트는 이름은 '상세' 였지만 읽기 전용 표면이 0 인 수정 전용 페이지였다(제목·입력 3개·삭제·저장뿐).
 * 리치 텍스트·첨부·마법사·공유 URL·대형 구조물 어느 조건도 충족하지 않아 전용 페이지가 정당화되지
 * 않았고, 목록의 조회 상태(page·pageSize)가 useState·URL 미탑재라 이동만으로 맥락이 전손됐다.
 * 등록·수정은 목록의 `ScrapFormDialog` 모달이 받는다.
 *
 * 라우트를 지우지 않고 보내는 이유는 DEC-OPS-034 선례와 같다 — 문자열 URL 참조는 정적 분석으로
 * 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30).
 */
export default function ScrapDetailRedirectPage() {
  redirect('/admin/collaboration/scraps/selectScrapList');
}
