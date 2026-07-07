'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Plus,  Eye,  Megaphone,  Loader2,
 Search,  Filter,  ChevronRight,  MessageSquare,
 User,  Clock,  Layers,  Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { BoardPost } from '@/types/business/board';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { HubListSkeleton } from '@/components/ui/hub/HubSkeleton';

const DEFAULT_BBS_ID = 'BBSMSTR_AAAAAAAAAAAA'; // 공지사항 기본값

function CommunityBoardContent() {
 const router = useRouter();
 const params = useParams();
 const searchParams = useSearchParams();
 const { toast } = useToast();

 const [searchWrd, setSearchWrd] = useState('');
 const [bbsId, setBbsId] = useState(searchParams.get('bbsId') || DEFAULT_BBS_ID);
 const [page, setPage] = useState(0);

 const { data: boardData, isLoading } = useQuery({
 queryKey: ['community-board', bbsId, searchWrd, page],
 queryFn: () => boardUserService.getPosts(bbsId, {
 page: page,
 size: 10,
 searchWrd: searchWrd,
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
 <div className="w-2 h-2 rounded-lg bg-primary animate-ping" />
 <span className="text-xs font-bold tracking-[0.5em] text-primary uppercase leading-none px-3 py-1 bg-primary/5 rounded-lg border border-primary/10">Board Intelligence</span>
 </div>
 <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tighter uppercase leading-none transition-colors">
 Knowledge <span className="text-primary">Stream</span>
 </h1>
 <p className="text-sm font-bold text-slate-400 max-w-lg leading-relaxed uppercase tracking-widest ">
 Real-time synchronization of organizational knowledge nodes and business insights.
 </p>
 </div>
 <div className="flex items-center gap-4">
 <button
 onClick={() => router.push('/admin/community/boards/write')}
 className="h-11 px-10 rounded-lg bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3 group"
 >
 <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Create New Node
 </button>
 </div>
 </motion.div>

 {/* 2. Search & Filter Matrix */}
 <motion.div variants={hubItemVariants} className="px-2">
 <div className="hub-glass-premium p-8 rounded-lg border-2 border-slate-100/50 shadow-2xl flex flex-col md:flex-row gap-6 relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-focus-within:opacity-10 transition-opacity">
 <Search size={120} className="rotate-12" />
 </div>
 <div className="relative z-10 flex-1 flex flex-col md:flex-row gap-4">
 <div className="relative group/search flex-1">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/search:text-primary transition-colors" />
 <Input
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 className="h-11 pl-14 bg-white/50 border-2 border-slate-100 rounded-lg text-lg font-bold placeholder:text-slate-200 focus:border-primary/20 focus:ring-0 transition-all shadow-inner"
 placeholder="데이터셋 내 지식 검색..."
 aria-label="게시글 검색"
 />
 </div>
 <div className="flex gap-3">
 <select
 value={bbsId}
 onChange={(e) => setBbsId(e.target.value)}
 className="h-11 px-8 bg-white border-2 border-slate-100 rounded-lg font-bold text-xs tracking-widest uppercase outline-none focus:border-primary/20 transition-all shadow-sm"
 aria-label="게시판 선택"
 >
 <option value="BBSMSTR_AAAAAAAAAAAA">시스템 공지사항</option>
 <option value="BBSMSTR_BBBBBBBBBBBB">자유게시판</option>
 <option value="BBSMSTR_CCCCCCCCCCCC">갤러리 게시판</option>
 </select>
 <Button variant="outline" className="h-11 w-14 rounded-lg border-2 border-slate-100 p-0 shadow-sm" aria-label="상세 필터">
 <Filter size={20} />
 </Button>
 </div>
 </div>
 </div>
 </motion.div>

 {/* 3. Knowledge Streams Matrix (List) */}
 <motion.div variants={hubItemVariants} className="px-2">
 {isLoading ? (
 <HubListSkeleton />
 ) : posts.length === 0 ? (
 <div className="hub-glass-premium p-32 rounded-lg border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-8 grayscale opacity-50">
 <Layers size={64} className="text-slate-200" />
 <div className="space-y-4">
 <h3 className="text-2xl font-bold text-slate-900 tracking-tighter uppercase ">No Data Nodes Found</h3>
 <p className="text-xs font-bold text-slate-400 max-w-xs mx-auto tracking-widest leading-relaxed uppercase">
 지정된 매트릭스 내에 활성화된 데이터 노드가 존재하지 않습니다.
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
 className="group flex flex-col md:flex-row md:items-center justify-between p-8 bg-white border-2 border-slate-50 rounded-lg hover:border-primary/20 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden"
 role="button"
 aria-label={`${item.pstTtl} 게시글 보기`}
 >
 <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:rotate-12 transition-transform duration-1000 grayscale group-hover:grayscale-0 group-hover:opacity-10 pointer-events-none">
 <MessageSquare size={120} className="text-primary" />
 </div>
 <div className="flex gap-8 items-start md:items-center relative z-10 flex-1">
 <div className="w-16 h-11 rounded-lg bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors shrink-0">
 {(item as any).noticeYn === 'Y' ? (
 <Megaphone size={24} className="text-primary animate-bounce" />
 ) : (
 <>
 <span className="text-xs font-bold text-slate-400 uppercase leading-none mb-1">Index</span>
 <span className="text-xl font-bold text-slate-900 font-mono">{idx + 1 + page * 10}</span>
 </>
 )}
 </div>
 <div className="space-y-3 flex-1">
 <div className="flex items-center gap-3">
 {(item as any).noticeYn === 'Y' && <Badge className="bg-primary text-white font-bold text-xs uppercase tracking-widest border-none">Emergency</Badge>}
 <span className="text-xs font-bold text-slate-400 tracking-widest uppercase ">{item.crtDt?.split(' ')[0]}</span>
 </div>
 <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tighter leading-tight group-hover:text-primary transition-colors ">
 {item.pstTtl}
 </h3>
 <div className="flex flex-wrap items-center gap-6 text-xs font-bold text-slate-500 uppercase tracking-tight">
 <span className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-lg"><User size={12} className="text-primary" /> {item.userNm}</span>
 <span className="flex items-center gap-2"><Eye size={12} /> {item.inqCnt} Interactions</span>
 <span className="flex items-center gap-2"><Clock size={12} /> Access Granted</span>
 </div>
 </div>
 </div>
 <div className="flex items-center gap-4 mt-6 md:mt-0 relative z-10">
 <div className="w-12 h-12 rounded-lg border-2 border-slate-50 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all group-hover:rotate-45">
 <ChevronRight size={20} className="text-slate-300 group-hover:text-primary transition-colors" />
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 )}
 </motion.div>

 {/* 4. Footer Matrix */}
 <motion.div variants={hubItemVariants} className="flex justify-center pt-10">
 <div className="inline-flex items-center gap-8 px-10 py-4 bg-slate-50 rounded-lg border border-slate-100 shadow-xl group/footer">
 <div className="flex items-center gap-3">
 <Sparkles size={16} className="text-primary animate-pulse" />
 <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] ">Intelligence_Node_Total: <span className="text-slate-900 font-mono">{totalCount}</span></span>
 </div>
 <div className="w-px h-6 bg-slate-200" />
 <div className="flex gap-2">
 {Array.from({ length: Math.ceil(totalCount / 10) }).map((_, i) => (
 <button
 key={i}
 onClick={() => setPage(i)}
 className={cn(
 "w-10 h-10 rounded-lg font-bold text-xs font-mono transition-all",
 page === i
 ? "bg-slate-900 text-white shadow-lg scale-110"
 : "bg-white text-slate-400 border border-slate-100 hover:border-primary/20 hover:text-primary"
 )}
 aria-label={`${i + 1} 페이지로 이동`}
 >
 {String(i + 1).padStart(2, '0')}
 </button>
 ))}
 </div>
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
        <div className="flex justify-between items-center pb-6 border-b border-slate-100">
          <div className="space-y-2 w-1/3">
            <div className="h-8 bg-slate-200 rounded-lg w-3/4" />
            <div className="h-4 bg-slate-100/80 rounded-lg w-1/2" />
          </div>
          <div className="h-10 bg-slate-200 rounded-lg w-28" />
        </div>
        {/* StandardSearchFilter 1:1 스켈레톤 */}
        <div className="h-16 bg-slate-100/80 rounded-xl border border-slate-100" />
        {/* StandardDataTable 1:1 스켈레톤 */}
        <div className="space-y-3">
          <div className="h-12 bg-slate-200/80 rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-slate-100/50 rounded-lg border border-slate-50" />
          ))}
        </div>
      </div>
    }>
      <CommunityBoardContent />
    </Suspense>
  );
}
