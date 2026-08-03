'use client';

import React, { useEffect,  useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, 
    FileText, 
    User as UserIcon, 
    Layout, 
    ArrowRight, 
    ChevronRight, 
    MessageSquare, 
    Clock, 
    Filter, 
    CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from '@/lib/api/client';
import { StandardTabs } from '@/app/components/ui/standard-tabs';

export const SearchResultsContent = ({ initialResults = { articles: [], users: [], menus: [] }, query: initialQuery = '' }: { initialResults: { articles: any[], users: any[], menus: any[] }, query: string }) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || initialQuery;

    const [activeTab, setTab] = useState('all');
    const [searchInput, setSearchInput] = useState(query);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(initialResults);

    const handleSearch = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchInput.trim()) return;
        router.push(`/search?q=${encodeURIComponent(searchInput)}`);
    };

    useEffect(() => {
        if (!query || (query === initialQuery && results === initialResults)) return;

        const fetchResults = async () => {
            setLoading(true);
            try {
                // 전역 게시글 검색 백엔드 엔드포인트는 부재(/api/v1/bbs는 /{bbsId} 기반이라 /bbs는 404) → 팬텀 호출 제거.
                const userRes = (await axios.get(`/admin/system/users?searchKeyword=${encodeURIComponent(query)}`)) as any;

                setResults({
                    articles: [],
                    users: (userRes?.data?.resultList || []).slice(0, 10),
                    menus: [
                        { name: '공지사항 관리', path: '/admin/system/menus', category: '시스템' },
                        { name: '자유 게시판', path: '/admin/community/boards', category: '커뮤니티' }
                    ].filter(m => m.name.includes(String(query || '')))
                });
            } catch (error) {
                console.error('Search failed', error);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [query, initialQuery, initialResults]);

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
        <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700 p-4 md:p-10">
            {/* Search Header */}
            <div className="relative group p-12 bg-surface-inverse rounded-lg overflow-hidden shadow-2xl shadow-primary/10">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-lg blur-[120px] animate-pulse" />

                <div className="relative z-10 space-y-8 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-2">
                        <h1 className="text-3xl md:text-3xl font-bold text-surface-inverse-foreground tracking-tighter ">
                            통합 지식 <span className="text-primary underline decoration-8 decoration-primary/20 underline-offset-8">인텔리전스</span>
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

                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto md:mx-0">
                        <div className="relative group/input">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="검색어를 입력하고 지식을 발견하세요.."
                                className="h-11 pl-16 pr-40 rounded-lg border-0 bg-white ring-offset-0 focus:ring-4 focus:ring-primary/20 transition-all font-bold text-xl placeholder:text-slate-300 placeholder:font-bold"
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
                {/* Sidebar Filters */}
                <div className="w-full md:w-64 space-y-8 shrink-0">
                    <div className="p-8 bg-card border-2 border-primary/5 rounded-lg shadow-xl">
                        <h3 className="text-sm font-bold tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                            <Filter size={14} className="text-primary" /> 필터 옵션
                        </h3>
                        <div className="space-y-4">
                            <FilterToggle label="정확도순" active />
                            <FilterToggle label="최신순" />
                            <FilterToggle label="조회수순" />
                        </div>
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
                        {loading ? (
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
                                        {results.articles.map((item: any, idx: number) => (
                                            <ArticleResultItem key={`search-article-${idx}`} item={item} query={query} />
                                        ))}
                                    </ResultSection>
                                ) : null}

                                {/* Users Section */}
                                {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 ? (
                                    <ResultSection title="임직원" count={results.users.length}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {results.users.map((item: any, idx: number) => (
                                                <UserResultItem key={`search-user-${idx}`} item={item} />
                                            ))}
                                        </div>
                                    </ResultSection>
                                ) : null}

                                {/* Menus Section */}
                                {(activeTab === 'all' || activeTab === 'menus') && results.menus.length > 0 ? (
                                    <ResultSection title="바로가기" count={results.menus.length}>
                                        {results.menus.map((item: any, idx: number) => (
                                            <MenuResultItem key={`search-menu-${idx}`} item={item} />
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

function FilterToggle({ label, active = false }: { label: string, active?: boolean }) {
    return (
        <button className={cn(
            "w-full flex items-center justify-between p-3 rounded-lg transition-all font-bold text-sm",
            active ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
        )}>
            {label}
            {active ? <CheckCircle2 size={14} /> : null}
        </button>
    );
}

function ResultSection({ title, count, children }: any) {
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

function ArticleResultItem({ item, query }: any) {
    return (
        <Link href={`/admin/community/boards/detail?bbsId=${item.bbsId}&pstId=${item.pstId}`} className="block group">
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

function UserResultItem({ item }: any) {
    return (
        <div className="p-6 bg-card border-2 border-primary/5 rounded-lg flex items-center gap-5 hover:border-primary/20 transition-all shadow-sm">
            <div className="w-14 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <UserIcon size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-lg tracking-tight truncate">{item.userNm}</h4>
                <p className="text-sm text-muted-foreground font-bold">{item.userId}</p>
            </div>
            <Badge variant="secondary" className="rounded-lg font-bold text-xs ">직원</Badge>
        </div>
    );
}

function MenuResultItem({ item }: any) {
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
