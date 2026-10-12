import { Suspense } from 'react';
import CommentModerationClient from './CommentModerationClient';

export const metadata = {
  title: '댓글 및 평가 관리 | 시스템 관리',
  description: '게시물에 등록된 댓글을 조회하고 관리합니다.',
};

/*
 * 댓글 기능이 소유하는 독립 목록 화면(허브 분해 H6). 종전에는 감시 허브를 그대로 위임 렌더하고 댓글 탭을 기본으로 열었다 — 그래서
 * 댓글 담당자에게 로그 탭이 보이고 그 API 는 403 이었다. 이제 이 화면은 댓글만 다루고, 감시 허브에는 댓글 탭이 없다.
 * Suspense 경계 필수 — 화면이 `useSearchParams()` 로 쪽 번호를 URL 에서 읽는다.
 */
export default function AdminCommentPage() {
  return (
    <Suspense>
      <CommentModerationClient />
    </Suspense>
  );
}
