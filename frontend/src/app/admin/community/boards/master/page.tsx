'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const BoardMasterListClient = dynamic(
  () => import('./BoardMasterListClient').then(mod => mod.BoardMasterListClient),
  { ssr: false }
);

/**
 * 게시판 마스터 목록 콘솔 페이지 (Admin)
 * /admin/community/boards/master
 */
export default function BoardMasterListPage() {
  return <BoardMasterListClient />;
}
