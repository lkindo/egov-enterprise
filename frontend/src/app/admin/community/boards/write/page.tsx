import { redirect } from 'next/navigation';

/**
 * `/admin/community/boards/write` 는 정본 작성 화면(`insert-board-article`)으로 보낸다.
 *
 * [2026-09-05 DEC-OPS-034] 게시글 작성 화면이 셋이었다 — 이 라우트의 `CommunityBoardsWriteClient`
 * (첨부 0·임시저장 0·편집기 0, multipart `/bbs/{bbsId}`), `[id]` 의 `CommunityBoardsDetailClient`
 * (이름은 Detail 인데 작성 폼, id 미사용), 그리고 정본 `BoardRegistClient`(편집기·임시저장·서버 액션).
 * 어디서 들어왔느냐에 따라 첨부·임시저장이 있거나 없었다. 정본 하나에 첨부(추가·삭제)와 이 화면이
 * 갖고 있던 게시 기간·행사 일자 입력을 옮겨 상위집합으로 만든 뒤 두 라우트를 리다이렉트한다.
 *
 * 라우트를 지우지 않고 보내는 이유는 `/admin/survey`·`/admin/security/audit` 와 같다 — 문자열 URL
 * 참조는 정적 분석으로 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30). 인바운드 링크 2건
 * (`CommunityBoardClient`·`CommunityDetailClient`)은 게시판 식별자를 실어 정본으로 직접 보낸다.
 */
export default function CommunityBoardsWriteRedirectPage() {
  redirect('/admin/community/boards/insert-board-article');
}
