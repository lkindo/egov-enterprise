'use client';

import dynamic from 'next/dynamic';

const BoardMasterListClient = dynamic(
  () => import('./BoardMasterListClient').then(mod => mod.BoardMasterListClient),
  {
    ssr: false,
    loading: () => <h1 className="sr-only">게시판 마스터를 불러오는 중</h1>,
  }
);

/**
 * 게시판 마스터 목록 콘솔 페이지 (Admin)
 * /admin/community/boards/master
 */
export default function BoardMasterListPage() {
  return <BoardMasterListClient />;
}
