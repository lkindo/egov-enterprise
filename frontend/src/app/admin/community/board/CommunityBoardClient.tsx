'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus,  Eye,
 Search,  ChevronRight,  MessageSquare,
 User,  Layers,  Sparkles, AlertTriangle, RefreshCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { BoardPost } from '@/types/business/board';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { HubListSkeleton } from '@/components/ui/hub/HubSkeleton';

const DEFAULT_BBS_ID = 'BBSMSTR_AAAAAAAAAAAA'; // 공지사항 기본값

const PAGE_SIZE = 10;

function CommunityBoardContent() {
 const router = useRouter();
 const searchParams = useSearchParams();

 const [searchWrd, setSearchWrd] = useState('');
 const [bbsId, setBbsId] = useState(searchParams.get('bbsId') || DEFAULT_BBS_ID);
 const [page, setPage] = useState(0);

 // 감사 P1-8: 과거 `searchWrd` 원본이 그대로 queryKey 에 있어 타이핑 한 글자마다 서버 요청이 나갔다.
 // 공용 훅으로 300ms 디바운스하고, 입력 컨트롤에는 원본 상태를 그대로 바인딩한다.
 const debouncedSearchWrd = useDebouncedValue(searchWrd, 300);

 // 감사 P1-1: isError/error/refetch 를 구조분해해 조회 실패를 "게시글 0건"으로 위장하지 않는다.
 const { data: boardData, isLoading, isError, error, refetch, isFetching } = useQuery({
 queryKey: ['community-board', bbsId, debouncedSearchWrd, page],
 queryFn: () => boardUserService.getPosts(bbsId, {
 page: page,
 size: PAGE_SIZE,
 searchWrd: debouncedSearchWrd,
 searchCnd: '0'
 }),
 });

 const posts = boardData?.list || [];
 const totalCount = boardData?.total || 0;

 const handleRowClick = (item: BoardPost) => {
 router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || bbsId}&pstId=${item.pstId}`);
 };

 return (
 <motion.div
 initial="hidden"
 animate="visible"
 variants={hubContainerVariants}
 className="space-y-12 pb-24"
 >
 {/* 1. Hub Header Matrix */}
 <motion.div variants={hubItemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold tracking-[0.3em] text-primary leading-none px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">커뮤니티</span>
 </div>
 <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter leading-none transition-colors">
 게시글 <span className="text-primary">모아보기</span>
 </h1>
 <p className="text-sm font-bold text-muted-foreground max-w-lg leading-relaxed">
 게시판을 선택해 조직 내 공지와 게시글을 한 곳에서 확인합니다.
 </p>
 </div>
 <div className="flex items-center gap-4">
 <button
 onClick={() => router.push('/admin/community/boards/write')}
 className="h-11 px-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3 group"
 >
 <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" aria-hidden="true" /> 새 게시글
 </button>
 </div>
 </motion.div>

 {/* 2. Search & Filter Matrix */}
 <motion.div variants={hubItemVariants} className="px-2">
 <div className="hub-glass-premium p-8 rounded-lg border-2 border-border/50 shadow-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-focus-within:opacity-10 transition-opacity">
 <Search size={120} className="rotate-12" />
 </div>
 <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-4">
 <div className="relative group/search flex-1">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within/search:text-primary transition-colors" aria-hidden="true" />
 <Input
 value={searchWrd}
 onChange={(e) => {
 setSearchWrd(e.target.value);
 // 감사 P1-8: 3페이지에서 검색하면 빈 화면이 되던 결함 — 검색어 변경 시 첫 페이지로 되돌린다.
 setPage(0);
 }}
 className="h-11 pl-14 bg-card border-2 border-border rounded-lg text-lg font-bold placeholder:text-muted-foreground focus:border-primary/20 focus:ring-0 transition-all shadow-inner"
 placeholder="제목으로 게시글 검색..."
 aria-label="게시글 검색"
 />
 </div>
 <div className="flex gap-3">
 <select
 value={bbsId}
 onChange={(e) => {
 setBbsId(e.target.value);
 setPage(0);
 }}
 className="h-11 px-8 bg-card border-2 border-border rounded-lg font-bold text-xs tracking-widest outline-none focus:border-primary/20 transition-all shadow-sm"
 aria-label="게시판 선택"
 >
 <option value="BBSMSTR_AAAAAAAAAAAA">시스템 공지사항</option>
 <option value="BBSMSTR_BBBBBBBBBBBB">자유게시판</option>
 <option value="BBSMSTR_CCCCCCCCCCCC">갤러리 게시판</option>
 </select>
 {/* 감사 P1-6: 핸들러가 없던 '상세 필터' 버튼은 삭제하고, 실제로 동작하는 새로고침(refetch)만 남긴다. */}
 <Button
 type="button"
 variant="outline"
 onClick={() => void refetch()}
 disabled={isFetching}
 className="h-11 w-14 rounded-lg border-2 border-border p-0 shadow-sm"
 aria-label="목록 새로고침"
 title="목록 새로고침"
 >
 <RefreshCcw size={20} className={cn(isFetching && 'animate-spin')} aria-hidden="true" />
 </Button>
 </div>
 </div>
 </div>
 </motion.div>

 {/* 3. Knowledge Streams Matrix (List) */}
 <motion.div variants={hubItemVariants} className="px-2">
 {isLoading ? (
 <HubListSkeleton />
 ) : isError ? (
 /* 감사 P1-1: 조회 실패를 빈 목록으로 위장하지 않고, 사유와 재시도를 화면에 노출한다. */
 <div
 role="alert"
 className="hub-glass-premium p-16 rounded-lg border-2 border-destructive/30 flex flex-col items-center justify-center text-center space-y-6"
 >
 <AlertTriangle size={48} className="text-destructive-emphasis" aria-hidden="true" />
 <div className="space-y-2">
 <h3 className="text-xl font-bold text-foreground tracking-tight">게시글을 불러오지 못했습니다</h3>
 <p className="text-sm font-medium text-muted-foreground max-w-md mx-auto leading-relaxed">
 {error instanceof Error && error.message ? error.message : '네트워크 또는 서버 오류로 목록 조회에 실패했습니다.'}
 </p>
 </div>
 <Button type="button" onClick={() => void refetch()} className="gap-2">
 <RefreshCcw size={16} aria-hidden="true" /> 다시 시도
 </Button>
 </div>
 ) : posts.length === 0 ? (
 <div className="hub-glass-premium p-32 rounded-lg border-4 border-dashed border-border flex flex-col items-center justify-center text-center space-y-8">
 <Layers size={64} className="text-muted-foreground/40" aria-hidden="true" />
 <div className="space-y-4">
 <h3 className="text-2xl font-bold text-foreground tracking-tight">표시할 게시글이 없습니다</h3>
 <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto leading-relaxed">
 {searchWrd ? `'${searchWrd}' 검색 결과가 없습니다. 다른 검색어를 시도해 보세요.` : '선택한 게시판에 등록된 게시글이 없습니다.'}
 </p>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 {posts.map((item, idx) => (
 <motion.div
 key={item.pstId}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: idx * 0.05 }}
 onClick={() => handleRowClick(item)}
 /* 감사 P1-10: onClick 만 있던 비인터랙티브 div → 키보드(Enter/Space) 조작과 포커스 이동이 가능하도록 보강 */
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 handleRowClick(item);
 }
 }}
 tabIndex={0}
 className="group flex flex-col md:flex-row md:items-center justify-between p-8 bg-card border-2 border-border rounded-lg hover:border-primary/20 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
 role="button"
 aria-label={`${item.pstTtl} 게시글 보기`}
 >
 <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:rotate-12 transition-transform duration-1000 grayscale group-hover:grayscale-0 group-hover:opacity-10 pointer-events-none">
 <MessageSquare size={120} className="text-primary" />
 </div>
 <div className="flex gap-8 items-start md:items-center relative z-10 flex-1">
 <div className="w-16 h-11 rounded-lg bg-muted flex flex-col items-center justify-center border border-border group-hover:bg-primary/5 transition-colors shrink-0">
 {/*
 감사 P1-5/死코드: 과거 `(item as any).noticeYn === 'Y'` 분기는 BoardDto(generated-api.d.ts)에
 존재하지 않는 필드를 캐스팅으로 읽어 항상 false 였다(= 공지 배지가 한 번도 렌더되지 않음).
 계약에 없는 값을 화면 표시의 근거로 삼지 않도록 분기를 제거하고 번호만 표기한다.
 */}
 <span className="text-xs font-bold text-muted-foreground leading-none mb-1">번호</span>
 <span className="text-xl font-bold text-foreground font-mono">{idx + 1 + page * PAGE_SIZE}</span>
 </div>
 <div className="space-y-3 flex-1">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold text-muted-foreground tracking-widest">{item.crtDt?.split(' ')[0]}</span>
 </div>
 <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tighter leading-tight group-hover:text-primary transition-colors ">
 {item.pstTtl}
 </h3>
 {/* 감사 P1-5: 'Access Granted'(권한과 무관한 고정 문구)는 근거 없는 표시라 제거하고, 실제 값만 남긴다. */}
 <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-muted-foreground tracking-tight">
 <span className="flex items-center gap-2 bg-muted px-3 py-1 rounded-lg"><User size={12} className="text-primary" aria-hidden="true" /> {item.userNm}</span>
 <span className="flex items-center gap-2"><Eye size={12} aria-hidden="true" /> 조회 {item.inqCnt ?? 0}</span>
 <span className="flex items-center gap-2"><MessageSquare size={12} aria-hidden="true" /> 댓글 {item.commentCnt ?? 0}</span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4 mt-6 md:mt-0 relative z-10">
 <div className="w-12 h-12 rounded-lg border-2 border-border flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all group-hover:rotate-45">
 <ChevronRight size={20} className="text-muted-foreground/50 group-hover:text-primary transition-colors" aria-hidden="true" />
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 )}
 </motion.div>

 {/* 4. Footer Matrix */}
 <motion.div variants={hubItemVariants} className="flex justify-center pt-10">
 <div className="inline-flex flex-wrap items-center justify-center gap-6 px-10 py-4 bg-muted rounded-lg border border-border shadow-xl">
 <div className="flex items-center gap-3">
 <Sparkles size={16} className="text-primary" aria-hidden="true" />
 <span className="text-xs font-bold text-muted-foreground tracking-widest">총 <span className="text-foreground font-mono">{totalCount.toLocaleString()}</span>건</span>
 </div>
 <div className="w-px h-6 bg-border" />
 <nav className="flex flex-wrap gap-2" aria-label="페이지 이동">
 {Array.from({ length: Math.ceil(totalCount / PAGE_SIZE) }).map((_, i) => (
 <button
 key={i}
 type="button"
 onClick={() => setPage(i)}
 className={cn(
 "w-10 h-10 rounded-lg font-bold text-xs font-mono transition-all",
 page === i
 ? "bg-surface-inverse text-surface-inverse-foreground shadow-lg scale-110"
 : "bg-card text-muted-foreground border border-border hover:border-primary/20 hover:text-primary"
 )}
 aria-label={`${i + 1} 페이지로 이동`}
 aria-current={page === i ? 'page' : undefined}
 >
 {String(i + 1).padStart(2, '0')}
 </button>
 ))}
 </nav>
 </div>
 </motion.div>
 </motion.div>
 );
}

export default function CommunityBoardClient() {
  return (
    <Suspense fallback={
      <div className="space-y-6 max-w-7xl mx-auto px-4 md:px-0 py-8 animate-pulse">
        {/* PageHeader 1:1 스켈레톤 */}
        <div className="flex justify-between items-center pb-6 border-b border-border">
          <div className="space-y-2 w-1/3">
            <div className="h-8 bg-muted rounded-lg w-3/4" />
            <div className="h-4 bg-muted/80 rounded-lg w-1/2" />
          </div>
          <div className="h-10 bg-muted rounded-lg w-28" />
        </div>
        {/* StandardSearchFilter 1:1 스켈레톤 */}
        <div className="h-16 bg-muted/80 rounded-xl border border-border" />
        {/* StandardDataTable 1:1 스켈레톤 */}
        <div className="space-y-3">
          <div className="h-12 bg-muted/80 rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg border border-border" />
          ))}
        </div>
      </div>
    }>
      <CommunityBoardContent />
    </Suspense>
  );
}
