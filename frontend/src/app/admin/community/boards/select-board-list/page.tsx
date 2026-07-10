import React, { Suspense } from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getInitialBoardData } from './BoardListServer';
import { Skeleton } from "@/components/ui/skeleton";

/** 
 * 클라이언트 컴포넌트를 지연 로딩하여 서버/클라이언트 경계를 명확히 함 
 */
const BoardListClient = dynamic(() => import('./BoardListClient').then(mod => mod.BoardListClient), {
  ssr: true,
  loading: () => <BoardListSkeleton />
});

export const metadata: Metadata = {
  title: '전체 게시글 - 전자정부 프레임워크',
  description: '전자정부 소프트웨어 프레임워크 프로젝트의 전체 게시글 목록입니다.',
};

/**
 * 서버 컴포넌트: 페이지 진입점
 */
export default async function BoardListPage({ searchParams }: { searchParams: Promise<any> }) {
  const resolvedSearchParams = await searchParams;
  const bbsId = resolvedSearchParams.bbsId || 'BBSMSTR_000000000001';
  const page = Number(resolvedSearchParams.page) || 1;
  const searchWrd = resolvedSearchParams.searchWrd || '';
  const searchCnd = resolvedSearchParams.searchCnd || '0';
  const orderBy = resolvedSearchParams.orderBy || 'date';
  const startDate = resolvedSearchParams.startDate;
  const endDate = resolvedSearchParams.endDate;

  const dataPromise = getInitialBoardData({
    bbsId,
    page,
    searchWrd,
    searchCnd,
    orderBy,
    startDate,
    endDate
  });

  return (
    <Suspense fallback={<BoardListSkeleton />}>
      <BoardListClient 
        dataPromise={dataPromise} 
        params={{ bbsId, page, searchWrd, searchCnd, orderBy, startDate, endDate }} 
      />
    </Suspense>
  );
}

function BoardListSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Skeleton className="lg:col-span-2 h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
      <Skeleton className="h-[600px] w-full rounded-lg" />
    </div>
  );
}
