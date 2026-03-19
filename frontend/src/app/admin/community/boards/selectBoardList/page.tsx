import React from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getInitialBoardData } from './BoardListServer';
import { Skeleton } from "@/components/ui/skeleton";

// 클라이언트 컴포넌트를 지연 로딩하여 서버/클라이언트 경계를 명확히 함
const BoardListClient = dynamic(() => import('./BoardListClient').then(mod => mod.BoardListClient), {
 ssr: true,
 loading: () => (
 <div className="flex flex-col gap-6 p-6">
 <Skeleton className="h-10 w-48 rounded-full" />
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
 <Skeleton className="lg:col-span-2 h-64 rounded-[2rem]" />
 <Skeleton className="h-64 rounded-[2rem]" />
 </div>
 <Skeleton className="h-[600px] w-full rounded-[2.5rem]" />
 </div>
 )
});

export const metadata: Metadata = {
 title: '전체 게시글 - 전자정부 프레임워크 현대화',
 description: '전자정부 소프트웨어 프레임워크 현대화 프로젝트의 전체 게시글 목록입니다.',
};

/**
 * 서버 컴포넌트: 페이지 진입점
 */
export default async function BoardListPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
 const resolvedSearchParams = await searchParams;

 // 파라미터 준비
 const params = {
 bbsId: (resolvedSearchParams.bbsId as string) || 'BBSMSTR_AAAAAAAAAAAA',
 page번호: Number(resolvedSearchParams.page번호) || 1,
 searchWrd: (resolvedSearchParams.searchWrd as string) || '',
 searchCnd: (resolvedSearchParams.searchCnd as string) || '0',
 orderBy: (resolvedSearchParams.orderBy as string) || 'date',
 startDate: (resolvedSearchParams.startDate as string) || undefined,
 endDate: (resolvedSearchParams.endDate as string) || undefined,
 };

 // 서버 전용 함수를 통해 데이터 페칭
 const initialData = await getInitialBoardData(params);

 return (
 <BoardListClient initialData={initialData} params={params} />
 );
}
