'use client';

import React, { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus,
 Library, BookOpen, MessageCircleQuestion,
 TrendingUp, Users, ArrowRight, Layers, Zap, History, Hash, ChevronRight,
 User, Eye, ShieldAlert, Settings2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { knowledgeService, type KnowledgeDto } from '@/services/business/knowledge/knowledgeService';
import {
 COMMUNITY_BOARD_ID,
 HELP_FAQ_BOARD_ID,
 KNOWLEDGE_FALLBACK_BOARD_ID,
 QNA_BOARD_ID,
 WIKI_BOARD_ID,
} from '@/config/board-ids';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// --- Types ---
type KnowledgeCategory = 'WIKI' | 'FAQ' | 'QNA' | 'COMMUNITY';

const CATEGORY_LABEL: Record<KnowledgeCategory, string> = {
 WIKI: '위키',
 FAQ: '자주 묻는 질문',
 QNA: '기술 Q&A',
 COMMUNITY: '커뮤니티',
};

export default function KnowledgeHubClient({ defaultTab }: { defaultTab?: KnowledgeCategory }) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const { user } = useAuth();

 const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
 const [searchQuery, setSearchQuery] = useState('');
 // 타이핑 한 글자마다 서버 요청이 나가던 것을 300ms 디바운스한다.
 // 입력 컨트롤에는 원본 상태를 바인딩해야 입력 지연이 생기지 않는다.
 const debouncedQuery = useDebouncedValue(searchQuery, 300);
 const [sortBy, setSortBy] = useState<'latest' | 'views'>('latest');

 const resolveCategory = (): KnowledgeCategory => {
 const bbsId = searchParams.get('bbsId');
 if (bbsId === COMMUNITY_BOARD_ID) return 'COMMUNITY';
 if (bbsId === HELP_FAQ_BOARD_ID) return 'FAQ';
 if (bbsId === QNA_BOARD_ID) return 'QNA';
 if (bbsId === WIKI_BOARD_ID) return 'WIKI';

 // 메뉴(tb_menu_info)가 위키·FAQ·Q&A 를 모두 /admin/help/faq?tab=* 로 보내는데
 // 이 값을 읽지 않아 서로 다른 3개 메뉴가 전부 FAQ 화면으로 착지했다.
 const tab = searchParams.get('tab')?.toUpperCase();
 if (tab === 'WIKI' || tab === 'FAQ' || tab === 'QNA' || tab === 'COMMUNITY') {
 return tab;
 }
 return defaultTab || 'WIKI';
 };

 // 카테고리는 URL 파생값이다. 상태를 따로 두면 공유·새로고침·뒤로가기에서 복원되지 않는다.
 const activeCategory: KnowledgeCategory = resolveCategory();

 const selectCategory = (next: KnowledgeCategory) => {
 const params = new URLSearchParams(searchParams.toString());
 params.set('tab', next);
 // bbsId 로 진입한 경우 tab 과 충돌하므로 정리한다(tab 이 우선 해석되지만 링크가 혼란스러워진다).
 params.delete('bbsId');
 router.replace(`${pathname}?${params.toString()}`, { scroll: false });
 };

 const currentBbsId = React.useMemo(() => {
 if (activeCategory === 'COMMUNITY') return COMMUNITY_BOARD_ID;
 if (activeCategory === 'FAQ') return HELP_FAQ_BOARD_ID;
 if (activeCategory === 'QNA') return QNA_BOARD_ID;
 if (activeCategory === 'WIKI') return WIKI_BOARD_ID;
 return KNOWLEDGE_FALLBACK_BOARD_ID; // DEFAULT/NOTICE
 }, [activeCategory]);

 const isAccessRestricted = !isAdmin && (activeCategory === 'WIKI' || activeCategory === 'FAQ');

 // --- Data Fetching ---
 const {
 data: articlesData,
 isLoading,
 isFetching,
 isError: isArticlesError,
 error: articlesError,
 refetch: refetchArticles,
 } = useQuery({
 queryKey: ['knowledge-articles', activeCategory, debouncedQuery, sortBy],
 queryFn: () => knowledgeService.getArticles({
 bbsId: currentBbsId,
 category: activeCategory,
 page: 0,
 size: 20,
 searchCnd: debouncedQuery ? '0' : undefined,
 searchWrd: debouncedQuery || undefined
 }),
 });

 const { data: hotData, isError: isHotError } = useQuery({
 queryKey: ['hot-articles', activeCategory],
 queryFn: () => knowledgeService.getHotArticles(currentBbsId),
 });

 const { data: statsData, isError: isStatsError } = useQuery({
 queryKey: ['knowledge-stats', activeCategory],
 queryFn: () => knowledgeService.getStats(currentBbsId),
 });

 const { data: activityData, isError: isActivityError } = useQuery({
 queryKey: ['knowledge-activities', activeCategory],
 queryFn: () => knowledgeService.getActivities(currentBbsId),
 });

 const displayItems: KnowledgeDto[] = React.useMemo(() => {
 const items = articlesData?.list || [];
 if (sortBy === 'views') {
 return [...items].sort((a, b) => (b.inqCnt || 0) - (a.inqCnt || 0));
 }
 return items;
 }, [articlesData, sortBy]);

 const hotItems: KnowledgeDto[] = hotData?.list || [];
 const isSearching = searchQuery !== debouncedQuery || isFetching;

 return (
 <motion.div
 initial="hidden"
 animate="visible"
 variants={hubContainerVariants}
 className="space-y-12 pb-24"
 >
 {/* 1. Global Navigation Matrix */}
 <motion.div variants={hubItemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 px-2">
 <div className="space-y-1.5 md:space-y-2">
 <div className="flex items-center gap-2 md:gap-3">
 <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
 <span className="text-xs md:text-xs font-bold tracking-tight text-primary leading-none">지식 허브 콘솔</span>
 </div>
 <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tighter leading-none">지식 매트릭스</h2>
 </div>
 <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
 {isAdmin && (
 <Button
 onClick={() => router.push('/admin/community/boards/master')}
 variant="outline"
 className="h-12 md:h-11 px-4 md:px-8 rounded-lg border-2 border-border bg-card text-foreground font-bold tracking-tight text-xs hover:bg-muted hover:scale-105 active:scale-95 transition-all shadow-xl gap-2 md:gap-3 group whitespace-nowrap"
 >
 <Settings2 className="w-[14px] md:w-[18px] h-[14px] md:h-[18px] group-hover:rotate-180 transition-transform text-primary" /> 게시판 관리
 </Button>
 )}
 <Button
 onClick={() => router.push(`/admin/community/boards/insert-board-article?bbsId=${currentBbsId}`)}
 className="h-12 md:h-11 px-4 md:px-8 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-xl gap-2 md:gap-3 group whitespace-nowrap"
 >
 <Plus className="w-[14px] md:w-[18px] h-[14px] md:h-[18px] group-hover:rotate-90 transition-transform" /> 신규 등록
 </Button>
 </div>
 </motion.div>

 {/* 2. Intelligent Search Matrix */}
 <motion.div variants={hubItemVariants} className="relative h-[280px] md:h-[360px] rounded-lg bg-surface-inverse overflow-hidden flex flex-col items-center justify-center p-6 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border-none mx-2">
 <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-rose-500/10 opacity-60" />

 {isSearching && (
 <motion.div
 initial={{ top: '-10%' }}
 animate={{ top: '110%' }}
 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
 className="absolute left-0 right-0 h-[2px] bg-primary/40 blur-sm z-10"
 />
 )}

 <div className="relative z-20 text-center w-full max-w-4xl space-y-8 px-2 font-sans">
 <div className="space-y-3">
 <h1 className="text-3xl md:text-5xl font-bold text-surface-inverse-foreground tracking-tighter leading-none">지식 베이스</h1>
 <p className="text-xs md:text-sm font-bold text-surface-inverse-muted">{CATEGORY_LABEL[activeCategory]} 데이터셋</p>
 </div>

 <div className="space-y-6">
 <div className="relative group max-w-3xl mx-auto w-full">
 <label htmlFor="knowledge-search" className="sr-only">지식 검색어</label>
 <Search className={cn(
 "absolute left-6 md:left-8 top-1/2 -translate-y-1/2 transition-all scale-110 md:scale-150 duration-500 pointer-events-none",
 isSearching ? "text-primary" : "text-surface-inverse-muted group-focus-within:text-primary",
 "w-[18px] md:w-[20px] h-[18px] md:h-[20px]"
 )} />
 <Input
 id="knowledge-search"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-14 md:h-20 bg-white/5 border-2 border-white/5 rounded-lg px-16 md:px-24 text-surface-inverse-foreground text-lg md:text-2xl font-bold placeholder:text-surface-inverse-muted focus:bg-card focus:text-foreground transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] focus:ring-[16px] focus:ring-primary/10 tracking-tight"
 placeholder="제목·내용 검색..."
 />
 </div>

 <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
 <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-lg backdrop-blur-xl">
 <FilterButton active={sortBy === 'latest'} onClick={() => setSortBy('latest')} label="최신순" />
 <FilterButton active={sortBy === 'views'} onClick={() => setSortBy('views')} label="조회순" />
 </div>
 <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
 <div className="text-xs font-bold text-surface-inverse-muted tracking-tight">
 {isArticlesError ? '조회 실패' : `총 ${(articlesData?.total ?? 0).toLocaleString()}건`}
 </div>
 </div>
 </div>
 </div>
 </motion.div>

 {/* 3. Stats & Insights Matrix — 백엔드 /boards/{bbsId}/stats 실측값만 표기한다.
 종전의 '+12% Critical' 류 증감 배지는 산출 근거가 없어 제거했다. */}
 <motion.div variants={hubItemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 px-2">
 <StatsCard
 label="지식 지수"
 value={isStatsError ? '조회 실패' : (statsData?.intelligenceScore != null ? `${Math.round(statsData.intelligenceScore)}/100` : '-')}
 desc="게시판 활성도 지표"
 />
 <StatsCard
 label="누적 조회수"
 value={isStatsError ? '조회 실패' : (statsData?.totalViews ?? 0).toLocaleString()}
 desc="이 게시판의 전체 조회수"
 />
 <StatsCard
 label="최다 기여자"
 value={isStatsError ? '조회 실패' : (statsData?.topContributor || '-')}
 desc="게시글 등록이 가장 많은 사용자"
 />
 </motion.div>

 {/* 4. Category Matrix — 건수는 집계 API 가 없어 표기하지 않는다(종전 142/28/567/12 는 하드코딩이었다). */}
 <motion.div variants={hubItemVariants} className="px-2 overflow-hidden">
 <div
 role="tablist"
 aria-label="지식 카테고리"
 className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-auto sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 overflow-x-auto"
 >
 <CategoryCard title="위키" desc="기술 사양" icon={<Library size={28} />} color="primary" active={activeCategory === 'WIKI'} onClick={() => selectCategory('WIKI')} />
 <CategoryCard title="자주 묻는 질문" desc="빠른 답변" icon={<BookOpen size={28} />} color="amber" active={activeCategory === 'FAQ'} onClick={() => selectCategory('FAQ')} />
 <CategoryCard title="기술 Q&A" desc="포럼 해결" icon={<MessageCircleQuestion size={28} />} color="rose" active={activeCategory === 'QNA'} onClick={() => selectCategory('QNA')} />
 <CategoryCard title="커뮤니티" desc="활성 게시판" icon={<Users size={28} />} color="emerald" active={activeCategory === 'COMMUNITY'} onClick={() => selectCategory('COMMUNITY')} />
 </div>
 </motion.div>

 {/* 5. Main Content Matrix */}
 <motion.div variants={hubItemVariants} className="grid grid-cols-12 gap-10 px-2 mt-4 relative z-0">
 <div className="col-span-12 lg:col-span-8 space-y-10">
 <HubSectionCard title="지식 스트림" description="선택한 카테고리의 최신 등록 문서입니다." icon={Layers} id="knowledge-stream-panel">
 <div className="space-y-6">
 <AnimatePresence mode="popLayout">
 {isAccessRestricted ? (
 <motion.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center p-16 space-y-8 bg-muted border-2 border-dashed rounded-lg border-primary/20"
 >
 <div className="w-24 h-24 rounded-lg bg-card shadow-2xl flex items-center justify-center text-primary border-2 border-primary/10">
 <ShieldAlert size={48} />
 </div>
 <div className="text-center space-y-4 max-w-sm">
 <h3 className="text-2xl font-bold text-foreground tracking-tighter leading-none">접근 권한 없음</h3>
 <p className="text-sm font-bold text-muted-foreground leading-relaxed">현재 권한으로는 위키·FAQ 데이터셋에 접근할 수 없습니다. 시스템 관리자에게 권한을 요청하십시오.</p>
 </div>
 <Button
 onClick={() => selectCategory('COMMUNITY')}
 variant="outline"
 className="h-11 px-8 rounded-lg border-2 font-bold tracking-tight text-xs gap-3 shadow-xl hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all"
 >
 <ArrowRight size={16} /> 커뮤니티로 이동
 </Button>
 </motion.div>
 ) : isArticlesError ? (
 // 조회 실패를 '데이터 없음'으로 위장하지 않는다.
 <div role="alert" className="flex flex-col items-center justify-center gap-4 p-16 border-2 border-dashed rounded-lg border-rose-300 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20">
 <AlertTriangle size={32} className="text-rose-500" />
 <p className="text-sm font-bold text-foreground">지식 목록을 불러오지 못했습니다.</p>
 {articlesError instanceof Error && (
 <p className="text-xs font-medium text-muted-foreground">{articlesError.message}</p>
 )}
 <Button variant="outline" size="sm" className="gap-2" onClick={() => void refetchArticles()}>
 <RefreshCcw size={14} /> 다시 시도
 </Button>
 </div>
 ) : (
 <>
 {isLoading ? (
 <div className="p-12 text-center text-muted-foreground animate-pulse">지식 스트림을 불러오는 중입니다...</div>
 ) : displayItems.length === 0 ? (
 <div className="flex flex-col items-center justify-center p-20 space-y-4 border-2 border-dashed rounded-lg border-border/50">
 <Hash size={40} className="text-muted-foreground/20" />
 <p className="text-muted-foreground font-bold text-sm tracking-tight text-center">
 {debouncedQuery ? `'${debouncedQuery}' 에 대한 검색 결과가 없습니다.` : '등록된 지식 문서가 없습니다.'}
 </p>
 </div>
 ) : displayItems.map((item) => (
 <motion.button
 layout
 type="button"
 key={item.pstSn}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 onClick={() => router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&nttId=${item.pstSn}`)}
 aria-label={`${item.pstTtl} 상세 보기`}
 className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-8 bg-card border border-border/40 rounded-lg hover:ring-[15px] md:hover:ring-[20px] hover:ring-primary/5 hover:border-primary/20 transition-all cursor-pointer group shadow-sm hover:shadow-2xl text-left"
 >
 <div className="flex gap-4 md:gap-6 items-start">
 {/* 종전 '영향력 85~99' 배지는 조회수에서 임의 산출한 가짜 지표라 실제 조회수로 대체했다. */}
 <div className="w-16 h-16 rounded-lg bg-muted flex flex-col items-center justify-center border border-border/50 group-hover:bg-primary/5 transition-colors shrink-0">
 <span className="text-[10px] font-bold text-muted-foreground leading-none">조회</span>
 <span className="text-base font-bold text-foreground leading-none mt-1 tabular-nums">{(item.inqCnt || 0).toLocaleString()}</span>
 </div>
 <div className="space-y-1 md:space-y-2 min-w-0">
 <div className="flex items-center gap-2 md:gap-3">
 <span className="text-xs font-bold text-primary tracking-tight bg-primary/5 px-2 py-0.5 rounded leading-none whitespace-nowrap">{CATEGORY_LABEL[activeCategory]}</span>
 <span className="text-xs font-bold text-muted-foreground">{item.frstRegisterPnttmStr}</span>
 </div>
 <h4 className="text-lg md:text-2xl font-bold text-foreground tracking-tighter leading-tight group-hover:text-primary transition-colors line-clamp-1">{item.pstTtl}</h4>
 <div className="flex items-center gap-3 md:gap-4 text-muted-foreground">
 <div className="flex items-center gap-1.5"><User size={12} className="text-primary" /><span className="text-xs font-bold truncate max-w-[120px]">{item.frstRegisterNm || item.frstRgtrId || '-'}</span></div>
 <div className="flex items-center gap-1.5"><Eye size={12} /><span className="text-xs font-bold">{(item.inqCnt || 0).toLocaleString()}</span></div>
 </div>
 </div>
 </div>
 <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-4">
 <div className="hidden sm:flex flex-col items-end">
 <span className="text-xs font-bold text-muted-foreground tracking-tight leading-none">상태</span>
 <StatusBadge status={item.statusCd} type={activeCategory} />
 </div>
 <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all w-5 h-5 md:w-6 md:h-6" />
 </div>
 </motion.button>
 ))}
 </>
 )}
 </AnimatePresence>
 </div>
 </HubSectionCard>
 </div>

 <div className="col-span-12 lg:col-span-4 space-y-10">
 <HubSectionCard title="인기 문서" description="조회수가 높은 문서" icon={TrendingUp}>
 <div className="space-y-4">
 {isHotError ? (
 <p role="alert" className="py-8 text-center text-xs font-bold text-rose-500">인기 문서를 불러오지 못했습니다.</p>
 ) : hotItems.length === 0 ? (
 <p className="py-8 text-center text-xs font-bold text-muted-foreground">표시할 문서가 없습니다.</p>
 ) : hotItems.map((item, idx) => (
 <button
 type="button"
 key={item.pstSn}
 onClick={() => router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&nttId=${item.pstSn}`)}
 aria-label={`${item.pstTtl} 상세 보기`}
 className="w-full flex items-center gap-5 p-4 rounded-lg hover:bg-muted transition-all cursor-pointer group text-left"
 >
 <span className="text-3xl font-bold text-muted-foreground group-hover:text-primary transition-colors w-8 tabular-nums">{idx + 1}</span>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold text-foreground tracking-tight truncate leading-none">{item.pstTtl}</p>
 <div className="flex items-center gap-2 mt-2">
 <Eye size={10} className="text-muted-foreground" />
 <span className="text-xs font-bold text-muted-foreground tabular-nums">{(item.inqCnt || 0).toLocaleString()} 조회</span>
 </div>
 </div>
 <ChevronRight size={16} className="text-muted-foreground" />
 </button>
 ))}
 </div>
 </HubSectionCard>

 <HubSectionCard title="최근 활동" description="최근 등록된 문서 흐름" icon={History} className="hub-card-dark shadow-2xl relative">
 <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none grayscale rotate-12">
 <History size={120} />
 </div>
 <div className="space-y-6 relative z-10 font-sans">
 {isActivityError ? (
 <p role="alert" className="py-8 text-center text-xs font-bold text-rose-400">최근 활동을 불러오지 못했습니다.</p>
 ) : (activityData || []).length === 0 ? (
 <p className="py-8 text-center text-xs font-bold text-surface-inverse-muted">표시할 활동이 없습니다.</p>
 ) : (activityData || []).slice(0, 5).map((activity: { id: string; title: string; user: string; time: string }) => (
 <div key={activity.id} className="flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-all group/activity shadow-lg backdrop-blur-3xl">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/activity:rotate-12 transition-all">
 <Zap size={18} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-bold text-white/90 tracking-tight truncate leading-none mb-1.5">{activity.title}</p>
 <div className="flex items-center gap-3 text-surface-inverse-muted">
 <span className="text-xs font-bold tracking-tight">{activity.user}</span>
 <div className="w-1 h-1 rounded-full bg-white/60" />
 <span className="text-xs font-bold tracking-tight tabular-nums">{activity.time}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </HubSectionCard>
 </div>
 </motion.div>
 </motion.div>
 );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
 return (
 <button
 type="button"
 onClick={onClick}
 aria-pressed={active}
 className={cn(
 "px-6 py-2 rounded-lg text-xs font-bold tracking-tight transition-all",
 active
 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
 : "text-surface-inverse-muted hover:text-surface-inverse-foreground hover:bg-white/5"
 )}
 >
 {label}
 </button>
 );
}

function StatsCard({ label, value, desc }: { label: string, value: string, desc: string }) {
 return (
 <div className="hub-card-premium p-8 flex flex-col gap-4 group hover:ring-[20px] hover:ring-primary/5 transition-all">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground tracking-tight">{label}</span>
 <TrendingUp size={14} className="text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
 </div>
 <div className="space-y-1">
 <h4 className="text-4xl font-bold tracking-tighter text-foreground tabular-nums group-hover:text-primary transition-colors">{value}</h4>
 <p className="text-xs font-bold text-muted-foreground tracking-tight">{desc}</p>
 </div>
 </div>
 );
}

function StatusBadge({ status, type }: { status?: string, type: KnowledgeCategory }) {
 if (type === 'QNA') {
 const isSolved = status === 'SOLVED';
 return (
 <span className={cn(
 "text-xs font-bold mt-1",
 isSolved ? "text-emerald-500" : "text-rose-500"
 )}>
 {isSolved ? '해결됨' : '미해결'}
 </span>
 );
 }

 if (type === 'WIKI') {
 const isPublished = status === 'PUBLISHED';
 return (
 <span className={cn(
 "text-xs font-bold mt-1",
 isPublished ? "text-primary" : "text-muted-foreground"
 )}>
 {isPublished ? '게시됨' : '초안'}
 </span>
 );
 }

 return (
 <span className="text-xs font-bold text-success-emphasis mt-1">
 공개
 </span>
 );
}

function CategoryCard({ title, desc, icon, color, active, onClick }: {
 title: string;
 desc: string;
 icon: React.ReactNode;
 color: 'primary' | 'amber' | 'rose' | 'emerald';
 active: boolean;
 onClick: () => void;
}) {
 const colorMap: Record<string, string> = {
 primary: "text-primary border-primary/20 bg-primary/5",
 amber: "text-amber-500 border-amber-500/20 bg-amber-500/5",
 rose: "text-rose-500 border-rose-500/20 bg-rose-500/5",
 emerald: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
 };

 return (
 <button
 type="button"
 role="tab"
 aria-selected={active}
 aria-controls="knowledge-stream-panel"
 onClick={onClick}
 className={cn(
 "relative p-8 rounded-lg border-2 transition-all duration-500 cursor-pointer group flex flex-col gap-6 text-left w-full",
 active
 ? "border-primary bg-primary/5 shadow-2xl scale-105"
 : "border-border/40 bg-card hover:border-primary/20 hover:ring-[20px] hover:ring-primary/5"
 )}
 >
 <div className={cn("w-16 h-16 rounded-lg flex items-center justify-center shadow-inner", colorMap[color])}>
 {icon}
 </div>
 <div className="space-y-1">
 <h3 className="font-bold text-2xl tracking-tighter text-foreground leading-none">{title}</h3>
 <p className="text-xs font-bold text-muted-foreground tracking-tight">{desc}</p>
 </div>
 <div className={cn("absolute bottom-8 right-8 w-1 h-8 rounded-lg transition-transform", active ? "bg-primary scale-y-100" : "bg-border scale-y-0 group-hover:scale-y-50")} />
 </button>
 );
}

function HubSectionCard({ title, description, icon: Icon, children, className, id }: {
 title: string;
 description: string;
 icon: React.ElementType;
 children: React.ReactNode;
 className?: string;
 id?: string;
}) {
 return (
 <div id={id} className={cn("hub-card-premium p-10 space-y-8", className)}>
 <div className="flex items-center justify-between border-b border-border/40 pb-6">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary shadow-inner border border-border/50">
 <Icon size={20} />
 </div>
 <div className="space-y-0.5">
 <h3 className="text-xl font-bold text-foreground tracking-tighter leading-none">{title}</h3>
 <p className="text-xs font-bold text-muted-foreground tracking-tight">{description}</p>
 </div>
 </div>
 </div>
 {children}
 </div>
 );
}
