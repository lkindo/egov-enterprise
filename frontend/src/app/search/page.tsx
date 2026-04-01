import React, { Suspense } from 'react';
import { cookies } from 'next/headers';
import client from '@/lib/api/client';
import { SearchResultsContent } from './SearchClient';

const IntegratedSearchPage = async ({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
 const resolvedSearchParams = await searchParams;
 const q = (resolvedSearchParams.q as string) || '';

 let initialResults: { articles: any[], users: any[], menus: any[] } = { articles: [], users: [], menus: [] };

 if (q) {
 const cookieStore = await cookies();
 const accessToken = cookieStore.get('accessToken')?.value;
 const axiosConfig = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};

 try {
 const [bbsRes, userRes] = (await Promise.allSettled([
 client.get(`/bbs?searchWrd=${q}&searchCnd=0`, axiosConfig),
 client.get(`/admin/users?searchKeyword=${q}&searchCondition=1`, axiosConfig)
 ])) as any[];

 initialResults = {
 articles: (bbsRes.status === 'fulfilled' && bbsRes.value.data.resultList ? (bbsRes.value.data.resultList || []) : []).slice(0, 10),
 users: (userRes.status === 'fulfilled' && userRes.value.data.resultList ? (userRes.value.data.resultList || []) : []).slice(0, 10),
 menus: [
 { name: '공지사항 愿由?, path: '/admin/system/menus', category: '?쒖뒪님 },
 { name: '?먯쑀 寃뚯떆님, path: '/admin/community/boards', category: '而ㅻ님덊떚' }
 ].filter(m => m.name.includes(q))
 };
 } catch {
 console.error('Server-side search failed', error);
 }
 }

 return (
 <Suspense fallback={
 <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
 <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
 <p className="font-black text-muted-foreground animate-pulse">?뺣낫 분석 以?..</p>
 </div>
 }>
 <SearchResultsContent initialResults={initialResults} query={q} />
 </Suspense>
 );
};

export default IntegratedSearchPage;

