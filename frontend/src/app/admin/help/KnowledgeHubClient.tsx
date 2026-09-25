'use client';

import React, { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus,
 Library, BookOpen, MessageCircleQuestion,
 TrendingUp, Users, History,
 User, Eye, Settings2, AlertTriangle, RefreshCcw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { knowledgeService, type KnowledgeDto, type KnowledgeActivityItem } from '@/services/business/knowledge/knowledgeService';
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
import { userFacingErrorMessage } from '@/lib/safe-error-log';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. `bbsId` 는 진입 전용이라 카테고리를 바꾸면 버린다(종전 delete 와 같은 결과).
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const HUB_PARAM_KEYS = ['tab'] as const;

// --- Types ---
type KnowledgeCategory = 'WIKI' | 'FAQ' | 'QNA' | 'COMMUNITY';

const CATEGORY_LABEL: Record<KnowledgeCategory, string> = {
 WIKI: '위키',
 FAQ: '자주 묻는 질문',
 QNA: '질의응답(Q&A)',
 COMMUNITY: '커뮤니티',
};

const PAGE_SIZE = 20;

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
 const params = pickAllowedParams(searchParams, HUB_PARAM_KEYS);
 params.set('tab', next);
 // bbsId 로 진입했어도 카테고리를 바꾸면 버린다 — tab 이 우선 해석되지만 둘이 함께 남으면 링크가 혼란스럽다.
 //   allowlist 에 bbsId 가 없으므로 재조립 단계에서 이미 빠진다(종전 delete 와 같은 결과).
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
   없음), 같은 사용자가 같은 데이터를 세 경로로 이미 받는다 — ① 이 화면의 인기 문서·
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
 size: PAGE_SIZE,
 orderBy: sortBy === 'views' ? 'views' : 'date',
 searchCnd: debouncedQuery ? '0' : undefined,
 searchWrd: debouncedQuery || undefined
 }),
 });

 const { data: hotData, isError: isHotError } = useQuery({
 queryKey: ['hot-articles', activeCategory],
 queryFn: () => knowledgeService.getHotArticles(currentBbsId),
 });

 const { data: statsData, isError: isStatsError, isLoading: isStatsLoading } = useQuery({
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

 const openArticle = React.useCallback((item: KnowledgeDto) => {
 router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&pstSn=${item.pstSn}`);
 }, [router, currentBbsId]);

 /*
  * 열 구성. Q&A 에만 상태 열이 붙는다 — 다른 카테고리에는 저장할 상태 컬럼 자체가 없어
  * 열을 만들면 빈 칸이 '상태 없음' 이 아니라 '상태 모름' 으로 읽힌다(StatusBadge 주석 참조).
  */
 const columns: Column<KnowledgeDto>[] = [
 {
 header: '제목',
 className: 'w-full max-w-0',
 accessor: (item: KnowledgeDto) => (
 <button
 type="button"
 onClick={() => openArticle(item)}
 aria-label={`${item.pstTtl} 상세 보기`}
 className="block w-full truncate text-left font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
 >
 {item.pstTtl}
 </button>
 ),
 },
 ...(activeCategory === 'QNA'
 ? ([{
 header: '상태',
 className: 'whitespace-nowrap',
 accessor: (item: KnowledgeDto) => <StatusBadge status={item.qnaSttsCd} type={activeCategory} />,
 }] satisfies Column<KnowledgeDto>[])
 : ([] satisfies Column<KnowledgeDto>[])),
 {
 header: '작성자',
 className: 'whitespace-nowrap',
 accessor: (item: KnowledgeDto) => (
 <span className="inline-flex items-center gap-1.5 text-muted-foreground">
 <User size={12} aria-hidden="true" />
 <span className="max-w-[10rem] truncate">{item.userNm || '-'}</span>
 </span>
 ),
 },
 {
 header: '등록일',
 className: 'whitespace-nowrap tabular-nums text-muted-foreground',
 // [2026-09-26 DIP V2] 서버가 싣는 작성 일시(crtDt)의 날짜 부분이다. 종전에는 보내지 않는 필드를 읽어 늘 '-' 였다.
 accessor: (item: KnowledgeDto) => item.crtDt?.slice(0, 10) || '-',
 },
 {
 header: '조회수',
 className: 'whitespace-nowrap text-right tabular-nums',
 accessor: (item: KnowledgeDto) => (item.inqCnt || 0).toLocaleString(),
 },
 ];

 return (
 <>
 <WorkListPage
 title={CATEGORY_LABEL[activeCategory]}
 description="문서를 검색하고 필요한 내용을 확인하세요."
 filterStateKey="knowledge-hub"
 // 조회 실패 시에는 총계를 말하지 않는다 — '총 0건' 은 "없다" 라는 사실 주장이 된다.
 totalCount={isArticlesError ? undefined : articlesData?.total}
 actions={
 <>
 {canReadBoardMasters && <Button variant="outline" size="sm" onClick={() => router.push('/admin/community/boards/master')}><Settings2 size={16} aria-hidden="true" /> 게시판 관리</Button>}
 {canManageCommunities && activeCategory === 'COMMUNITY' && <Button variant="outline" size="sm" onClick={() => setCommunityManageOpen(true)}><Users size={16} aria-hidden="true" /> 커뮤니티 관리</Button>}
 <Button size="sm" onClick={() => router.push(`/admin/community/boards/insert-board-article?bbsId=${currentBbsId}`)}><Plus size={16} aria-hidden="true" /> 신규 등록</Button>
 </>
 }
 navigation={
 <div role="tablist" aria-label="지식 카테고리" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
 {/* 건수는 집계 API 가 없어 표기하지 않는다(종전 142/28/567/12 는 하드코딩이었다). */}
 <CategoryTab title="위키" desc="기술 사양" icon={Library} active={activeCategory === 'WIKI'} onClick={() => selectCategory('WIKI')} />
 <CategoryTab title="자주 묻는 질문" desc="빠른 답변" icon={BookOpen} active={activeCategory === 'FAQ'} onClick={() => selectCategory('FAQ')} />
 <CategoryTab title="질의응답(Q&A)" desc="질문과 답변" icon={MessageCircleQuestion} active={activeCategory === 'QNA'} onClick={() => selectCategory('QNA')} />
 <CategoryTab title="커뮤니티" desc="활성 게시판" icon={Users} active={activeCategory === 'COMMUNITY'} onClick={() => selectCategory('COMMUNITY')} />
 </div>
 }
 filter={
 <div className="space-y-3">
 <div>
 <label htmlFor="knowledge-search" className="text-[length:var(--font-size-body)] font-medium">지식 검색어</label>
 <div className="relative mt-1.5">
 <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input id="knowledge-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-[var(--filter-control-h)] pl-9 placeholder:text-muted-foreground" placeholder="제목·내용 검색..." />
 </div>
 </div>
 <div className="flex flex-wrap items-center gap-2" aria-label="문서 정렬">
 <span className="text-[length:var(--font-size-body)] text-muted-foreground">정렬</span>
 <FilterButton active={sortBy === 'latest'} onClick={() => setSortBy('latest')} label="최신순" />
 <FilterButton active={sortBy === 'views'} onClick={() => setSortBy('views')} label="조회순" />
 </div>
 </div>
 }
 toolbarActions={
 <div className="flex items-center gap-2">
 <span role="status" className="text-[length:var(--font-size-body)] text-muted-foreground">
 {isArticlesError ? '조회 실패' : isSearching ? '검색 중…' : ''}
 </span>
 <Button variant="outline" size="sm" aria-label="지식 문서 목록 새로고침" onClick={() => void refetchArticles()}>
 <RefreshCcw size={14} aria-hidden="true" /> 새로고침
 </Button>
 </div>
 }
 >
 <div id="knowledge-stream-panel" className="space-y-3">
 {isArticlesError ? (
 // 조회 실패를 '데이터 없음'으로 위장하지 않는다.
 <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-8">
 <AlertTriangle size={24} className="text-destructive-emphasis" aria-hidden="true" />
 <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">지식 목록을 불러오지 못했습니다.</p>
 {/* [2026-09-15 DEC-OPS-100] axios 전송 오류 원문은 보이지 않는다 — 서버가 준 문장이나, axios 오류가 아닌 오류의 문장만 덧붙인다. */}
 {userFacingErrorMessage(articlesError) ? (
 <p className="text-xs text-muted-foreground">{userFacingErrorMessage(articlesError)}</p>
 ) : null}
 <Button variant="outline" size="sm" className="gap-2" onClick={() => void refetchArticles()}>
 <RefreshCcw size={14} aria-hidden="true" /> 다시 시도
 </Button>
 </div>
 ) : (
 <>
 <StandardDataTable<KnowledgeDto>
 columns={columns}
 data={displayItems}
 keyField="pstSn"
 loading={isLoading}
 accessibleLabel={`${CATEGORY_LABEL[activeCategory]} 문서 목록`}
 emptyMessage={debouncedQuery
 ? `'${debouncedQuery}' 에 대한 검색 결과가 없습니다.`
 : '등록된 지식 문서가 없습니다.'}
 />
 <PagePagination total={articlesData?.total ?? 0} page={page} size={PAGE_SIZE} onPageChange={(next) => setPagination({ context: pageContext, page: next })} />
 </>
 )}
 </div>

 <div className="grid gap-3 lg:grid-cols-2">
 <AsideSection title="인기 문서" description="조회수가 높은 문서" icon={TrendingUp}>
 {isHotError ? (
 <p role="alert" className="py-6 text-center text-[length:var(--font-size-body)] text-destructive-emphasis">인기 문서를 불러오지 못했습니다.</p>
 ) : hotItems.length === 0 ? (
 <p className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">표시할 문서가 없습니다.</p>
 ) : (
 <ul className="divide-y divide-border">
 {hotItems.map((item, idx) => (
 <li key={item.pstSn}>
 <button
 type="button"
 onClick={() => openArticle(item)}
 aria-label={`${item.pstTtl} 상세 보기`}
 className="group flex w-full items-center gap-3 px-1 py-1.5 text-left hover:bg-muted"
 >
 <span data-testid="hot-article-rank" className="w-5 shrink-0 text-right text-[length:var(--font-size-body)] font-semibold tabular-nums text-muted-foreground">{idx + 1}</span>
 <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-body)] text-foreground group-hover:text-primary">{item.pstTtl}</span>
 <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
 <Eye size={12} aria-hidden="true" />{(item.inqCnt || 0).toLocaleString()}
 </span>
 <ChevronRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
 </button>
 </li>
 ))}
 </ul>
 )}
 </AsideSection>

 <AsideSection title="최근 활동" description="최근 등록된 문서 흐름" icon={History}>
 {isActivityError ? (
 <p role="alert" className="py-6 text-center text-[length:var(--font-size-body)] text-destructive-emphasis">최근 활동을 불러오지 못했습니다.</p>
 ) : (activityData || []).length === 0 ? (
 <p className="py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground">표시할 활동이 없습니다.</p>
 ) : (
 <ul className="divide-y divide-border">
 {(activityData || []).slice(0, 5).map((activity: KnowledgeActivityItem) => (
 <li key={activity.id} className="px-1 py-1.5">
 <p className="truncate text-[length:var(--font-size-body)] text-foreground">{activity.title}</p>
 <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
 <span className="truncate">{activity.user}</span>
 <span aria-hidden="true">·</span>
 <span className="tabular-nums">{activity.time}</span>
 </div>
 </li>
 ))}
 </ul>
 )}
 </AsideSection>
 </div>

 <details className="rounded-md border border-border bg-card">
 <summary className="cursor-pointer px-[var(--filter-pad)] py-2 text-[length:var(--font-size-body)] font-semibold">게시판 이용 현황</summary>
 {/* 백엔드 /boards/{bbsId}/stats 실측값만 표기한다.
   종전의 '+12% Critical' 류 증감 배지는 산출 근거가 없어 제거했다. */}
 <div className="grid grid-cols-1 gap-2 border-t border-border p-[var(--filter-pad)] sm:grid-cols-3">
 {/*
   [2026-08-29] '지식 지수 NN/100 · 게시판 활성도 지표' 를 걷고 실제로 센 값을 보여 준다.
   그 점수는 측정값이 아니라 게시글 수에 상수를 더한 것이다 —
   BoardService.getBoardStats: `int intelligenceScore = (int) Math.min(100,
   (stats.totalArticles() * 2) + 70);` 이고 바로 위 주석이 "Logic derived from frontend"
   라고 적고 있다(화면이 지어낸 식을 서버로 옮겼을 뿐이다). 글이 하나도 없는 게시판이
   70/100 이고 15건이면 100 에 붙어 더 이상 움직이지 않는다. 100 점 만점처럼 보이는
   숫자는 관리자가 게시판 건강도로 읽는다.
   [2026-09-23] 그 서버 필드(intelligenceScore)도 응답 계약에서 걷었다 — 이 칸이 유일한 소비처였고
   2026-08-29 이후 아무도 읽지 않았다. 지어낸 점수를 계약에 남겨 두면 다음 소비자가 측정값으로 읽는다.
 */}
 <StatsCard
 label="게시글 수"
 value={statsCardValue(statsData?.totalArticles, isStatsError, isStatsLoading)}
 desc="이 게시판에 등록된 글"
 />
 <StatsCard
 label="누적 조회수"
 value={statsCardValue(statsData?.totalViews, isStatsError, isStatsLoading)}
 desc="이 게시판의 전체 조회수"
 />
 <StatsCard
 label="최다 기여자"
 value={isStatsError ? '조회 실패' : isStatsLoading ? '불러오는 중…' : (statsData?.topContributor || '-')}
 desc="게시글 등록이 가장 많은 사용자"
 />
 </div>
 </details>
 </WorkListPage>

 {/* 열릴 때만 마운트한다 — 닫으면 폼·선택 상태가 함께 버려지고, 다이얼로그의 조회 훅이 허브 렌더에 끼지 않는다. */}
 {canManageCommunities && communityManageOpen && (
 <CommunityManageDialog isOpen onClose={() => setCommunityManageOpen(false)} />
 )}
 </>
 );
}

function FilterButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
 return (
 <button
 type="button"
 onClick={onClick}
 aria-pressed={active}
 className={cn(
 "h-[var(--filter-control-h)] rounded-md border px-3 text-[length:var(--font-size-body)] transition-colors",
 active
 ? "border-primary bg-primary text-primary-foreground"
 : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
 )}
 >
 {label}
 </button>
 );
}

/**
 * 게시판 이용 현황 수치 칸의 표시 문구. [2026-09-15 DEC-OPS-100] 조회 중이거나 값을 읽을 수 없을 때
 * 0 을 쓰지 않는다 — 종전에는 불러오는 동안 "게시글 수 0" 이 보였다.
 */
function statsCardValue(value: number | null | undefined, isError: boolean, isLoading: boolean): string {
 if (isError) return '조회 실패';
 if (isLoading) return '불러오는 중…';
 return typeof value === 'number' ? value.toLocaleString() : '-';
}

function StatsCard({ label, value, desc }: { label: string, value: string, desc: string }) {
 return (
 <div data-testid="board-stat-card" className="rounded-md border border-border bg-muted/40 px-3 py-2">
 <p className="text-xs text-muted-foreground">{label}</p>
 {/* 통계 수치는 제목이 아니다. */}
 <p className="text-lg font-semibold tabular-nums text-foreground">{value}</p>
 <p className="text-xs text-muted-foreground">{desc}</p>
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
 "inline-flex items-center rounded border px-1.5 py-0.5 text-xs",
 isSolved ? "border-success/40 bg-success/15 text-foreground" : "border-warning/40 bg-warning/15 text-foreground"
 )}>
 {isSolved ? '해결됨' : '답변 대기'}
 </span>
 );
}

function CategoryTab({ title, desc, icon: Icon, active, onClick }: {
 title: string;
 desc: string;
 icon: React.ElementType;
 active: boolean;
 onClick: () => void;
}) {
 return (
 <button
 type="button"
 role="tab"
 aria-selected={active}
 aria-controls="knowledge-stream-panel"
 onClick={onClick}
 className={cn(
 "flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
 active
 ? "border-primary bg-primary/5"
 : "border-border bg-card hover:border-primary"
 )}
 >
 <Icon size={16} aria-hidden="true" className={cn("shrink-0", active ? "text-primary" : "text-muted-foreground")} />
 <span className="min-w-0">
 {/* 탭 이름이지 절 제목이 아니다. 탭 안의 h3 는 h1 뒤 단계를 건너뛰어 heading-order 위반이었다(axe). */}
 <span className="block truncate text-[length:var(--font-size-body)] font-semibold text-foreground">{title}</span>
 <span className="block truncate text-xs text-muted-foreground">{desc}</span>
 </span>
 </button>
 );
}

function AsideSection({ title, description, icon: Icon, children }: {
 title: string;
 description: string;
 icon: React.ElementType;
 children: React.ReactNode;
}) {
 return (
 <section className="rounded-md border border-border bg-card p-3">
 <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
 <Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
 <div className="min-w-0">
 {/* 화면 h1 바로 아래 절이다 — 제목 계층은 h1 → 절(h2) → 문서 제목(h3). */}
 <h2 className="truncate text-[length:var(--font-size-body)] font-semibold text-foreground">{title}</h2>
 <p className="truncate text-xs text-muted-foreground">{description}</p>
 </div>
 </div>
 {children}
 </section>
 );
}
