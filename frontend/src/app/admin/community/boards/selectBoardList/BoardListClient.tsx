'use client';

import React, { useState, useEffect, use } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { likeBoardArticle } from '@/app/actions/boardActions';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useBoardList } from '@/hooks/api/use-board-list';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Settings2, BookOpen, X } from "lucide-react";
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { BoardPost } from '@/types/business/board';

// Import refactored components
import { BoardListFilters } from './components/BoardListFilters';
import { BoardPagination } from './components/BoardPagination';
import { 
  HubTemplate, 
  GalleryTemplate, 
  QnaTemplate, 
  CalendarTemplate, 
  FaqTemplate, 
  WikiTemplate, 
  DefaultTemplate,
  BoardSkeleton
} from './components/BoardTemplates';

const BoardStats = dynamic(() => import('./BoardStats').then(mod => mod.BoardStats), {
 ssr: false,
 loading: () => <Skeleton className="h-[280px] w-full rounded-lg" />
});

import { motion, AnimatePresence } from 'framer-motion';

export const BoardListClient = ({ dataPromise, params: initialParams }: { dataPromise: Promise<any>; params: any }) => {
 const initialData = use(dataPromise);
 const searchParams = useSearchParams();
 const pathname = usePathname();
 const { user } = useAuth();
 const queryClient = useQueryClient();
 const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
 const bbsId = searchParams.get('bbsId') || initialParams.bbsId;
 const router = useRouter();

 const [mounted, setMounted] = useState(false);

 // 필터 로컬 상태 관리 (사용자 입력용)
 const [searchWrd, setSearchWrd] = useState(searchParams.get('searchWrd') || "");
 const [searchCnd, setSearchCnd] = useState(searchParams.get('searchCnd') || "0");
 const [orderBy, setOrderBy] = useState(searchParams.get('orderBy') || "date");
 const [startDate, setStartDate] = useState<Date | undefined>(searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined);
 const [endDate, setEndDate] = useState<Date | undefined>(searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined);

 useEffect(() => {
   setMounted(true);
 }, []);

 // URL 파라미터 변경 시 로컬 상태 동기화
 useEffect(() => {
   setSearchWrd(searchParams.get('searchWrd') || "");
   setSearchCnd(searchParams.get('searchCnd') || "0");
   setOrderBy(searchParams.get('orderBy') || "date");
   setStartDate(searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined);
   setEndDate(searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined);
 }, [searchParams]);

 const handleSearch = (e?: React.FormEvent) => {
   if (e) e.preventDefault();
   const params = new URLSearchParams(searchParams.toString());
   if (searchWrd) params.set('searchWrd', searchWrd); else params.delete('searchWrd');
   if (searchCnd !== '0') params.set('searchCnd', searchCnd); else params.delete('searchCnd');
   if (orderBy !== 'date') params.set('orderBy', orderBy); else params.delete('orderBy');
   if (startDate) params.set('startDate', startDate.toISOString()); else params.delete('startDate');
   if (endDate) params.set('endDate', endDate.toISOString()); else params.delete('endDate');
   params.set('page', '1'); // 검색 시 1페이지로 이동
   router.push(`${pathname}?${params.toString()}`);
 };

 const handleReset = () => {
   setSearchWrd("");
   setSearchCnd("0");
   setOrderBy("date");
   setStartDate(undefined);
   setEndDate(undefined);
   router.push(`${pathname}?bbsId=${bbsId}`);
 };

 const handlePageChange = (page: number) => {
   const params = new URLSearchParams(searchParams.toString());
   params.set('page', page.toString());
   router.push(`${pathname}?${params.toString()}`);
 };


 // 마스터 정보 및 템플릿 확인

 const masterInfo = initialData.masterInfo || null;
 const tmplatId = masterInfo?.tmplatId || 'TMPLT_LIST';
 // 관리자 대시보드용이 아닌 실제 서비스용 위치 확인
 const isManagementView = pathname?.includes('/admin/system/board-masters') || !bbsId?.startsWith('BBSMSTR_');

 // 실제 API 요청에 사용할 파라미터들 (URL 파라미터를 최우선으로 함)
 const querySearchWrd = searchParams.get('searchWrd') || "";
 const querySearchCnd = searchParams.get('searchCnd') || "0";
 const queryOrderBy = searchParams.get('orderBy') || "date";
 const queryPage = Number(searchParams.get('page')) || 1;
 const queryStartDate = searchParams.get('startDate');
 const queryEndDate = searchParams.get('endDate');

 // 필터가 적용된 상태인지 확인 (SSR 캐시 무효화 판단용)
 const hasFilter = !!querySearchWrd || querySearchCnd !== '0' || queryOrderBy !== 'date' || !!queryStartDate || !!queryEndDate;
 
 // useQuery는 URL 파라미터가 변경될 때만 실행됨 (조회 버튼 클릭 시 router.push로 트리거)
 const { data, isLoading: loading } = useBoardList({
 bbsId,
 page: queryPage,
 pageUnit: 10,
 searchWrd: querySearchWrd,
 searchCnd: querySearchCnd,
 orderBy: queryOrderBy,
 startDate: queryStartDate || undefined,
 endDate: queryEndDate || undefined
 }, hasFilter ? undefined : initialData);

 // 낙관적 업데이트를 적용한 좋아요 뮤테이션
 const likeMutation = useMutation({
 mutationFn: (nttId: string) => likeBoardArticle(bbsId, nttId),
 onMutate: async (nttId: string) => {
 const currentParams = {
 bbsId,
 page: queryPage,
 pageUnit: 10,
 searchWrd: querySearchWrd,
 searchCnd: querySearchCnd,
 orderBy: queryOrderBy,
 startDate: queryStartDate || undefined,
 endDate: queryEndDate || undefined
 };
 const queryKey = ['boardList', currentParams];

 // 진행 중인 쿼리 취소
 await queryClient.cancelQueries({ queryKey });
 
 // 이전 상태 저장 (롤백용)
 const previousData = queryClient.getQueryData(queryKey);
 
 // 캐시 데이터 즉시 업데이트
 queryClient.setQueryData(queryKey, (old: any) => {
 if (!old || !old.list) return old;
 return {
 ...old,
 list: old.list.map((item: any) => 
 String(item.nttId) === nttId ? { ...item, likeCo: (item.likeCo || 0) + 1 } : item
 )
 };
 });
 
 return { previousData };
 },
 onError: (err, nttId, context) => {
 // 실패 시 롤백
 queryClient.setQueryData(['boardList', bbsId, queryPage, querySearchWrd, queryOrderBy], context?.previousData);
 },
 onSettled: () => {
 // 최종적으로 서버 데이터와 동기화
 queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
 }
 });

 const handleLike = (e: React.MouseEvent, nttId: string) => {
 e.preventDefault();
 e.stopPropagation();
 likeMutation.mutate(nttId);
 };

 const list: BoardPost[] = data?.list || [];
 const totalCount = data?.total || 0;
 const totalPages = data?.totalPage || 0;

 // URL 파라미터로 캘린더 상태 관리
 const currentViewDate = queryStartDate ? new Date(queryStartDate) : new Date();
 const handlePrevMonth = () => {
   const d = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1);
   const params = new URLSearchParams(searchParams.toString());
   params.set('startDate', d.toISOString());
   router.push(`${pathname}?${params.toString()}`);
 };
 const handleNextMonth = () => {
   const d = new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1);
   const params = new URLSearchParams(searchParams.toString());
   params.set('startDate', d.toISOString());
   router.push(`${pathname}?${params.toString()}`);
 };

 const renderTemplate = () => {
   if (loading) {
     return (
       <div className="rounded-2xl border border-white/20 overflow-hidden shadow-2xl bg-white/40 backdrop-blur-xl mb-10">
         <BoardSkeleton tmplatId={tmplatId} />
       </div>
     );
   }

   if (list.length === 0) {
     return (
       <div className="rounded-2xl border border-white/20 overflow-hidden shadow-2xl bg-white/40 backdrop-blur-xl mb-10">
         <div className="flex flex-col items-center justify-center h-80 gap-4 text-slate-300">
           <motion.div 
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="p-10 bg-slate-50/50 rounded-2xl"
           >
             <MessageSquare className="w-16 h-11 opacity-10" />
           </motion.div>
           {querySearchWrd ? (
             <div className="text-center space-y-2">
               <p className="text-xl font-bold text-slate-400">
                 &ldquo;<span className="text-primary">{querySearchWrd}</span>&rdquo;에 대한 검색 결과가 없습니다.
               </p>
               <p className="text-sm font-medium text-slate-400">다른 검색어를 시도하거나, 필터 조건을 변경해 보세요.</p>
               <button
                 onClick={() => {
                   router.push(`${pathname}?bbsId=${bbsId}`);
                 }}
                 className="mt-4 px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                 aria-label="필터 초기화"
               >
                 <X size={14} /> 필터 초기화
               </button>
             </div>
           ) : (
             <p className="text-xl font-bold">게시글이 아직 없습니다.</p>
           )}
         </div>
       </div>
     );
   }

   return (
     <motion.div 
       initial={{ y: 20, opacity: 0 }}
       animate={{ y: 0, opacity: 1 }}
       transition={{ delay: 0.2 }}
       className="rounded-2xl border border-white/20 overflow-hidden shadow-2xl bg-white/40 backdrop-blur-xl mb-10"
     >
       <AnimatePresence mode="wait">
         <motion.div
           key={tmplatId}
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 10 }}
           transition={{ duration: 0.3 }}
         >
           {tmplatId === 'TMPLT_HUB' ? (
             <HubTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} isLikePending={likeMutation.isPending} page={queryPage} totalCount={totalCount} />
           ) : tmplatId === 'TMPLT_GALLERY' ? (
             <GalleryTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} isLikePending={likeMutation.isPending} />
           ) : tmplatId === 'TMPLT_QNA' ? (
             <QnaTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} isLikePending={likeMutation.isPending} />
           ) : tmplatId === 'TMPLT_CALENDAR' ? (
             <CalendarTemplate 
               list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} isLikePending={likeMutation.isPending} 
               currentViewDate={currentViewDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} 
             />
           ) : tmplatId === 'TMPLT_FAQ' ? (
             <FaqTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} isLikePending={likeMutation.isPending} />
           ) : tmplatId === 'TMPLT_WIKI' ? (
             <WikiTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} isLikePending={likeMutation.isPending} />
           ) : (
             <DefaultTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} isLikePending={likeMutation.isPending} page={queryPage} totalCount={totalCount} />
           )}
         </motion.div>
       </AnimatePresence>
     </motion.div>
   );
 };

 return (
 <motion.div 
   initial={{ opacity: 0 }}
   animate={{ opacity: 1 }}
   className="flex flex-col gap-6 p-6 pb-20 relative min-h-screen bg-slate-50/50"
 >
   {/* Decorative Background Elements */}
   <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
   <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none -z-10" />

 {/* Breadcrumb - 동적 메뉴 시스템 연동 */}
 <DynamicBreadcrumb 
 customItems={[
 { name: pathname?.includes('/admin/system') ? '시스템 관리' : '커뮤니티 및 콘텐츠' },
 { name: masterInfo?.bbsNm || (bbsId?.includes('NOTICE') ? '공지사항' : '게시판') }
 ]}
 />

 {/* 템플릿에 따른 차별화된 상단 헤더 */}
 <div className="flex flex-col gap-4 mb-4">
 <motion.div 
   initial={{ x: -20, opacity: 0 }}
   animate={{ x: 0, opacity: 1 }}
   className="flex items-center gap-3"
 >
 <div className={cn("w-2 h-10 rounded-full shadow-lg", tmplatId === 'TMPLT_HUB' ? "bg-gradient-to-b from-indigo-500 to-purple-500" : "bg-gradient-to-b from-primary to-primary/60")} />
 <h2 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
 {masterInfo?.bbsNm || (bbsId?.includes('NOTICE') ? '공지사항' : '게시판')}
 </h2>
 {tmplatId === 'TMPLT_HUB' && <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-bold ml-2 px-3 py-1 rounded-lg">지식 허브</Badge>}
 </motion.div>
 <motion.p 
   initial={{ x: -20, opacity: 0 }}
   animate={{ x: 0, opacity: 1 }}
   transition={{ delay: 0.1 }}
   className="text-slate-500 font-bold ml-5 text-lg"
 >
 {masterInfo?.bbsIntrcn || '이 게시판의 활동내역과 최신 소식을 확인하세요.'}
 </motion.p>
 </div>

 {/* 관리자 뷰에서만 통계 리포트 호출 */}
 {isAdmin && isManagementView && (
   <motion.div
     initial={{ y: 20, opacity: 0 }}
     animate={{ y: 0, opacity: 1 }}
     transition={{ delay: 0.2 }}
   >
     <BoardStats />
   </motion.div>
 )}

 <Card className="border border-white/40 shadow-2xl overflow-hidden rounded-3xl bg-white/70 backdrop-blur-2xl ring-1 ring-black/5">
 <CardHeader className="py-12 px-12 md:px-20 flex flex-col md:flex-row items-center justify-between gap-10 border-b border-slate-100/50 relative overflow-hidden">
   {/* Header Gradient Decoration */}
   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
   
 <div className="flex-1 space-y-4 relative z-10">
 <CardTitle className="text-4xl font-black tracking-tighter flex items-center gap-4">
 {tmplatId === 'TMPLT_HUB' ? (
   <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500 shadow-inner">
     <BookOpen className="w-10 h-10" />
   </div>
 ) : (
   <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
     <MessageSquare className="w-10 h-10" />
   </div>
 )}
 <span className="bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600">
   {masterInfo?.bbsNm || (bbsId?.includes('NOTICE') ? '공지사항' : '게시판')}
 </span>
 </CardTitle>
 <p className="text-slate-400 font-bold text-lg ml-1">총 <span className="text-primary font-black">{(totalCount || 0).toLocaleString()}개</span>의 소중한 이야기가 담겨있습니다.</p>
 </div>
 <CardAction className="flex items-center gap-4 relative z-10">
 {mounted && (
 <>
 {isAdmin && (
 <Link href="/admin/community/boards/master">
 <Button variant="outline" size="lg" className="h-14 px-8 gap-3 border-2 border-slate-200 bg-white/50 backdrop-blur-md text-slate-900 hover:bg-slate-900 hover:text-white font-black shadow-xl transition-all rounded-2xl hover:-translate-y-1 active:scale-95" aria-label="게시판 관리">
 <Settings2 className="w-6 h-6" /> 게시판 관리
 </Button>
 </Link>
 )}
 <Link href={`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}`}>
 <Button size="lg" className="h-14 px-10 gap-3 bg-primary text-white hover:scale-105 font-black shadow-[0_20px_40px_-10px_rgba(var(--primary-rgb),0.3)] transition-all rounded-2xl active:scale-95 group" aria-label="글쓰기">
 <div className="flex items-center gap-3">
 <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" /> 글쓰기
 </div>
 </Button>
 </Link>
 </>
 )}
 </CardAction>
 </CardHeader>
 <CardContent className="pt-10 px-10 md:px-14">
 
 {/* 분리된 필터 영역 */}
 <div className="mb-10">
  <BoardListFilters 
    searchWrd={searchWrd}
    setSearchWrd={setSearchWrd}
    searchCnd={searchCnd}
    setSearchCnd={setSearchCnd}
    orderBy={orderBy}
    setOrderBy={setOrderBy}
    startDate={startDate}
    setStartDate={setStartDate}
    endDate={endDate}
    setEndDate={setEndDate}
    onSearch={handleSearch}
    onReset={handleReset}
    mounted={mounted}
  />
 </div>


 {/* 템플릿 렌더링 영역 */}
 {renderTemplate()}

 {/* 분리된 페이지네이션 영역 */}
 <div className="mt-6">
  <BoardPagination totalPages={totalPages} currentPage={queryPage} onPageChange={handlePageChange} />
 </div>


 </CardContent>
 </Card>
 </motion.div>
 );
};

