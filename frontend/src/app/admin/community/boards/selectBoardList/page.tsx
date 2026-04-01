import React from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getInitialBoardData } from './BoardListServer';
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from 'next/navigation';

// ?´ë¼?´ì–¸??ì»´í¬?ŒíŠ¸ë¥?ì§€??ë¡œë”©?˜ì—¬ ?œë²„/?´ë¼?´ì–¸??ê²½ê³„ë¥?ëª…í™•????const BoardListClient = dynamic(() => import('./BoardListClient').then(mod => mod.BoardListClient), {
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
 title: '?„ì²´ ê²Œì‹œê¸€ - ?„ì?•ë? ?„ë ˆ?„ì›Œ???„ë???,
 description: '?„ì?•ë? ?Œí”„?¸ì›¨???„ë ˆ?„ì›Œ???„ë????„ë¡œ?íŠ¸???„ì²´ ê²Œì‹œê¸€ ëª©ë¡?…ë‹ˆ??',
};

/**
 * ?œë²„ ì»´í¬?ŒíŠ¸: ?˜ì´ì§€ ì§„ì…?? */
export default async function BoardListPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
 const resolvedSearchParams = await searchParams;

 // ?Œë¼ë¯¸í„° ì¤€ë¹? const params = {
 bbsId: (resolvedSearchParams.bbsId as string) || 'BBSMSTR_AAAAAAAAAAAA',
 pageë²ˆí˜¸: Number(resolvedSearchParams.pageë²ˆí˜¸) || 1,
 searchWrd: (resolvedSearchParams.searchWrd as string) || '',
 searchCnd: (resolvedSearchParams.searchCnd as string) || '0',
 orderBy: (resolvedSearchParams.orderBy as string) || 'date',
 startDate: (resolvedSearchParams.startDate as string) || undefined,
 endDate: (resolvedSearchParams.endDate as string) || undefined,
 };

 // ?œë²„ ?„ìš© ?¨ìˆ˜ë¥??µí•´ ?°ì´???˜ì¹­
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
