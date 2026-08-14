import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { BoardDetailClient } from './BoardDetailClient';
import { getInitialBoardDetailData } from './BoardDetailServer';

function BoardDetailSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
      <div className="w-16 h-11 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="text-xs font-bold tracking-widest text-muted-foreground animate-pulse">게시글을 불러오는 중...</p>
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
  const pstSn = Number(params.pstSn || params.nttId);
  if (!Number.isSafeInteger(pstSn) || pstSn <= 0) notFound();

  // [P1: Waterfall Elimination] Initiate data promise on server
  const dataPromise = getInitialBoardDetailData(bbsId, pstSn);

  return (
    <Suspense fallback={<BoardDetailSkeleton />}>
      <BoardDetailClient dataPromise={dataPromise} />
    </Suspense>
  );
}
