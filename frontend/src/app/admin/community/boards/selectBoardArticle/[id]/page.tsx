'use client';

import React, { Suspense } from 'react';
import BBSDetailClient from './BBSDetailClient';

const InsertBoardArticlePage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-muted-foreground animate-pulse">에디터 로드 중...</p>
      </div>
    }>
      <BBSDetailClient />
    </Suspense>
  );
};

export default InsertBoardArticlePage;
