import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getInitialBoardDetailData } from './BoardDetailServer';

// Optimization: Dynamic Import for Client Component
const BoardDetailClient = dynamic(() => import('./BoardDetailClient').then(mod => mod.BoardDetailClient), {
  ssr: true,
  loading: () => <BoardDetailSkeleton />
});

function BoardDetailSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase animate-pulse">Initializing Knowledge Node...</p>
    </div>
  );
}

export default async function BoardDetailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const bbsId = params.bbsId as string;
  const nttId = params.nttId as string;

  // [P1: Waterfall Elimination] Initiate data promise on server
  const dataPromise = getInitialBoardDetailData(bbsId, nttId);

  return (
    <Suspense fallback={<BoardDetailSkeleton />}>
      <BoardDetailClient dataPromise={dataPromise} />
    </Suspense>
  );
}
