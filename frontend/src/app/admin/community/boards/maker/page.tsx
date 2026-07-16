'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const BoardMakerWizard = dynamic(
  () => import('./components/BoardMakerWizard').then(mod => mod.BoardMakerWizard),
  { ssr: false }
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
