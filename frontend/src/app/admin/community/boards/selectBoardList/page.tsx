import React from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getInitialBoardData } from './BoardListServer';
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from 'next/navigation';

// ?대씪?댁뼵님而댄룷?뚰듃瑜吏님濡쒕뵫?섏뿬 ?쒕쾭/?대씪?댁뼵님寃쎄퀎瑜紐낇솗님님const BoardListClient = dynamic(() => import('./BoardListClient').then(mod => mod.BoardListClient), {
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
 title: '?꾩껜 게시글 - ?꾩옄?뺣? ?꾨젅?꾩썙님?꾨님?,
 description: '?꾩옄?뺣? ?뚰봽?몄썾님?꾨젅?꾩썙님?꾨님님꾨줈?앺듃님?꾩껜 게시글 紐⑸줉?낅땲님',
};

/**
 * ?쒕쾭 而댄룷?뚰듃: ?섏씠吏 吏꾩엯님 */
export default async function BoardListPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
 const resolvedSearchParams = await searchParams;

 // 파라미터 以鍮 const params = {
 bbsId: (resolvedSearchParams.bbsId as string) || 'BBSMSTR_AAAAAAAAAAAA',
 page踰덊샇: Number(resolvedSearchParams.page踰덊샇) || 1,
 searchWrd: (resolvedSearchParams.searchWrd as string) || '',
 searchCnd: (resolvedSearchParams.searchCnd as string) || '0',
 orderBy: (resolvedSearchParams.orderBy as string) || 'date',
 startDate: (resolvedSearchParams.startDate as string) || undefined,
 endDate: (resolvedSearchParams.endDate as string) || undefined,
 };

 // ?쒕쾭 ?꾩슜 ⑥닔瑜님듯빐 데이터?섏묶
 let initialData;
 try {
  initialData = await getInitialBoardData(params);
 } catch (error: any) {
  if (error.response?.status === 401) {
   redirect(`/login?expired=true&redirect=/admin/community/boards/selectBoardList?bbsId=${params.bbsId}`);
  }
  initialData = { resultList: [], totalCount: 0, totalPages: 0 };
 }

 return (
 <BoardListClient initialData={initialData} params={params} />
 );
}

