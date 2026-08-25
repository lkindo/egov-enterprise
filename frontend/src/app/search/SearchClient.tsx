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

interface SearchArticle {
    bbsId: string;
    pstSn: number;
    pstTtl: string;
    pstCn?: string;
    crtDt?: string;
    userNm?: string;
    frstRegisterNm?: string;
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
    const [searchError, setSearchError] = useState<string | null>(null);

    // 결과 조회. 검색어가 있을 때만 돈다.
    //
    // ⚠ [2026-08-12] 종전 조건 `query === initialQuery && results === initialResults` 는
    //   검색어가 URL 파생이고 initialQuery 가 항상 '' 이라는 전제에 기대고 있었다. 이제 서버가
    //   같은 값을 주므로 그 전제가 무너진다(둘이 항상 같아져 **조회가 아예 돌지 않는다**).
    //   객체 동일성(`results === initialResults`)에 기대는 것도 부모가 리터럴을 새로 만들면
    //   깨진다. 조건을 검색어 하나로 좁히고, 늦게 도착한 응답이 최신 결과를 덮지 않도록 취소 표식을 둔다.
    useEffect(() => {
        if (!query) return;

        let cancelled = false;

        const fetchResults = async () => {
            setLoading(true);
            setSearchError(null);
            try {
                // 전역 게시글 검색 백엔드 엔드포인트는 부재(/api/v1/bbs는 /{bbsId} 기반이라 /bbs는 404) → 팬텀 호출 제거.
                // 모든 인증 사용자가 접근하는 route이므로 연락처·주소까지 담은
                // admin 전용 목록이 아닌 식별자·성명·부서만 반환하는 최소정보 API를 사용한다.
                const users = await userSearchService.searchAssignableUsers(query);
                if (cancelled) return;

                setResults({
                    articles: [],
                    users: users.slice(0, 10),
                    menus: [
                        { name: '공지사항 관리', path: '/admin/system/menus', category: '시스템' },
                        { name: '자유 게시판', path: '/admin/community/boards', category: '커뮤니티' }
                    ].filter(m => m.name.includes(String(query || '')))
                });
            } catch {
                if (!cancelled) {
                    setSearchError('임직원 검색 결과를 불러오지 못했습니다.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchResults();
        return () => { cancelled = true; };
    }, [query]);

    // [2026-08-04] 게시글 탭은 **미지원**이다 — 전역 게시글 검색 백엔드 엔드포인트가 없어
    //   fetchResults 가 articles 를 항상 빈 배열로 둔다(위 주석 참조).
    //   종전에는 `count: 0` 인 평범한 탭이라 사용자가 "검색은 됐는데 결과가 없다" 로 읽었다.
    //   **결과 없음과 기능 없음은 다른 사실**이고, 후자를 전자로 표시하는 것이 거짓 성공이다.
    //   라벨에 직접 드러낸다 — TabItem 은 id/label/icon 만 받으므로 플래그를 넘겨도 렌더되지 않는다
    //   (배선되지 않는 산출물을 만들지 않는다).
    const tabs = [
        { id: 'all', label: '전체 결과', icon: <Layout size={16} /> },
        { id: 'articles', label: '게시글 (미지원)', icon: <MessageSquare size={16} /> },
        { id: 'users', label: '임직원', count: results.users.length, icon: <UserIcon size={16} /> },
        { id: 'menus', label: '메뉴 바로가기', count: results.menus.length, icon: <FileText size={16} /> }
    ];

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
                        <p className="text-muted-foreground font-medium text-lg">워크스페이스 전체에서 필요한 정보를 정확하게 찾아드립니다.</p>
                    </div>
                        {/* [2026-08-04] '실시간 인덱스 활성화' 배지 제거.
                            그런 인덱스는 존재하지 않는다 — 임직원 검색은 사용자 목록 API 의 키워드 조회이고,
                            바로가기는 이 파일에 하드코딩된 2건을 필터링하며, 게시글은 전역 검색 엔드포인트가
                            없어 항상 빈 배열이다. 운영자가 "인덱스가 돌고 있다"고 믿을 근거를 UI 가 만들면
                            안 된다(감사 클러스터 E — 실패를 정상 상태로 번역하지 않는다).
                            검색 범위를 사실대로 적는다. */}
                        <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-lg border border-white/10 backdrop-blur-xl">
                            <Clock className="text-primary" size={18} />
                            <span className="text-sm font-bold text-surface-inverse-foreground tracking-tight">임직원 · 바로가기 검색</span>
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
                                defaultValue={query}
                                placeholder="임직원 또는 바로가기 이름을 입력하세요"
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
                        <p className="text-sm text-muted-foreground leading-relaxed">임직원과 메뉴 바로가기를 검색합니다. 게시글 통합 검색은 아직 제공되지 않습니다.</p>
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

                    {/* [2026-08-04] 게시글 검색 미지원을 화면에 명시한다.
                        이 탭은 '결과 0건' 이 아니라 '기능 부재' 다 — 전역 게시글 검색 엔드포인트가
                        백엔드에 없다. 구분해 적지 않으면 사용자는 검색어를 바꿔 가며 재시도하고,
                        그 시간은 전부 헛수고가 된다.
                        ⚠ 결과 영역 **밖**에 둔다. 아래 분기는 세 결과가 모두 비면 '일치하는 결과가
                        없습니다' 를 먼저 렌더하므로, 안쪽에 두면 정작 필요한 순간에 가려진다. */}
                    {activeTab === 'articles' ? (
                        <div className="rounded-lg border border-warning/40 bg-warning/10 px-6 py-5">
                            <p className="text-sm font-bold text-foreground">게시글 통합 검색은 아직 제공되지 않습니다.</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                전역 게시글 검색 API 가 준비되지 않아 이 탭은 항상 비어 있습니다.
                                검색어를 바꿔도 결과는 달라지지 않습니다 — 게시판별 검색을 이용해 주세요.
                            </p>
                        </div>
                    ) : null}

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
                        {searchError ? (
                            <div role="alert" className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6">
                                <AlertTriangle size={36} className="text-destructive-emphasis" />
                                <h3 className="text-lg font-bold text-foreground">{searchError}</h3>
                                <p className="text-sm text-muted-foreground">입력한 검색어는 유지됩니다. 잠시 후 ‘검색 실행’을 다시 선택해 주세요.</p>
                            </div>
                        ) : loading ? (
                            <div className="space-y-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={`search-skeleton-${i}`} className="h-32 bg-muted/40 animate-pulse rounded-lg" />
                                ))}
                            </div>
                        ) : results.articles.length === 0 && results.users.length === 0 && results.menus.length === 0 ? (
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
                <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-6">
                    {item.pstCn?.replace(/<[^>]*>?/gm, '') || '본문 내용이 없습니다.'}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-primary/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <UserIcon size={14} className="text-muted-foreground" />
                        </div>
                        <span className="text-sm font-bold text-foreground/70">{item.userNm || item.frstRegisterNm}</span>
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
