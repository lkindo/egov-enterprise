import { redirect } from 'next/navigation';

/**
 * `/admin/community/boards/write` 는 정본 작성 화면(`insert-board-article`)으로 보낸다.
 *
 * [2026-09-05 DEC-OPS-034] 게시글 작성 화면이 셋이었다 — 이 라우트의 `CommunityBoardsWriteClient`
 * (첨부 0·임시저장 0·편집기 0, multipart `/boards/{bbsId}/posts/with-files`), `[id]` 의 `CommunityBoardsDetailClient`
 * (이름은 Detail 인데 작성 폼, id 미사용), 그리고 정본 `BoardRegistClient`(편집기·임시저장·서버 액션).
 * 어디서 들어왔느냐에 따라 첨부·임시저장이 있거나 없었다. 정본 하나에 첨부(추가·삭제)와 이 화면이
 * 갖고 있던 게시 기간·행사 일자 입력을 옮겨 상위집합으로 만든 뒤 두 라우트를 리다이렉트한다.
 *
 * 라우트를 지우지 않고 보내는 이유는 `/admin/survey`·`/admin/security/audit` 와 같다 — 문자열 URL
 * 참조는 정적 분석으로 잡히지 않아 물리 삭제에 오삭제 전례가 있다(V2_30). 인바운드 링크
 * (`CommunityBoardClient`, 2026-09-25 퇴역 전까지는 `CommunityDetailClient` 도)는 게시판 식별자를 실어
 * 정본으로 직접 보낸다.
 *
 * [2026-10-26 ADR-0043 1차 UX-09] 이 주소는 게시판 식별자 없이 정본으로 간다. 정본은 이제 식별자가 없으면 공지사항으로 정하지 않고
 * 글을 쓸 수 있는 게시판을 고르게 한다(`BoardWritePicker`) — 옛 북마크로 들어온 공지 편집 권한자가 모르는 채 공지에 쓰지 않는다.
 */
export default function CommunityBoardsWriteRedirectPage() {
  redirect('/admin/community/boards/insert-board-article');
}
