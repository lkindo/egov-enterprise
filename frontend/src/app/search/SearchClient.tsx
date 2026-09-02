'use client';

import { useEffect, useState, type ReactNode } from 'react';
// ⚠ `useSearchParams` 를 여기서 쓰지 않는다 — 검색어는 서버가 prop 으로 준다(아래 주석 참조).
import Link from 'next/link';
import { Search, 
    FileText, 
    User as UserIcon, 
    Layout, 
    ArrowRight, 
    ChevronRight, 
    MessageSquare, 
    Clock, 
    AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StandardTabs } from '@/app/components/ui/standard-tabs';
import { userSearchService, type UserSearchResult } from '@/services/business/user/UserSearchService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { menuService } from '@/services/business/user/MenuService';
import { resolveMenuInternalRoute } from '@/lib/navigation/internal-route';
import type { MenuInfo } from '@/types/foundation/menu';

/**
 * 검색 결과 카드가 쓰는 게시글 필드. 백엔드 `BoardSearchItemResponse` 와 같은 범위다.
 *
 * [2026-09-02] `pstCn`·`frstRegisterNm` 을 걷었다. 서버 DTO 가 본문을 **의도적으로** 싣지 않는데
 * (본문은 에디터 HTML 원문이고 목록 표면을 좁힌다) 카드는 그 필드를 읽어 없으면
 * '본문 내용이 없습니다.' 를 출력했다 — 본문이 있는 글에 없다고 말하는 거짓 문구였다.
 * 없는 필드를 타입에 두면 그런 카드가 다시 생긴다.
 */
interface SearchArticle {
    bbsId: string;
    pstSn: number;
    pstTtl: string;
    crtDt?: string;
    userNm?: string;
    inqCnt?: number;
}

type SearchUser = UserSearchResult;

interface SearchMenu {
    name: string;
    path: string;
    category: string;
}

export interface SearchResults {
    articles: SearchArticle[];
    users: SearchUser[];
    menus: SearchMenu[];
}

interface SearchResultsContentProps {
    initialResults?: SearchResults;
    query: string;
}

const EMPTY_RESULTS: SearchResults = { articles: [], users: [], menus: [] };

export const SearchResultsContent = ({
    initialResults = EMPTY_RESULTS,
    query = '',
}: SearchResultsContentProps) => {
    const [activeTab, setTab] = useState('all');

    // [2026-08-12 구조 변경] 검색어는 **서버(page.tsx)가 해석해 prop 으로 준다.**
    //
    //   종전에는 여기서 `useSearchParams()` 를 렌더 도중 읽어 검색어를 다시 만들었다. 그런데
    //   이 라우트는 PPR 대상이라(`cacheComponents: true`) 정적 셸은 **검색어 없이** 프리렌더된다.
    //   즉 서버가 그리는 것과 클라이언트 첫 렌더가 어긋나는 것이 설계였고, 그래서
    //   `Minified React error #418`(hydration mismatch)이 간헐적으로 터졌다.
    //
    //   #382 는 입력칸 초기값 하나만 서버와 맞췄다. 그러나 검색어에서 파생되는 렌더가
    //   하나라도 늘면 같은 결함이 다시 열린다 — 증상이지 원인이 아니었다.
    //
    //   이제 **렌더 경로에 클라이언트 전용 소스가 없다.** 서버·클라이언트가 같은 prop 을 쓰므로
    //   첫 렌더는 구조적으로 일치한다. 결과 조회는 마운트 이후에 일어나며, 그것은
    //   하이드레이션 이후의 상태 변경이라 불일치와 무관하다.
    //   (회귀 방어: `__tests__/SearchClient.hydration.test.tsx` — 렌더 중 useSearchParams 를
    //    읽으면 red 가 된다.)
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(initialResults);
    const [userSearchError, setUserSearchError] = useState<string | null>(null);
    const [articleSearchError, setArticleSearchError] = useState<string | null>(null);
    const [menuSearchError, setMenuSearchError] = useState<string | null>(null);

    // 결과 조회. 검색어가 있을 때만 돈다.
    //
    // ⚠ [2026-08-12] 종전 조건 `query === initialQuery && results === initialResults` 는
    //   검색어가 URL 파생이고 initialQuery 가 항상 '' 이라는 전제에 기대고 있었다. 이제 서버가
    //   같은 값을 주므로 그 전제가 무너진다(둘이 항상 같아져 **조회가 아예 돌지 않는다**).
    //   객체 동일성(`results === initialResults`)에 기대는 것도 부모가 리터럴을 새로 만들면
    //   깨진다. 조건을 검색어 하나로 좁히고, 늦게 도착한 응답이 최신 결과를 덮지 않도록 취소 표식을 둔다.
    useEffect(() => {
        if (!query) {
            setLoading(false);
            setResults(EMPTY_RESULTS);
            setUserSearchError(null);
            setArticleSearchError(null);
            setMenuSearchError(null);
            return;
        }

        let cancelled = false;

        const fetchResults = async () => {
            setLoading(true);
            setUserSearchError(null);
            setArticleSearchError(null);
            setMenuSearchError(null);

            // 세 검색 축은 서로 다른 API다. 한 축의 장애가 뒤 API 호출을 막거나 정상 0건으로
            // 번역되지 않도록 동시에 실행하고, 성공 결과와 오류를 축별로 보존한다.
            const menuSearch = async (): Promise<SearchMenu[]> => {
                const head = await menuService.getHeadMenus();
                const subLists = await Promise.all(head.map(m => menuService.getLeftMenus(m.menuNo)));
                const keyword = String(query || '');
                return head.flatMap((m, i) => (
                    [{ parent: null as MenuInfo | null, node: m },
                     ...subLists[i].map(l => ({ parent: m as MenuInfo | null, node: l }))]
                )).flatMap(({ parent, node }) => {
                    const path = resolveMenuInternalRoute(node);
                    if (!path || !node.menuNm?.includes(keyword)) return [];
                    return [{ name: node.menuNm, path, category: parent?.menuNm ?? '메뉴' }];
                });
            };

            const [userResult, articleResult, menuResult] = await Promise.allSettled([
                // 모든 인증 사용자가 접근하므로 연락처·주소가 없는 최소정보 API만 사용한다.
                userSearchService.searchAssignableUsers(query),
                boardUserService.searchPosts(query),
                menuSearch(),
            ]);
            if (cancelled) return;

            const users = userResult.status === 'fulfilled' ? userResult.value.slice(0, 10) : [];
            const articles: SearchArticle[] = articleResult.status === 'fulfilled'
                ? articleResult.value.map(item => ({
                    bbsId: item.bbsId,
                    pstSn: item.pstSn,
                    pstTtl: item.pstTtl ?? '(제목 없음)',
                    crtDt: item.crtDt,
                    userNm: item.userNm,
                    inqCnt: item.inqCnt,
                }))
                : [];
            const menus = menuResult.status === 'fulfilled' ? menuResult.value : [];

            if (userResult.status === 'rejected') {
                setUserSearchError('임직원 검색 결과를 불러오지 못했습니다.');
            }
            if (articleResult.status === 'rejected') {
                setArticleSearchError('게시글 검색 결과를 불러오지 못했습니다.');
            }
            if (menuResult.status === 'rejected') {
                setMenuSearchError('메뉴 바로가기 검색 결과를 불러오지 못했습니다.');
            }
            setResults({ articles, users, menus });
            setLoading(false);
        };

        fetchResults();
        return () => { cancelled = true; };
    }, [query]);

    // [2026-09-02] 게시글 탭이 실제 결과를 센다.
    //   종전 라벨은 '게시글 (미지원)' 이었다 — 전역 검색 엔드포인트가 없어 결과가 늘 빈 배열이라
    //   `count: 0` 으로 두면 "결과 없음" 과 "기능 없음" 이 같은 모양이 되기 때문이었다.
    //   이제 검색 대상은 **제목**이므로 그 범위는 아래 안내 문구가 말한다.
    const tabs = [
        { id: 'all', label: '전체 결과', icon: <Layout size={16} /> },
        {
            id: 'articles',
            label: articleSearchError ? '게시글 (조회 실패)' : '게시글',
            count: articleSearchError ? undefined : results.articles.length,
            icon: <MessageSquare size={16} />,
        },
        {
            id: 'users',
            label: userSearchError ? '임직원 (조회 실패)' : '임직원',
            count: userSearchError ? undefined : results.users.length,
            icon: <UserIcon size={16} />,
        },
        {
            id: 'menus',
            label: menuSearchError ? '메뉴 바로가기 (조회 실패)' : '메뉴 바로가기',
            count: menuSearchError ? undefined : results.menus.length,
            icon: <FileText size={16} />,
        },
    ];
    const visibleErrors = [
        { axis: 'articles', message: articleSearchError },
        { axis: 'users', message: userSearchError },
        { axis: 'menus', message: menuSearchError },
    ].filter(({ axis, message }) => message != null && (activeTab === 'all' || activeTab === axis));
    const visibleResultCount = activeTab === 'all'
        ? results.articles.length + results.users.length + results.menus.length
        : activeTab === 'articles'
            ? results.articles.length
            : activeTab === 'users'
                ? results.users.length
                : results.menus.length;

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-32 p-4 md:p-10">
            {/* Search Header */}
            <div className="relative group p-12 bg-surface-inverse rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-lg blur-[120px] animate-pulse" />

                <div className="relative z-10 space-y-8 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                        <h1 className="text-3xl md:text-3xl font-bold text-surface-inverse-foreground tracking-tighter ">
                            통합 <span className="text-primary underline decoration-8 decoration-primary/20 underline-offset-8">검색</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg">게시글 제목, 임직원 성명, 메뉴 이름을 찾습니다. 게시글 본문은 검색하지 않습니다.</p>
                    </div>
                        {/* [2026-08-04] '실시간 인덱스 활성화' 배지 제거.
                            그런 인덱스는 존재하지 않는다 — 임직원 검색은 사용자 목록 API 의 키워드 조회이고,
                            바로가기는 메뉴 API, 게시글은 제목 검색 API 를 실시간으로 조회한다. 검색 인덱스나
                            색인 작업은 여전히 없으므로 운영자가 "인덱스가 돌고 있다"고 믿을 근거를 UI 가
                            만들면 안 된다(감사 클러스터 E — 실패를 정상 상태로 번역하지 않는다).
                            검색 범위를 사실대로 적는다. */}
                        <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-lg border border-white/10 backdrop-blur-xl">
                            <Clock className="text-primary" size={18} />
                            <span className="text-sm font-bold text-surface-inverse-foreground tracking-tight">게시글 제목 · 임직원 · 바로가기 검색</span>
                        </div>
                    </div>

                    {/*
                        검색은 표준 GET 폼으로 제출한다. 이 화면은 PPR 스트리밍 대상이라 사용자가
                        hydration 완료 전에 입력할 수 있다. router.push 기반 동일 경로 RSC 전환은
                        그 순간 초기 hydration과 경쟁해 #418을 만들었다.

                        action/name/defaultValue 기반 폼은 JS 전에도 동작하고, 제출된 URL을 서버가
                        단일 출처로 다시 렌더하므로 빠른 사용자 입력에서도 첫 HTML과 클라이언트가
                        같은 query로 시작한다. 검색은 읽기 연산이므로 GET 의미론에도 맞는다.
                    */}
                    <form action="/search" method="get" className="max-w-3xl mx-auto md:mx-0">
                        <div className="relative group/input">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                            <Input
                                name="q"
                                aria-label="통합검색어"
                                defaultValue={query}
                                placeholder="게시글 제목, 임직원 또는 바로가기 이름을 입력하세요"
                                className="h-11 pl-16 pr-40 rounded-lg border-0 bg-card ring-offset-0 focus:ring-4 focus:ring-primary/20 transition-all font-bold text-xl placeholder:text-slate-300 placeholder:font-bold"
                            />
                            <Button
                                type="submit"
                                className="absolute right-3 top-1/2 -translate-y-1/2 h-11 px-8 rounded-lg font-bold text-lg shadow-xl"
                            >
                                검색 실행
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-10">
                {/* 검색 범위 안내 */}
                <div className="w-full md:w-64 space-y-8 shrink-0">
                    <div className="p-8 bg-card border-2 border-primary/5 rounded-lg shadow-xl space-y-3">
                        <h2 className="text-sm font-bold tracking-tight text-foreground">현재 검색 범위</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">게시글 제목, 임직원, 메뉴 바로가기를 검색합니다. 게시글 본문은 검색하지 않습니다.</p>
                    </div>

                    <div className="p-8 bg-surface-inverse rounded-lg text-surface-inverse-foreground shadow-2xl relative overflow-hidden group">
                    <div className="absolute right-[-20px] top-[-20px] bg-primary/20 w-32 h-32 rounded-lg blur-[60px]" />
                    <div className="relative z-10 space-y-4">
                        <h4 className="text-sm font-bold tracking-tight text-primary">유용한 도움말</h4>
                        <p className="text-sm text-muted-foreground font-bold leading-relaxed">
                            단축키 <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 mx-1">Ctrl + K</kbd>를 누르면 어디서든 커뮤니티 센터를 열 수 있습니다.
                        </p>
                    </div>
                </div>
                </div>

                {/* Main Results Area */}
                <div className="flex-1 space-y-8">
                    <StandardTabs
                        items={tabs}
                        activeTab={activeTab}
                        onChange={setTab}
                        className="p-1.5 bg-muted/30 rounded-lg"
                    />

                    {/* [2026-09-02] '미지원' 안내를 **검색 범위** 안내로 바꾼다.
                        종전에는 전역 게시글 검색 API 가 없어 이 탭이 '결과 0건' 이 아니라 '기능 부재'
                        였고, 그 사실을 경고로 적어 두고 있었다. 이제 기능은 있으나 범위가 제목으로
                        한정되므로(본문은 에디터 HTML 원문이라 태그·속성이 매칭된다) 그 경계를 대신 말한다.
                        범위를 적지 않으면 사용자는 본문에만 있는 낱말로 검색하고 "글이 없다" 로 오독한다.
                        ⚠ 결과 영역 **밖**에 둔다. 아래 분기는 세 결과가 모두 비면 '일치하는 결과가
                        없습니다' 를 먼저 렌더하므로, 안쪽에 두면 정작 필요한 순간에 가려진다. */}
                    {activeTab === 'articles' ? (
                        <div className="rounded-lg border border-border bg-muted/30 px-6 py-5">
                            <p className="text-sm font-bold text-foreground">게시글은 제목만 검색합니다.</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                본문 내용은 검색 대상이 아니며, 활성 게시판의 글을 최대 20건까지 보여 줍니다.
                                본문까지 찾으려면 해당 게시판의 검색을 이용해 주세요.
                            </p>
                        </div>
                    ) : null}

                    {visibleErrors.map(({ axis, message }) => (
                        <div key={axis} role="alert" className="rounded-lg border border-warning/30 bg-warning/10 px-6 py-5">
                            <p className="text-sm font-bold text-foreground">{message}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                정상 응답한 다른 검색 결과는 계속 표시합니다. 잠시 후 다시 검색해 주세요.
                            </p>
                        </div>
                    ))}

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
                        {loading ? (
                            <div className="space-y-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={`search-skeleton-${i}`} className="h-32 bg-muted/40 animate-pulse rounded-lg" />
                                ))}
                            </div>
                        ) : visibleResultCount === 0 && visibleErrors.length > 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                                <AlertTriangle size={36} className="text-warning" aria-hidden="true" />
                                <p className="text-sm text-muted-foreground">현재 표시할 수 있는 정상 응답 결과가 없습니다.</p>
                            </div>
                        ) : visibleResultCount === 0 ? (
                            <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                                <div className="w-24 h-24 bg-muted/30 rounded-lg flex items-center justify-center">
                                    <Search size={48} className="text-muted-foreground/30" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-bold text-foreground/60">일치하는 결과가 없습니다.</h3>
                                    <p className="text-sm text-muted-foreground font-medium">검색어를 다시 확인하거나 다른 키워드로 시도해보세요.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-10">
                                {/* Articles Section */}
                                {(activeTab === 'all' || activeTab === 'articles') && results.articles.length > 0 ? (
                                    <ResultSection title="게시글" count={results.articles.length}>
                                        {results.articles.map((item) => (
                                            <ArticleResultItem key={`${item.bbsId}-${item.pstSn}`} item={item} />
                                        ))}
                                    </ResultSection>
                                ) : null}

                                {/* Users Section */}
                                {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 ? (
                                    <ResultSection title="임직원" count={results.users.length}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {results.users.map((item, index) => (
                                                <UserResultItem key={item.esntlId ?? `${item.userNm ?? 'user'}-${index}`} item={item} />
                                            ))}
                                        </div>
                                    </ResultSection>
                                ) : null}

                                {/* Menus Section */}
                                {(activeTab === 'all' || activeTab === 'menus') && results.menus.length > 0 ? (
                                    <ResultSection title="바로가기" count={results.menus.length}>
                                        {results.menus.map((item) => (
                                            <MenuResultItem key={item.path} item={item} />
                                        ))}
                                    </ResultSection>
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Helper Components ---

function ResultSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 px-2">
                <h3 className="text-xl font-bold tracking-tight ">{title}</h3>
                <Badge variant="outline" className="rounded-lg border-primary/20 text-primary font-bold">{count}</Badge>
                <div className="h-px bg-primary/10 flex-1" />
            </div>
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
}

function ArticleResultItem({ item }: { item: SearchArticle }) {
    return (
        <Link href={`/admin/community/boards/detail?bbsId=${item.bbsId}&pstSn=${item.pstSn}`} className="block group">
            <div className="p-8 bg-card border-2 border-primary/5 rounded-lg shadow-lg group-hover:shadow-xl group-hover:border-primary/20 transition-all group-hover:-translate-y-1">
                <div className="flex justify-between items-start gap-4 mb-4">
                    <h4 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
                        {item.pstTtl}
                    </h4>
                    <span className="text-xs font-bold text-muted-foreground/40 bg-muted px-2 py-1 rounded-md shrink-0">
                        {item.crtDt?.substring(0, 10)}
                    </span>
                </div>
                {/*
                    [2026-09-02] 본문 미리보기 문단을 걷었다. 서버가 본문을 싣지 않으므로 이 자리는
                    언제나 '본문 내용이 없습니다.' 였다 — 본문이 있는 글에 없다고 말하는 거짓이다.
                    대신 서버가 실제로 주는 조회수를 보여 준다. 본문은 카드를 눌러 상세에서 본다.
                */}
                <div className="flex items-center justify-between pt-6 border-t border-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <UserIcon size={14} className="text-muted-foreground" />
                        </div>
                        <span className="text-sm font-bold text-foreground/70">{item.userNm || '작성자 미상'}</span>
                        {typeof item.inqCnt === 'number' ? (
                            <span className="text-xs text-muted-foreground tabular-nums">조회 {item.inqCnt.toLocaleString()}</span>
                        ) : null}
                    </div>
                    <ArrowRight size={18} className="text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                </div>
            </div>
        </Link>
    );
}

function UserResultItem({ item }: { item: SearchUser }) {
    return (
        <div className="p-6 bg-card border-2 border-primary/5 rounded-lg flex items-center gap-5 hover:border-primary/20 transition-all shadow-sm">
            <div className="w-14 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <UserIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg tracking-tight truncate">{item.userNm}</h4>
                <p className="text-sm text-muted-foreground font-bold">{item.deptNm || '부서 정보 없음'}</p>
            </div>
            <Badge variant="secondary" className="rounded-lg font-bold text-xs ">직원</Badge>
        </div>
    );
}

function MenuResultItem({ item }: { item: SearchMenu }) {
    return (
        <Link href={item.path} className="flex items-center justify-between p-6 bg-muted/20 border-2 border-transparent hover:border-primary/20 hover:bg-card rounded-lg transition-all group">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
                    <Layout size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-base">{item.name}</h4>
                    <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.category} 모듈</span>
                </div>
            </div>
            <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
    );
}
