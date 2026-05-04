'use client';

import React from 'react';
import { BoardMakerWizard } from './components/BoardMakerWizard';

/**
 * 게시님鍮뚮뜑 留덈쾿님페이지 (Admin)
 * /admin/community/boards/maker
 */
export default function BoardMakerPage() {
  return (
    <div className="container mx-auto py-10 min-h-screen bg-slate-50/30">
      <BoardMakerWizard />
    </div>
  );
}

