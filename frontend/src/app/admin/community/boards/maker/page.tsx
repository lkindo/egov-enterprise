'use client';

import dynamic from 'next/dynamic';

const BoardMakerWizard = dynamic(
  () => import('./components/BoardMakerWizard').then(mod => mod.BoardMakerWizard),
  {
    ssr: false,
    loading: () => <h1 className="sr-only">게시판 생성 마법사를 불러오는 중</h1>,
  }
);

/**
 * 게시판 빌더 마법사 페이지 (Admin)
 * /admin/community/boards/maker
 */
export default function BoardMakerPage() {
  return (
    <div className="container mx-auto py-10 min-h-screen bg-muted/30">
      <BoardMakerWizard />
    </div>
  );
}
