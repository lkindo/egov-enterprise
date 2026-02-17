'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Search, 
  FileText, 
  User as UserIcon, 
  Layout, 
  ArrowRight, 
  ChevronRight, 
  Home,
  MessageSquare,
  Clock,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardTabs } from '@/app/components/ui/standard-tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from '@/lib/api/client';

const SearchResultsContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  
  const [activeTab, setTab] = useState('all');
  const [searchInput, setSearchInput] = useState(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    articles: any[],
    users: any[],
    menus: any[]
  }>({ articles: [], users: [], menus: [] });

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInput.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchInput)}`);
  };

  useEffect(() => {
    if (!query) return;
    
    const fetchResults = async () => {
      setLoading(true);
      try {
        // 실제 운영 환경에서는 통합 검색 API 하나로 호출하는 것이 좋지만,
        // 여기서는 각각의 서비스에서 데이터를 가져오는 방식으로 시뮬레이션합니다.
        const [bbsRes, userRes] = await Promise.all([
          axios.get(`/bbs?searchWrd=${query}&searchCnd=0`),
          axios.get(`/admin/users?searchKeyword=${query}&searchCondition=1`)
        ]);

        setResults({
          articles: bbsRes.data.resultList || [],
          users: userRes.data.resultList || [],
          menus: [
            { name: '공지사항 관리', path: '/admin/system/menus', category: '시스템' },
            { name: '자유 게시판', path: '/cop/bbs/selectBoardList', category: '커뮤니티' }
          ].filter(m => m.name.includes(query))
        });
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const tabs = [
    { id: 'all', label: '전체 결과', icon: <Layout size={16} /> },
    { id: 'articles', label: '게시글', count: results.articles.length, icon: <MessageSquare size={16} /> },
    { id: 'users', label: '임직원', count: results.users.length, icon: <UserIcon size={16} /> },
    { id: 'menus', label: '메뉴 바로가기', count: results.menus.length, icon: <FileText size={16} /> }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Search Header */}
      <div className="relative group p-12 bg-slate-950 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-primary/10">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        
        <div className="relative z-10 space-y-8 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic uppercase">
                Global <span className="text-primary underline decoration-8 decoration-primary/20 underline-offset-8">Intelligence</span>
              </h1>
              <p className="text-slate-400 font-medium text-lg">시스템 전체에서 필요한 정보를 정밀하게 찾아냅니다.</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 px-5 py-2.5 rounded-2xl border border-white/10 backdrop-blur-xl">
              <Clock className="text-primary" size={18} />
              <span className="text-xs font-black text-white uppercase tracking-widest">Real-time Indexing Active</span>
            </div>
          </div>

          <form onSubmit={handleSearch} className="max-w-3xl mx-auto md:mx-0">
            <div className="relative group/input">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within/input:text-primary transition-colors" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="검색어를 입력하고 지식을 발견하세요..."
                className="h-20 pl-16 pr-32 text-xl font-bold bg-white/5 border-2 border-white/10 rounded-3xl text-white placeholder:text-slate-500 focus:border-primary focus:ring-primary/20 transition-all shadow-inner"
              />
              <Button 
                type="submit" 
                className="absolute right-3 top-1/2 -translate-y-1/2 h-14 px-8 rounded-2xl font-black text-lg shadow-xl"
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
          <div className="p-8 bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
              <Filter size={14} className="text-primary" /> Filter Options
            </h3>
            <div className="space-y-4">
              <FilterToggle label="정확도순" active />
              <FilterToggle label="최신순" />
              <FilterToggle label="조회수순" />
            </div>
          </div>

          <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] bg-primary/20 w-32 h-32 rounded-full blur-[60px]" />
            <div className="relative z-10 space-y-4">
              <h4 className="text-sm font-black italic uppercase tracking-widest text-primary">Pro Tip</h4>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                단축키 <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10">Ctrl + K</kbd> 를 누르면 어디서든 커맨드 센터를 열 수 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Main Results Area */}
        <div className="flex-1 space-y-8">
          <StandardTabs 
            tabs={tabs} 
            activeTab={activeTab} 
            onChange={setTab} 
            className="p-1.5 bg-muted/30 rounded-[1.5rem]"
          />

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
            {loading ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-muted/40 animate-pulse rounded-[2rem]" />
                ))}
              </div>
            ) : results.articles.length === 0 && results.users.length === 0 && results.menus.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                <div className="w-24 h-24 bg-muted/30 rounded-[2.5rem] flex items-center justify-center">
                  <Search size={48} className="text-muted-foreground/20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-foreground/60">일치하는 결과가 없습니다.</h3>
                  <p className="text-sm text-muted-foreground font-medium">검색어를 다시 확인하거나 다른 키워드로 시도해보세요.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Articles Section */}
                {(activeTab === 'all' || activeTab === 'articles') && results.articles.length > 0 && (
                  <ResultSection title="Articles" count={results.articles.length}>
                    {results.articles.map((item, idx) => (
                      <ArticleResultItem key={idx} item={item} query={query} />
                    ))}
                  </ResultSection>
                )}

                {/* Users Section */}
                {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                  <ResultSection title="Employees" count={results.users.length}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {results.users.map((item, idx) => (
                        <UserResultItem key={idx} item={item} />
                      ))}
                    </div>
                  </ResultSection>
                )}

                {/* Menus Section */}
                {(activeTab === 'all' || activeTab === 'menus') && results.menus.length > 0 && (
                  <ResultSection title="Shortcuts" count={results.menus.length}>
                    {results.menus.map((item, idx) => (
                      <MenuResultItem key={idx} item={item} />
                    ))}
                  </ResultSection>
                )}
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
      "w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold text-sm",
      active ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
    )}>
      {label}
      {active && <CheckCircle2 size={14} />}
    </button>
  );
}

function ResultSection({ title, count, children }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-2">
        <h3 className="text-xl font-black tracking-tight uppercase italic">{title}</h3>
        <Badge variant="outline" className="rounded-lg border-primary/20 text-primary font-black">{count}</Badge>
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
    <Link href={`/cop/bbs/selectBoardArticle/${item.nttId}?bbsId=${item.bbsId}`} className="block group">
      <div className="p-8 bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-lg group-hover:shadow-xl group-hover:border-primary/20 transition-all group-hover:-translate-y-1">
        <div className="flex justify-between items-start gap-4 mb-4">
          <h4 className="text-xl font-black group-hover:text-primary transition-colors line-clamp-1">
            {item.nttSj}
          </h4>
          <span className="text-[10px] font-bold text-muted-foreground/40 bg-muted px-2 py-1 rounded-md shrink-0">
            {item.frstRegisterPnttm?.substring(0, 10)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-6">
          {item.nttCn?.replace(/<[^>]*>?/gm, '') || '본문 내용이 없습니다.'}
        </p>
        <div className="flex items-center justify-between pt-6 border-t border-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <UserIcon size={14} className="text-muted-foreground" />
            </div>
            <span className="text-xs font-bold text-foreground/70">{item.frstRegisterNm}</span>
          </div>
          <ArrowRight size={18} className="text-primary opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
        </div>
      </div>
    </Link>
  );
}

function UserResultItem({ item }: any) {
  return (
    <div className="p-6 bg-card border-2 border-primary/5 rounded-[2rem] flex items-center gap-5 hover:border-primary/20 transition-all shadow-sm">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
        <UserIcon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-lg tracking-tight truncate">{item.userNm}</h4>
        <p className="text-xs text-muted-foreground font-bold">{item.userId}</p>
      </div>
      <Badge variant="secondary" className="rounded-lg font-black text-[10px] uppercase">Staff</Badge>
    </div>
  );
}

function MenuResultItem({ item }: any) {
  return (
    <Link href={item.path} className="flex items-center justify-between p-6 bg-muted/20 border-2 border-transparent hover:border-primary/20 hover:bg-card rounded-2xl transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm group-hover:scale-110 transition-transform">
          <Layout size={18} />
        </div>
        <div>
          <h4 className="font-black text-base">{item.name}</h4>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.category} Module</span>
        </div>
      </div>
      <ChevronRight size={20} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

import { CheckCircle2 } from 'lucide-react';

const IntegratedSearchPage = () => {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-muted-foreground animate-pulse">Initializing Search Index...</p>
      </div>
    }>
      <SearchResultsContent />
    </Suspense>
  );
};

export default IntegratedSearchPage;
