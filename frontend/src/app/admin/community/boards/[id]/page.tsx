import { redirect } from 'next/navigation';

/**
 * `/admin/community/boards/[id]` 는 정본 작성 화면(`insert-board-article`)으로 보낸다.
 *
 * [2026-09-05 DEC-OPS-034] 종전 `CommunityBoardsDetailClient` 는 이름과 달리 **게시글 작성 폼**이었고
 * 경로의 `id` 를 읽지 않았다(useParams 0건). 저장소 안에 이 라우트로 향하는 링크도 0건이라 실사용
 * 진입점이 없는 세 번째 작성 화면이었다. 그 화면만 갖고 있던 첨부 업로드 배선은 정본으로 옮겼다
 * (`BoardRegistClient` 첨부 섹션 + `BoardRegistClient.attachment.test.tsx`).
 *
 * 식별자를 게시판 ID 로 해석해 `?bbsId=` 로 넘기지 않는다 — 종전 화면이 그 값을 쓰지 않았으므로
 * 어떤 의미였는지 확정할 근거가 없고, 잘못 해석하면 엉뚱한 게시판에 글이 등록된다(H4).
 */
export default function CommunityBoardsLegacyIdRedirectPage() {
  redirect('/admin/community/boards/insert-board-article');
}
