'use client';

import React, { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus,
 Library, BookOpen, MessageCircleQuestion,
 TrendingUp, Users, ArrowRight, Layers, Zap, History, Hash, ChevronRight,
 User, Eye, Settings2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { knowledgeService, type KnowledgeDto } from '@/services/business/knowledge/knowledgeService';
import {
 COMMUNITY_BOARD_ID,
 HELP_FAQ_BOARD_ID,
 NOTICE_BOARD_ID,
 QNA_BOARD_ID,
 WIKI_BOARD_ID,
} from '@/config/board-ids';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { canPermission } from '@/lib/auth/permissions';
import { isQnaSolved } from '@/services/business/user/help/HelpUserService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PagePagination } from '@/components/common/PagePagination';
import { CommunityManageDialog } from '@/components/business/community/CommunityManageDialog';

// --- Types ---
type KnowledgeCategory = 'WIKI' | 'FAQ' | 'QNA' | 'COMMUNITY';

const CATEGORY_LABEL: Record<KnowledgeCategory, string> = {
 WIKI: '위키',
 FAQ: '자주 묻는 질문',
 QNA: '질의응답(Q&A)',
 COMMUNITY: '커뮤니티',
};

export default function KnowledgeHubClient({ defaultTab }: { defaultTab?: KnowledgeCategory }) {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const { user } = useAuth();

 // [2026-08-28] 리터럴 비교는 SYSTEM·ROLE_SYSTEM 을 빠뜨려 **권한 있는 관리자에게 기능이
 //   사라진다**. proxy 의 /admin 게이트는 4종을 전부 통과시키므로, 라우트는 열어 주는데
 //   화면만 막히는 비대칭이 된다 — DEC-OPS-023 ②가 계약으로 막으려던 형태다.
 const canReadBoardMasters = canPermission(user, 'BBS_MST_READ');
 const canManageCommunities = canPermission(user, 'COMMUNITY_READ_ALL');
 // [2026-09-06 DEC-OPS-037] 커뮤니티 생성·수정·폐쇄(감사 D07-01). 관리자이고 커뮤니티 탭일 때만 버튼을 그린다.
 const [communityManageOpen, setCommunityManageOpen] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 // 타이핑 한 글자마다 서버 요청이 나가던 것을 300ms 디바운스한다.
 // 입력 컨트롤에는 원본 상태를 바인딩해야 입력 지연이 생기지 않는다.
 const debouncedQuery = useDebouncedValue(searchQuery, 300);
 const [sortBy, setSortBy] = useState<'latest' | 'views'>('latest');
 const [pagination, setPagination] = useState({ context: '', page: 1 });

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
 const pageContext = JSON.stringify([activeCategory, debouncedQuery, sortBy]);
 const page = pagination.context === pageContext ? pagination.page : 1;

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
 /*
  * 종전 폴백 KNOWLEDGE_FALLBACK_BOARD_ID('BBSMSTR_NNNNNNNNNNNN')는 Flyway 시드에도
  * sql/seed_knowledge_boards.sql 에도 없다(전량 grep 실측 — 등장처가 테스트 목뿐이다).
  * DEFAULT/NOTICE 라는 주석의 의도대로 실재하는 공지 게시판을 쓴다.
  */
 return NOTICE_BOARD_ID; // DEFAULT/NOTICE
 }, [activeCategory]);

 /*
   [2026-08-29] 비관리자의 WIKI·FAQ 차단(isAccessRestricted)을 제거했다.

   그 차단은 **집행자가 없는 인가 주장**이었다. 서버는 게시판 읽기에 역할 게이트가 한 겹도
   없고(BoardApiController 는 클래스 레벨 @Authenticated 뿐, secure-paths 에 /api/v1/boards
   없음), 같은 사용자가 같은 데이터를 세 경로로 이미 받는다 — ① 이 화면 사이드바의 인기 문서·
   최근 활동 ② /admin/community/board 의 게시판 선택기(비관리자 폴백 목록이 WIKI 게시판을
   '일정 게시판' 으로 **의도적으로 포함**한다: use-board-options.ts) ③ GET /boards/{bbsId} 직접 호출.

   그래서 화면은 "접근 권한 없음 · 관리자에게 권한을 요청하십시오" 라고 말하면서 바로 옆에서
   그 게시판의 제목·조회수·작성자를 보여 주고 상세까지 열어 줬다. 요청할 권한도 없다.

   벽을 화면 전체로 넓히는 쪽은 택하지 않았다 — 보호는 그대로 0인데 제품이 명시적으로 부여한
   접근을 화면에서만 빼앗기 때문이다. 이 파일은 /admin/help·faq·qna 와 /admin/community 네
   라우트를 렌더하고, 그중 /admin/community 는 일반 사용자의 정상 착지 화면이다.

   실제 board ACL 이 서버에 생기면 그때 정직한 차단을 만든다(authorization-claim-honesty 계약이
   서버 상태가 바뀌는 순간 재판정을 요구하며 red 가 된다).
 */

 // --- Data Fetching ---
 const {
 data: articlesData,
 isLoading,
 isFetching,
 isError: isArticlesError,
 error: articlesError,
 refetch: refetchArticles,
 } = useQuery({
 queryKey: ['knowledge-articles', activeCategory, debouncedQuery, sortBy, page],
 queryFn: () => knowledgeService.getArticles({
 bbsId: currentBbsId,
 category: activeCategory,
 page: page - 1,
 size: 20,
 orderBy: sortBy === 'views' ? 'views' : 'date',
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

 const displayItems: KnowledgeDto[] = articlesData?.list || [];

 const hotItems: KnowledgeDto[] = hotData?.list || [];
 const isSearching = searchQuery !== debouncedQuery || isFetching;

 return (
 <motion.div
 initial="hidden"
 animate="visible"
 variants={hubContainerVariants}
 className="space-y-6 pb-8"
 >
 <div className="flex flex-wrap items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-foreground">{CATEGORY_LABEL[activeCategory]}</h1>
 <p className="mt-1 text-sm text-muted-foreground">문서를 검색하고 필요한 내용을 확인하세요.</p>
 </div>
 <div className="flex flex-wrap gap-2">
 {canReadBoardMasters && <Button variant="outline" onClick={() => router.push('/admin/community/boards/master')}><Settings2 size={16} aria-hidden="true" /> 게시판 관리</Button>}
 {canManageCommunities && activeCategory === 'COMMUNITY' && <Button variant="outline" onClick={() => setCommunityManageOpen(true)}><Users size={16} aria-hidden="true" /> 커뮤니티 관리</Button>}
 <Button onClick={() => router.push(`/admin/community/boards/insert-board-article?bbsId=${currentBbsId}`)}><Plus size={16} aria-hidden="true" /> 신규 등록</Button>
 </div>
 </div>
 <section aria-label="지식 조회 조건" className="space-y-3 rounded-lg border border-border bg-card p-4">
 <label htmlFor="knowledge-search" className="text-sm font-medium">지식 검색어</label>
 <div className="relative">
 <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input id="knowledge-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10 placeholder:text-muted-foreground" placeholder="제목·내용 검색..." />
 </div>
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div className="flex gap-2" aria-label="문서 정렬">
 <FilterButton active={sortBy === 'latest'} onClick={() => setSortBy('latest')} label="최신순" />
 <FilterButton active={sortBy === 'views'} onClick={() => setSortBy('views')} label="조회순" />
 </div>
 <p role="status" className="text-sm text-muted-foreground">{isArticlesError ? '조회 실패' : isSearching ? '검색 중…' : `총 ${(articlesData?.total ?? 0).toLocaleString()}건`}</p>
 </div>
 </section>

 {/* 4. Category Matrix — 건수는 집계 API 가 없어 표기하지 않는다(종전 142/28/567/12 는 하드코딩이었다). */}
 <motion.div variants={hubItemVariants} className="px-2 overflow-hidden">
 <div
 role="tablist"
 aria-label="지식 카테고리"
 className="grid grid-cols-2 gap-2 md:grid-cols-4"
 >
 <CategoryCard title="위키" desc="기술 사양" icon={<Library size={28} />} color="primary" active={activeCategory === 'WIKI'} onClick={() => selectCategory('WIKI')} />
 <CategoryCard title="자주 묻는 질문" desc="빠른 답변" icon={<BookOpen size={28} />} color="amber" active={activeCategory === 'FAQ'} onClick={() => selectCategory('FAQ')} />
 <CategoryCard title="질의응답(Q&A)" desc="질문과 답변" icon={<MessageCircleQuestion size={28} />} color="rose" active={activeCategory === 'QNA'} onClick={() => selectCategory('QNA')} />
 <CategoryCard title="커뮤니티" desc="활성 게시판" icon={<Users size={28} />} color="emerald" active={activeCategory === 'COMMUNITY'} onClick={() => selectCategory('COMMUNITY')} />
 </div>
 </motion.div>

 {/* 5. Main Content Matrix */}
 <motion.div variants={hubItemVariants} className="grid grid-cols-12 gap-6 relative z-0">
 <div className="col-span-12 lg:col-span-8 space-y-10">
 <HubSectionCard title="문서 목록" description={sortBy === 'views' ? '전체 검색 결과의 조회수 순입니다.' : '전체 검색 결과의 최신 등록 순입니다.'} icon={Layers} id="knowledge-stream-panel">
 <div className="space-y-6">
 <AnimatePresence mode="popLayout">
 {isArticlesError ? (
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
 onClick={() => router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&pstSn=${item.pstSn}`)}
 aria-label={`${item.pstTtl} 상세 보기`}
 className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors cursor-pointer group text-left"
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
 <h4 className="text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-1">{item.pstTtl}</h4>
 <div className="flex items-center gap-3 md:gap-4 text-muted-foreground">
 <div className="flex items-center gap-1.5"><User size={12} className="text-primary" /><span className="text-xs font-bold truncate max-w-[120px]">{item.frstRegisterNm || item.frstRgtrId || '-'}</span></div>
 <div className="flex items-center gap-1.5"><Eye size={12} /><span className="text-xs font-bold">{(item.inqCnt || 0).toLocaleString()}</span></div>
 </div>
 </div>
 </div>
 <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-4">
 {activeCategory === 'QNA' ? (
 <div className="hidden sm:flex flex-col items-end">
 <span className="text-xs font-bold text-muted-foreground tracking-tight leading-none">상태</span>
 <StatusBadge status={item.qnaSttsCd} type={activeCategory} />
 </div>
 ) : null}
 <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-2 transition-all w-5 h-5 md:w-6 md:h-6" />
 </div>
 </motion.button>
 ))}
 </>
 )}
 </AnimatePresence>
 {!isArticlesError && <PagePagination total={articlesData?.total ?? 0} page={page} size={20} onPageChange={(next) => setPagination({ context: pageContext, page: next })} />}
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
 onClick={() => router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&pstSn=${item.pstSn}`)}
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

 <HubSectionCard title="최근 활동" description="최근 등록된 문서 흐름" icon={History}>
 <div className="space-y-6 relative z-10 font-sans">
 {isActivityError ? (
 <p role="alert" className="py-8 text-center text-xs font-bold text-destructive-emphasis">최근 활동을 불러오지 못했습니다.</p>
 ) : (activityData || []).length === 0 ? (
 <p className="py-8 text-center text-xs font-bold text-muted-foreground">표시할 활동이 없습니다.</p>
 ) : (activityData || []).slice(0, 5).map((activity: { id: string; title: string; user: string; time: string }) => (
 <div key={activity.id} className="flex items-center gap-5 p-5 bg-muted border border-border rounded-lg group/activity">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/activity:rotate-12 transition-all">
 <Zap size={18} />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs font-bold text-foreground tracking-tight truncate leading-none mb-1.5">{activity.title}</p>
 <div className="flex items-center gap-3 text-muted-foreground">
 <span className="text-xs font-bold tracking-tight">{activity.user}</span>
 <div className="w-1 h-1 rounded-full bg-muted-foreground" />
 <span className="text-xs font-bold tracking-tight tabular-nums">{activity.time}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </HubSectionCard>
 </div>
 </motion.div>
 <details className="rounded-lg border border-border bg-card p-4"><summary className="cursor-pointer text-sm font-semibold">게시판 이용 현황</summary>
 {/* 3. Stats & Insights Matrix — 백엔드 /boards/{bbsId}/stats 실측값만 표기한다.
 종전의 '+12% Critical' 류 증감 배지는 산출 근거가 없어 제거했다. */}
 <motion.div variants={hubItemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 px-2">
 {/*
   [2026-08-29] '지식 지수 NN/100 · 게시판 활성도 지표' 를 걷고 실제로 센 값을 보여 준다.
   그 점수는 측정값이 아니라 게시글 수에 상수를 더한 것이다 —
   BoardService.getBoardStats: `int intelligenceScore = (int) Math.min(100,
   (stats.totalArticles() * 2) + 70);` 이고 바로 위 주석이 "Logic derived from frontend"
   라고 적고 있다(화면이 지어낸 식을 서버로 옮겼을 뿐이다). 글이 하나도 없는 게시판이
   70/100 이고 15건이면 100 에 붙어 더 이상 움직이지 않는다. 100 점 만점처럼 보이는
   숫자는 관리자가 게시판 건강도로 읽는다.
   ⚠ 서버의 intelligenceScore 필드는 이 커밋에서 건드리지 않았다(응답 계약 변경은 별건).
   이 카드가 유일한 소비처였으므로 지금은 아무도 읽지 않는다.
 */}
 <StatsCard
 label="게시글 수"
 value={isStatsError ? '조회 실패' : (statsData?.totalArticles ?? 0).toLocaleString()}
 desc="이 게시판에 등록된 글"
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

 </details>
 {/* 열릴 때만 마운트한다 — 닫으면 폼·선택 상태가 함께 버려지고, 다이얼로그의 조회 훅이 허브 렌더에 끼지 않는다. */}
 {canManageCommunities && communityManageOpen && (
 <CommunityManageDialog isOpen onClose={() => setCommunityManageOpen(false)} />
 )}
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
 : "text-muted-foreground hover:text-foreground hover:bg-muted"
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

/**
 * 문서 상태 배지 — **실제 상태 값이 있는 축에만** 붙인다.
 *
 * [2026-08-29] 종전에는 `item.statusCd` 를 읽었는데 그 필드는 이 제품의 백엔드에 없다
 * (api-server·business-app·business-core·foundation main 소스와 Flyway SQL 전체 grep 0건).
 * 그래서 값은 언제나 undefined 였고 세 분기가 전부 기본값으로 떨어졌다 — Q&A 는 답변이
 * 달린 문의도 빨간 '미해결', 위키는 모든 문서가 '초안', FAQ·커뮤니티는 무조건 '공개'.
 * '상태' 라는 라벨을 달고 고정 문자열을 보여 준 셈이라, 목록만 보면 아무 문의도 처리되지
 * 않은 것처럼 보였다.
 *
 * Q&A 에는 실재하는 상태 컬럼이 있다(`qnaSttsCd` — tb_bbs_item.qna_stts_cd '질의응답상태코드',
 * 목록 projection 이 이미 싣고 있다). 판정은 값 도메인이 저장소 안에서 갈려 있어
 * (엔티티 기본값 OPEN · 등록 경로 QA01 · 완료 SOLVED) 이미 있는 SSOT `isQnaSolved` 를 쓴다.
 *
 * 위키의 게시/초안과 FAQ·커뮤니티의 공개 여부는 저장할 곳 자체가 없다. 없는 상태를
 * 지어내지 않으려면 배지를 붙이지 않는 것이 맞다 — 상태 축이 생기면 그때 되살린다.
 */
function StatusBadge({ status, type }: { status?: string, type: KnowledgeCategory }) {
 if (type !== 'QNA') return null;

 const isSolved = isQnaSolved(status);
 return (
 <span className={cn(
 "text-xs font-bold mt-1",
 isSolved ? "text-emerald-500" : "text-rose-500"
 )}>
 {isSolved ? '해결됨' : '답변 대기'}
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
 "relative p-3 rounded-lg border transition-colors cursor-pointer group flex items-center gap-3 text-left w-full",
 active
 ? "border-primary bg-primary/5"
 : "border-border bg-card hover:border-primary"
 )}
 >
 <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", colorMap[color])}>
 {icon}
 </div>
 <div className="space-y-1">
 <h3 className="font-semibold text-sm text-foreground">{title}</h3>
 <p className="text-xs font-bold text-muted-foreground tracking-tight">{desc}</p>
 </div>

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
 <div id={id} className={cn("rounded-lg border border-border bg-card p-4 space-y-4", className)}>
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
