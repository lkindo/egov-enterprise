import { redirect } from 'next/navigation';

/**
 * `/admin/community/boards` 는 지식 허브의 커뮤니티 탭(`/admin/help?tab=COMMUNITY`)으로 보낸다.
 *
 * [2026-09-06 DEC-OPS-040] `/admin/community` 와 함께 `KnowledgeHubClient defaultTab="COMMUNITY"` 를
 * 중복 렌더하던 세 번째 주소였다(overlay 제안 consolidate-to-canonical → owner 승인). 하위의
 * `select-board-list`·`insert-board-article`·`master`·`maker` 등 실제 게시판 관리 화면은 그대로다.
 */
export default function CommunityBoardsRedirectPage() {
  redirect('/admin/help?tab=COMMUNITY');
}
