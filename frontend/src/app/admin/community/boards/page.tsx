import { redirect } from 'next/navigation';

// 샘플 통합 허브(KnowledgeHubClient: 위키/FAQ/Q&A/커뮤니티 탭 포함)는 재사용 base 에서 제거됐다.
// 게시판(board)은 유지 도메인이므로, 실제 게시판 목록 라우트로 리다이렉트한다.
export default function BoardsPage() {
  redirect('/admin/community/boards/select-board-list');
}
