'use client';

import React, { useState, useEffect, use } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { likeBoardArticle } from '@/app/actions/boardActions';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useBoardList } from '@/hooks/api/use-board-list';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Settings2, BookOpen, X, AlertTriangle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { isAdministrativeRole } from '@/lib/auth/administrative-role';
import { cn } from "@/lib/utils";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { BoardPost } from '@/types/business/board';
import { useToast } from '@/app/components/ui/toast';

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

// 감사 P1-5: `BoardStats` 는 7일 트래픽·작성자 분포를 하드코딩 배열로 그리면서 '실시간' 배지까지 달고 있었다
// (백엔드에 대응 API 없음). 근거 없는 지표라 컴포넌트와 호출부를 함께 제거했다.

import { motion, AnimatePresence } from 'framer-motion';

export const BoardListClient = ({ dataPromise, params: initialParams }: { dataPromise: Promise<any>; params: any }) => {
 const initialData = use(dataPromise);
 const searchParams = useSearchParams();
 const pathname = usePathname();
 const { user } = useAuth();
 const queryClient = useQueryClient();
 // [2026-08-28] 판정 SSOT 사용. 리터럴 비교는 SYSTEM 관리자에게 '게시판 관리' 진입점을
 //   지워 버린다(DEC-OPS-023 ②가 e2e 로 잡았던 것과 같은 결함).
 const isAdmin = isAdministrativeRole(user?.role);
 const bbsId = searchParams.get('bbsId') || initialParams.bbsId;
 const router = useRouter();
 const { toast } = useToast();
 const likePendingRef = React.useRef(false);
 const [pendingLikePstSn, setPendingLikePstSn] = useState<number | null>(null);

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
 const tmpltId = masterInfo?.tmpltId || 'TMPLT_LIST';

 // 실제 API 요청에 사용할 파라미터들 (URL 파라미터를 최우선으로 함)
 const querySearchWrd = searchParams.get('searchWrd') || "";
 const querySearchCnd = searchParams.get('searchCnd') || "0";
 const queryOrderBy = searchParams.get('orderBy') || "date";
 const queryPage = Number(searchParams.get('page')) || 1;
 const queryStartDate = searchParams.get('startDate');
 const queryEndDate = searchParams.get('endDate');

 // 필터가 적용된 상태인지 확인 (SSR 캐시 무효화 판단용)
 const hasFilter = !!querySearchWrd || querySearchCnd !== '0' || queryOrderBy !== 'date' || !!queryStartDate || !!queryEndDate;
  
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
 const queryKey = ['boardList', bbsId, currentParams];

 // useQuery는 URL 파라미터가 변경될 때만 실행됨 (조회 버튼 클릭 시 router.push로 트리거)
 // 감사 P1-1: isError/error/refetch 를 구조분해해 조회 실패를 "게시글 0건"으로 위장하지 않는다.
 const { data, isLoading: loading, isError, error, refetch } = useBoardList({
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
  mutationFn: (pstSn: number) => likeBoardArticle(bbsId, pstSn),
  onMutate: async (pstSn: number) => {
  
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
  item.pstSn === pstSn ? { ...item, likeCnt: (item.likeCnt || 0) + 1 } : item
  )
  };
  });
  
  return { previousData };
  },
  onError: (err, pstSn, context) => {
  // 실패 시 롤백
  queryClient.setQueryData(queryKey, context?.previousData);
  toast(err instanceof Error && err.message ? err.message : '추천 처리 중 오류가 발생했습니다.', 'error');
  },
  onSettled: () => {
  // 최종적으로 서버 데이터와 동기화
  queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
  }
 });

 const handleLike = async (e: React.MouseEvent, pstSn: number) => {
  e.preventDefault();
  e.stopPropagation();
  if (likePendingRef.current) return;
  likePendingRef.current = true;
  setPendingLikePstSn(pstSn);
  try {
   await likeMutation.mutateAsync(pstSn);
  } catch {
   // mutation onError가 롤백과 사용자 안내를 소유한다.
  } finally {
   likePendingRef.current = false;
   setPendingLikePstSn(null);
  }
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

 // SSR 경로(BoardListServer)가 실패했을 때 전달하는 사유. 필터가 걸리지 않은 첫 렌더는 SSR 결과를
 // initialData 로 그대로 쓰므로, 이 값이 없으면 실패가 "0건"으로 위장된다(감사 P1-1).
 const ssrFetchError: string | null = hasFilter ? null : (initialData?.fetchError ?? null);
 const listError: string | null = isError
   ? (error instanceof Error && error.message ? error.message : '게시글 목록을 불러오지 못했습니다.')
   : ssrFetchError;

 const renderTemplate = () => {
   if (loading) {
     return (
       <div className="rounded-2xl border border-white/20 overflow-hidden shadow-2xl bg-white/40 backdrop-blur-xl mb-10">
         <BoardSkeleton tmpltId={tmpltId} />
       </div>
     );
   }

   if (listError) {
     return (
       <div
         role="alert"
         className="rounded-2xl border-2 border-destructive/30 overflow-hidden shadow-2xl bg-card mb-10"
       >
         <div className="flex flex-col items-center justify-center h-80 gap-5 text-center px-6">
           <AlertTriangle className="w-12 h-12 text-destructive-emphasis" aria-hidden="true" />
           <div className="space-y-2">
             <p className="text-xl font-bold text-foreground">게시글을 불러오지 못했습니다.</p>
             <p className="text-sm font-medium text-muted-foreground max-w-md">{listError}</p>
           </div>
           <Button
             type="button"
             onClick={() => { void refetch(); router.refresh(); }}
             className="font-bold"
           >
             다시 시도
           </Button>
         </div>
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
             className="p-10 bg-muted/50 rounded-2xl"
           >
             <MessageSquare className="w-16 h-11 opacity-10" />
           </motion.div>
           {querySearchWrd ? (
             <div className="text-center space-y-2">
               <p className="text-xl font-bold text-muted-foreground">
                 &ldquo;<span className="text-primary">{querySearchWrd}</span>&rdquo;에 대한 검색 결과가 없습니다.
               </p>
               <p className="text-sm font-medium text-muted-foreground">다른 검색어를 시도하거나, 필터 조건을 변경해 보세요.</p>
               <button
                 onClick={() => {
                   router.push(`${pathname}?bbsId=${bbsId}`);
                 }}
                 className="mt-4 px-6 py-2.5 bg-surface-inverse text-surface-inverse-foreground font-bold text-sm rounded-xl hover:bg-surface-inverse/90 transition-all active:scale-95 flex items-center gap-2 mx-auto"
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
           key={tmpltId}
           initial={{ opacity: 0, x: -10 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: 10 }}
           transition={{ duration: 0.3 }}
         >
           {tmpltId === 'TMPLT_HUB' ? (
             <HubTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} page={queryPage} totalCount={totalCount} />
           ) : tmpltId === 'TMPLT_GALLERY' ? (
             <GalleryTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} />
           ) : tmpltId === 'TMPLT_QNA' ? (
             <QnaTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} />
           ) : tmpltId === 'TMPLT_CALENDAR' ? (
             <CalendarTemplate 
               list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn}
               currentViewDate={currentViewDate} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} 
             />
           ) : tmpltId === 'TMPLT_FAQ' ? (
             <FaqTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} />
           ) : tmpltId === 'TMPLT_WIKI' ? (
             <WikiTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} />
           ) : (
             <DefaultTemplate list={list} bbsId={bbsId} querySearchWrd={querySearchWrd} handleLike={handleLike} pendingLikePstSn={pendingLikePstSn} page={queryPage} totalCount={totalCount} />
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
   className="flex flex-col gap-6 p-6 pb-20 relative min-h-screen bg-muted/50"
 >
   {/* Decorative Background Elements */}
   <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
   <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-hub-indigo/5 blur-[100px] rounded-full pointer-events-none -z-10" />

 {/* Breadcrumb - 동적 메뉴 시스템 연동 */}
 <DynamicBreadcrumb 
 customItems={[
 { name: pathname?.includes('/admin/system') ? '시스템 관리' : '커뮤니티 및 콘텐츠' },
 { name: masterInfo?.bbsTtl || (bbsId?.includes('NOTICE') ? '공지사항' : '게시판') }
 ]}
 />

 {/* 템플릿에 따른 차별화된 상단 헤더 */}
 <div className="flex flex-col gap-4 mb-4">
 <motion.div 
   initial={{ x: -20, opacity: 0 }}
   animate={{ x: 0, opacity: 1 }}
   className="flex items-center gap-3"
 >
 <div className={cn("w-2 h-10 rounded-full shadow-lg", tmpltId === 'TMPLT_HUB' ? "bg-gradient-to-b from-hub-indigo to-hub-purple" : "bg-gradient-to-b from-primary to-primary/60")} />
 <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
 {masterInfo?.bbsTtl || (bbsId?.includes('NOTICE') ? '공지사항' : '게시판')}
 </h1>
 {tmpltId === 'TMPLT_HUB' && <Badge className="bg-hub-indigo/10 text-hub-indigo border-hub-indigo/20 font-bold ml-2 px-3 py-1 rounded-lg">지식 허브</Badge>}
 </motion.div>
 <motion.p 
   initial={{ x: -20, opacity: 0 }}
   animate={{ x: 0, opacity: 1 }}
   transition={{ delay: 0.1 }}
   className="text-muted-foreground font-bold ml-5 text-lg"
 >
 {masterInfo?.bbsExpln || '이 게시판의 활동내역과 최신 소식을 확인하세요.'}
 </motion.p>
 </div>

 <Card className="border border-white/40 shadow-2xl overflow-hidden rounded-3xl bg-white/70 backdrop-blur-2xl ring-1 ring-black/5">
 <CardHeader className="py-12 px-12 md:px-20 flex flex-col md:flex-row items-center justify-between gap-10 border-b border-border/50 relative overflow-hidden">
   {/* Header Gradient Decoration */}
   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
   
 <div className="flex-1 space-y-4 relative z-10">
 <CardTitle className="text-4xl font-black tracking-tighter flex items-center gap-4">
 {tmpltId === 'TMPLT_HUB' ? (
   <div className="p-3 bg-hub-indigo/10 rounded-2xl text-hub-indigo shadow-inner">
     <BookOpen className="w-10 h-10" />
   </div>
 ) : (
   <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-inner">
     <MessageSquare className="w-10 h-10" />
   </div>
 )}
 <span className="bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-600">
   {masterInfo?.bbsTtl || (bbsId?.includes('NOTICE') ? '공지사항' : '게시판')}
 </span>
 </CardTitle>
 {/* 감사 P1-5: 조회가 실패한 상태에서 "총 0개"라고 단정하지 않는다. */}
 <p className="text-muted-foreground font-bold text-lg ml-1">
 {listError ? '게시글 수를 확인할 수 없습니다.' : <>총 <span className="text-primary font-black">{(totalCount || 0).toLocaleString()}개</span>의 게시글이 등록되어 있습니다.</>}
 </p>
 </div>
 <CardAction className="flex items-center gap-4 relative z-10">
 {mounted && (
 <>
 {isAdmin && (
 <Link href="/admin/community/boards/master">
 <Button variant="outline" size="lg" className="h-14 px-8 gap-3 border-2 border-border bg-white/50 backdrop-blur-md text-foreground hover:bg-surface-inverse hover:text-white font-black shadow-xl transition-all rounded-2xl hover:-translate-y-1 active:scale-95" aria-label="게시판 관리">
 <Settings2 className="w-6 h-6" /> 게시판 관리
 </Button>
 </Link>
 )}
 <Link href={`/admin/community/boards/insert-board-article?bbsId=${bbsId}`}>
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
