'use client';

import React, { useState, useEffect, use } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { likeBoardArticle } from '@/app/actions/boardActions';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useBoardList } from '@/hooks/api/use-board-list';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Home, ChevronRight, MessageSquare, User, Calendar as CalendarIcon, Eye, Plus, Search, ArrowUpDown, X, Settings2, BookOpen, Clock, Share2, ThumbsUp, HelpCircle, CheckCircle2, CalendarDays, Book, ChevronDown } from "lucide-react";
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import { motion, AnimatePresence } from 'framer-motion';

const BoardStats = dynamic(() => import('./BoardStats').then(mod => mod.BoardStats), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-[0.1rem]" />
});

import { BoardPost } from '@/types/business/board';

// 寃?됱뼱 ?섏씠?쇱씠??而댄룷?뚰듃
const HighlightText = ({ text, highlight }: { text: string | undefined; highlight: string }) => {
  if (!text) return null;
  if (!highlight.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </>
  );
};

function FAQItem({ item }: { item: BoardPost }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition duration-300 rounded-[0.1rem] border-2",
        isOpen ? "border-purple-500 bg-purple-50/10 shadow-xl" : "border-slate-100 hover:border-purple-200"
      )}
    >
      <div 
        className="p-6 cursor-pointer flex items-center justify-between group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl transition",
            isOpen ? "bg-purple-500 text-white shadow-lg" : "bg-slate-100 text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-500"
          )}>
            Q
          </div>
          <h4 className={cn(
            "text-xl font-black tracking-tighter transition-colors",
            isOpen ? "text-purple-600" : "text-slate-800"
          )}>
            {item.nttSj}
          </h4>
        </div>
        <div className={cn(
          "transition-transform duration-300",
          isOpen ? "rotate-180 text-purple-500" : "text-slate-300"
        )}>
          <ChevronDown size={24} />
        </div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-8 ml-[72px] border-t border-purple-100/50 pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-emerald-500/20">A</div>
                <div className="space-y-4">
                  <p className="text-slate-600 font-medium leading-relaxed text-lg whitespace-pre-wrap">
                    {item.nttCn}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] font-black text-slate-300 uppercase tracking-widest pt-4">
                    <span>Last Updated: {item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span>Views: {item.inqireCo}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export const BoardListClient = ({ dataPromise, params: initialParams }: { dataPromise: Promise<any>; params: any }) => {
  const initialData = use(dataPromise);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const bbsId = searchParams.get('bbsId') || initialParams.bbsId;

  const router = useRouter(); // router 異붽?
  const [page, setPage] = useState(initialParams.page || 1);
  const [searchWrd, setSearchWrd] = useState(initialParams.searchWrd || "");
  const [searchCnd, setSearchCnd] = useState(initialParams.searchCnd || "0");
  const [orderBy, setOrderBy] = useState(initialParams.orderBy || "date");
  const [startDate, setStartDate] = useState<Date | undefined>(initialParams.startDate ? new Date(initialParams.startDate) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(initialParams.endDate ? new Date(initialParams.endDate) : undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('board-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // URL ?뚮씪誘명꽣媛 蹂寃쎈맆 ?뚮쭏??濡쒖뺄 ?곹깭 ?숆린??(?덈줈怨좎묠/?ㅻ줈媛湲????
  useEffect(() => {
    // 寃?됱뼱???ъ슜?먭? ?낅젰 以묒씪 ???덉쑝誘濡?URL??媛믪씠 ?덉쓣 ?뚮쭔 紐낆떆?곸쑝濡??숆린??    const urlSearchWrd = searchParams.get('searchWrd');
    if (urlSearchWrd !== null) {
      setSearchWrd(urlSearchWrd);
    }
    
    setPage(Number(searchParams.get('page')) || 1);
    setSearchCnd(searchParams.get('searchCnd') || '0');
    setOrderBy(searchParams.get('orderBy') || 'date');
    const sd = searchParams.get('startDate');
    const ed = searchParams.get('endDate');
    setStartDate(sd ? new Date(sd) : undefined);
    setEndDate(ed ? new Date(ed) : undefined);
  }, [searchParams]);

  // 留덉뒪???뺣낫 諛??쒗뵆由??뺤씤
  const masterInfo = initialData.masterInfo || null;
  const tmplatId = masterInfo?.tmplatId || 'TMPLT_LIST';
  // 愿由ъ옄 ??쒕낫?쒖슜???꾨땶 ?ㅼ젣 ?쒕퉬?ㅼ슜 ?꾩튂 ?뺤씤
  const isManagementView = pathname?.includes('/admin/system/board-masters') || !bbsId?.startsWith('BBSMSTR_');

  // ?ㅼ젣 API ?붿껌???ъ슜???뚮씪誘명꽣??(URL ?뚮씪誘명꽣瑜?理쒖슦?좎쑝濡???
  const querySearchWrd = searchParams.get('searchWrd') || "";
  const querySearchCnd = searchParams.get('searchCnd') || "0";
  const queryOrderBy = searchParams.get('orderBy') || "date";
  const queryPage = Number(searchParams.get('page')) || 1;
  const queryStartDate = searchParams.get('startDate');
  const queryEndDate = searchParams.get('endDate');

  // ?꾪꽣媛 ?곸슜???곹깭?몄? ?뺤씤 (SSR 罹먯떆 臾댄슚???먮떒??
  const hasFilter = !!querySearchWrd || querySearchCnd !== '0' || queryOrderBy !== 'date' || !!queryStartDate || !!queryEndDate;
  
  // useQuery??URL ?뚮씪誘명꽣媛 蹂寃쎈맆 ?뚮쭔 ?ㅽ뻾??(議고쉶 踰꾪듉 ?대┃ ??router.push濡??몃━嫄?
  const { data, isLoading: loading } = useBoardList({
    bbsId,
    page: queryPage,
    pageUnit: 10,
    searchWrd: querySearchWrd,
    searchCnd: querySearchCnd,
    orderBy: queryOrderBy,
    startDate: queryStartDate || undefined,
    endDate: queryEndDate || undefined
  }, hasFilter ? undefined : initialData);

  // ?숆????낅뜲?댄듃瑜??곸슜??醫뗭븘??裕ㅽ뀒?댁뀡
  const likeMutation = useMutation({
    mutationFn: (nttId: string) => likeBoardArticle(bbsId, nttId),
    onMutate: async (nttId: string) => {
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
      const queryKey = ['boardList', currentParams];

      // 吏꾪뻾 以묒씤 荑쇰━ 痍⑥냼
      await queryClient.cancelQueries({ queryKey });
      
      // ?댁쟾 ?곹깭 ???(濡ㅻ갚??
      const previousData = queryClient.getQueryData(queryKey);
      
      // 罹먯떆 ?곗씠??利됱떆 ?낅뜲?댄듃
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !old.list) return old;
        return {
          ...old,
          list: old.list.map((item: any) => 
            String(item.nttId) === nttId ? { ...item, likeCo: (item.likeCo || 0) + 1 } : item
          )
        };
      });
      
      return { previousData };
    },
    onError: (err, nttId, context) => {
      // ?ㅽ뙣 ??濡ㅻ갚
      queryClient.setQueryData(['boardList', bbsId, queryPage, querySearchWrd, queryOrderBy], context?.previousData);
    },
    onSettled: () => {
      // 理쒖쥌?곸쑝濡??쒕쾭 ?곗씠?곗? ?숆린??      queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
    }
  });

  const handleLike = (e: React.MouseEvent, nttId: string) => {
    e.preventDefault();
    e.stopPropagation();
    likeMutation.mutate(nttId);
  };

  // ?꾨━誘몄뾼 ?ㅼ펷?덊넠 而댄룷?뚰듃
  const BoardSkeleton = () => {
    if (tmplatId === 'hub') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 p-10">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-video w-full rounded-[0.1rem]" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (tmplatId === 'qna') {
      return (
        <div className="p-10 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-6 p-6 border-2 border-slate-50">
              <Skeleton className="w-16 h-16 rounded-lg shrink-0" />
              <div className="space-y-3 flex-1">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="p-10 space-y-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[0.1rem]" />
        ))}
      </div>
    );
  };

  const list: BoardPost[] = data?.list || [];
  const totalCount = data?.total || 0;
  const totalPages = data?.totalPage || 0;

  // 罹섎┛???곗씠??媛怨?濡쒖쭅
  const currentViewDate = startDate || new Date();
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0: Sun, 6: Sat
  
  // 寃뚯떆湲???좎쭨蹂꾨줈 洹몃９??  const postsByDay = list.reduce((acc: { [key: number]: BoardPost[] }, post) => {
    const targetDate = post.eventDate || post.createdDate;
    if (targetDate) {
      const d = new Date(targetDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!acc[day]) acc[day] = [];
        acc[day].push(post);
      }
    }
    return acc;
  }, {});

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 湲곗〈 ?뚮씪誘명꽣 蹂댁〈?섎ŉ 寃?됱뼱/議곌굔留?媛깆떊
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchWrd.trim()) {
      params.set('searchWrd', searchWrd.trim());
    } else {
      params.delete('searchWrd');
    }
    
    params.set('searchCnd', searchCnd);
    params.set('page', '1'); // 寃????1?섏씠吏濡?媛뺤젣 ?대룞
    
    // URL ?대룞 (?대룞 ??searchParams媛 蹂寃쎈릺誘濡?useEffect?먯꽌 useBoardList瑜??몃━嫄고븿)
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-20">
      {/* Breadcrumb - ?숈쟻 硫붾돱 ?쒖뒪???곕룞 */}
      <DynamicBreadcrumb 
        customItems={[
          { name: pathname?.includes('/admin/system') ? '?쒖뒪??愿由? : '而ㅻ??덊떚 諛?肄섑뀗痢? },
          { name: masterInfo?.bbsNm || (bbsId?.includes('NOTICE') ? '怨듭??ы빆' : '寃뚯떆??) }
        ]}
      />

      {/* ?쒗뵆由우뿉 ?곕Ⅸ 李⑤퀎?붾맂 ?곷떒 ?ㅻ뜑 */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-1.5 h-8 rounded-full", tmplatId === 'TMPLT_HUB' ? "bg-indigo-500" : "bg-primary")} />
          <h2 className="text-3xl font-black tracking-tight">
            {masterInfo?.bbsNm || (bbsId?.includes('NOTICE') ? '怨듭??ы빆' : '寃뚯떆??)}
          </h2>
          {tmplatId === 'TMPLT_HUB' && <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-bold ml-2">吏???덈툕</Badge>}
        </div>
        <p className="text-muted-foreground font-medium ml-4">
          {masterInfo?.bbsIntrcn || '??寃뚯떆?먯쓽 ?쒕룞?댁뿭怨?理쒖떊 ?뚯떇???뺤씤?섏꽭??'}
        </p>
      </div>

      {/* 愿由ъ옄 酉곗뿉?쒕쭔 ?듦퀎 由ы룷???몄텧 */}
      {isAdmin && isManagementView && <BoardStats />}

      <Card className="border-none shadow-2xl overflow-hidden rounded-[0.1rem] ring-1 ring-slate-200 bg-white">
        <CardHeader className="bg-white py-12 px-12 md:px-20 flex flex-col md:flex-row items-center justify-between gap-10 border-b border-slate-50">
          <div className="flex-1 space-y-4">
            <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
              {tmplatId === 'TMPLT_HUB' ? <BookOpen className="w-8 h-8 text-primary" /> : <MessageSquare className="w-8 h-8 text-primary" />}
              <span>{masterInfo?.bbsNm || (bbsId?.includes('NOTICE') ? '怨듭??ы빆' : '寃뚯떆??)}</span>
            </CardTitle>
            <p className="text-slate-500 font-bold text-sm">珥?<span className="text-primary">{totalCount}媛?/span>???뚯쨷???댁빞湲곌? ?닿꺼?덉뒿?덈떎.</p>
          </div>
          <CardAction className="flex items-center gap-3">
            {mounted && (
              <>
                {isAdmin && (
                  <Link href="/admin/community/boards/master">
                    <Button variant="outline" size="lg" className="h-14 px-8 gap-2 border-2 border-slate-200 dark:border-white/20 bg-white text-slate-900 dark:text-white hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 font-black shadow-xl transition rounded-[0.1rem]">
                      <Settings2 className="w-6 h-6" /> 寃뚯떆??愿由?                    </Button>
                  </Link>
                )}
                <Link href={`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}`}>
                  <Button size="lg" className="h-14 px-8 gap-2 bg-primary text-white hover:scale-105 font-black shadow-xl transition rounded-[0.1rem]">
                    <div className="flex items-center gap-2">
                      <Plus className="w-6 h-6" /> 湲?곌린
                    </div>
                  </Button>
                </Link>
              </>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="pt-10 px-10">
          <div className="flex flex-row items-center gap-3 mb-4 bg-slate-50/50 p-6 rounded-[0.1rem] border border-slate-200 shadow-inner">
            <form onSubmit={handleSearch} className="flex flex-col gap-3 w-full">
              <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                {mounted ? (
                  <Select value={searchCnd} onValueChange={setSearchCnd}>
                    <SelectTrigger className="w-full md:w-[220px] !h-12 rounded-[0.1rem] border border-slate-200 bg-white font-bold shadow-sm flex items-center leading-none">
                      <SelectValue placeholder="寃??議곌굔" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">?쒕ぉ</SelectItem>
                      <SelectItem value="1">?댁슜</SelectItem>
                      <SelectItem value="2">?묒꽦??/SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="w-full md:w-[220px] h-12 rounded-[0.1rem] border border-slate-200 bg-slate-100 animate-pulse" />
                )}
                <div className="relative flex-1 group !h-12">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="board-search-input"
                    data-testid="board-search-input"
                    type="text"
                    className="pl-12 pr-10 !h-12 text-sm border border-slate-200 bg-white shadow-sm rounded-[0.1rem] focus-visible:ring-primary/20 transition font-bold leading-none flex items-center"
                    placeholder="?대뼡 ?뺣낫瑜?李얠쑝?쒕굹??"
                    value={searchWrd}
                    onChange={(e) => setSearchWrd(e.target.value)}
                  />
                  {!searchWrd && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 pointer-events-none select-none">
                      <span className="text-[8px] opacity-60">??/span>K
                    </div>
                  )}
                  {searchWrd && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchWrd("");
                        // 利됱떆 ?꾩껜 議고쉶 ?ㅽ뻾
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('searchWrd');
                        params.set('page', '1');
                        router.push(`${pathname}?${params.toString()}`);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                <div className="flex items-center gap-2 flex-1 w-full overflow-x-auto">
                  {mounted ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "!h-12 px-5 justify-start text-left font-bold rounded-[0.1rem] border border-slate-200 bg-white shadow-sm w-full md:w-[220px] flex items-center leading-none",
                            !startDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 text-primary opacity-50 shrink-0" />
                          <span className="text-sm truncate">
                            {startDate ? (
                              endDate ? (
                                `${format(startDate, "yyyy.MM.dd")} - ${format(endDate, "yyyy.MM.dd")}`
                              ) : (
                                format(startDate, "yyyy.MM.dd")
                              )
                            ) : (
                              "湲곌컙 ?좏깮"
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[0.1rem] overflow-hidden border-none shadow-2xl" align="start">
                      <div className="p-3 bg-white border-b flex items-center justify-between">
                        <span className="font-black text-slate-800 text-sm">湲곌컙 ?ㅼ젙</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                          className="!h-7 px-2 text-xs font-bold text-slate-400 hover:text-red-500"
                        >
                          <X size={12} className="mr-1" /> 珥덇린??                        </Button>
                      </div>
                      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          locale={ko}
                          className="p-3"
                        />
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          locale={ko}
                          className="p-3"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <div className="w-full md:w-[220px] h-12 rounded-[0.1rem] border border-slate-200 bg-slate-100 animate-pulse" />
                )}

                  {mounted ? (
                    <Select value={orderBy} onValueChange={(value) => {
                      setOrderBy(value);
                      // ?뺣젹 蹂寃???利됱떆 議고쉶 ?ㅽ뻾 (寃?됱뼱 諛?議곌굔 ?좎?)
                      const params = new URLSearchParams(searchParams.toString());
                      params.set('orderBy', value);
                      if (searchWrd) params.set('searchWrd', searchWrd);
                      if (searchCnd) params.set('searchCnd', searchCnd);
                      params.set('page', '1');
                      router.push(`${pathname}?${params.toString()}`);
                    }}>
                      <SelectTrigger data-testid="board-sort-select" className="w-full md:w-[140px] !h-12 rounded-[0.1rem] border border-slate-200 bg-white font-bold shadow-sm text-sm flex items-center leading-none">
                        <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-primary opacity-50 shrink-0" />
                        <SelectValue placeholder="?뺣젹 諛⑹떇" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date">理쒖떊??/SelectItem>
                        <SelectItem value="views">議고쉶?섏닚</SelectItem>
                        <SelectItem value="comments">?볤???/SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="w-full md:w-[140px] h-12 rounded-[0.1rem] border border-slate-200 bg-slate-100 animate-pulse" />
                  )}
                </div>

                <Button type="submit" size="lg" className="!h-12 px-10 gap-2 bg-slate-900 border border-slate-900 shadow-xl hover:scale-105 transition active:scale-95 font-black text-white rounded-[0.1rem] flex items-center leading-none">
                  <Search className="w-4 h-4 shrink-0" /> 議고쉶
                </Button>
              </div>
            </form>
          </div>

          <div className="rounded-[0.1rem] border-2 border-slate-50 overflow-hidden shadow-2xl bg-white mb-10">
            {loading ? (
              <Table>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`board-loading-${i}`} className="border-b last:border-0">
                      <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-[0.1rem]" /></TableCell>
                      <TableCell className="py-8 px-6"><Skeleton className="h-8 w-full rounded-[0.1rem]" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-[0.1rem]" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-[0.1rem]" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-[0.1rem]" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : tmplatId === 'TMPLT_HUB' && list.length > 0 ? (
              <div className="space-y-10 p-10">
                {/* Hub Featured Section */}
                {page === 1 && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <Card className="lg:col-span-12 p-10 bg-slate-50 dark:bg-slate-900 rounded-[0.1rem] text-slate-900 dark:text-white relative overflow-hidden group border-none shadow-xl">
                      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-primary/10 dark:bg-primary/20 blur-[100px] rounded-full" />
                      <div className="relative z-10 space-y-6">
                        <Badge className="bg-primary hover:bg-primary text-white border-none font-black tracking-[0.4em] uppercase py-1 px-4 text-[10px]">FEATURED_KNOWLEDGE</Badge>
                        <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${list[0].nttId}`}>
                          <h3 className="text-4xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors cursor-pointer">{list[0].nttSj}</h3>
                        </Link>
                        <div className="flex items-center gap-8 mt-8">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-white/10 flex items-center justify-center text-primary italic font-black text-xs border border-primary/20 dark:border-white/10">OP</div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-400 dark:text-white/40 italic uppercase tracking-widest leading-none mb-1">Author</span>
                              <span className="text-sm font-black">{list[0].frstRegisterNm}</span>
                            </div>
                          </div>
                          <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                          <div className="flex items-center gap-3 text-slate-400 dark:text-white/40">
                             <Clock size={16} />
                             <span className="text-xs font-bold">{list[0].createdDate ? String(list[0].createdDate).substring(0, 10) : 'Just now'}</span>
                          </div>
                          <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                          <div className="flex items-center gap-3 text-slate-400 dark:text-white/40">
                             <Eye size={16} />
                             <span className="text-xs font-bold">{list[0].inqireCo} views</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
                
                {/* Grid for minor posts */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(page === 1 ? list.slice(1) : list).map((item: BoardPost) => (
                    <Card key={item.nttId} className="group p-8 bg-slate-50/50 rounded-[0.1rem] border-2 border-slate-100 space-y-6 hover:border-primary transition cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-125 transition text-primary">
                        <BookOpen size={60} />
                      </div>
                      <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${item.nttId}`}>
                        <h4 className="font-black text-slate-800 text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.nttSj}</h4>
                      </Link>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200/50">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs"><Eye size={14} /> {item.inqireCo}</div>
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs"><MessageSquare size={14} /> 0</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition">
                          <ChevronRight size={18} />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : tmplatId === 'TMPLT_GALLERY' && list.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10 p-10">
                {list.map((item: BoardPost) => (
                  <Card key={item.nttId} className="group overflow-hidden rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-sm transition hover:shadow-2xl hover:-translate-y-2">
                    <div className="h-64 overflow-hidden relative bg-slate-100">
                      {/* Using a consistent visual pattern for empty images, could be replaced with real images from storage */}
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 group-hover:scale-105 transition-transform duration-700" />
                        <BookOpen size={120} className="text-slate-400 opacity-20 relative z-10" />
                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-500" />
                      </div>
                      <div className="absolute top-6 right-6 px-4 py-1.5 bg-slate-900/60 backdrop-blur-md rounded-full text-white text-[10px] font-black tracking-widest uppercase">INSIGHT</div>
                    </div>
                    <CardContent className="p-8 space-y-6">
                      <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${item.nttId}`}>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight group-hover:text-primary transition-colors cursor-pointer line-clamp-2">
                          <HighlightText text={item.nttSj} highlight={querySearchWrd} />
                        </h3>
                      </Link>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-white font-black text-[10px] italic border border-slate-200 dark:border-slate-800">OP</div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200 leading-none mb-1">
                              <HighlightText text={item.frstRegisterNm} highlight={querySearchWrd} />
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <button 
                            data-testid="like-button"
                            onClick={(e) => handleLike(e, String(item.nttId))}
                            className="flex items-center gap-1.5 text-slate-300 hover:text-primary transition active:scale-125"
                          >
                            <ThumbsUp size={16} className={cn(likeMutation.isPending && "animate-bounce")} />
                            <span data-testid="like-count" className="text-xs font-black text-slate-900">{item.likeCo || 0}</span>
                          </button>
                          <div className="flex items-center gap-1.5 text-slate-300"><Share2 size={16} /></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : tmplatId === 'TMPLT_QNA' && list.length > 0 ? (
              <div className="space-y-6 p-10">
                {list.map((item: BoardPost, idx: number) => (
                  <Card key={item.nttId} className="group p-8 bg-white border-2 border-slate-100 rounded-[0.1rem] flex gap-8 hover:border-amber-500 transition cursor-pointer relative overflow-hidden">
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <div className={cn(
                          "w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl shadow-inner transition group-hover:scale-110",
                          item.qnaStatus === 'SOLVED' ? "bg-emerald-100 text-emerald-600 border-2 border-emerald-200" : "bg-amber-100 text-amber-600 border-2 border-amber-200"
                        )}>
                          {item.qnaStatus === 'SOLVED' ? <CheckCircle2 size={32} /> : <HelpCircle size={32} /> }
                        </div>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          item.qnaStatus === 'SOLVED' ? "text-emerald-500" : "text-amber-500"
                        )}>{item.qnaStatus === 'SOLVED' ? 'Solved' : 'Open'}</span>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-4">
                          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none text-[10px] font-black px-3 py-1">
                            {item.qnaCategory || 'GENERAL_QNA'}
                          </Badge>
                        <span className="text-[11px] font-bold text-slate-300 italic flex items-center gap-1.5"><Clock size={12} /> {item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                      </div>
                      <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${item.nttId}`}>
                        <h4 className="text-2xl font-black text-slate-800 leading-tight group-hover:text-amber-600 transition-colors tracking-tighter uppercase italic">
                          <HighlightText text={item.nttSj} highlight={querySearchWrd} />
                        </h4>
                      </Link>
                      <div className="flex flex-wrap items-center gap-6 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black">AD</div>
                          <span className="text-xs font-bold text-slate-500">
                            <HighlightText text={item.frstRegisterNm} highlight={querySearchWrd} />
                          </span>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 text-slate-400 font-black text-xs">
                          <MessageSquare size={14} className="text-amber-400" />
                          <span>{Math.floor(Math.random() * 5)} Answers</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <button 
                          data-testid="like-button"
                          onClick={(e) => handleLike(e, String(item.nttId))}
                          className="flex items-center gap-2 text-slate-400 hover:text-amber-500 font-black text-xs transition active:scale-110"
                        >
                          <ThumbsUp size={14} className={cn(likeMutation.isPending && "animate-bounce")} />
                          <span data-testid="like-count">{item.likeCo || 0} Likes</span>
                        </button>
                      </div>
                    </div>
                    <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition">
                      <HelpCircle size={150} />
                    </div>
                  </Card>
                ))}
              </div>
            ) : tmplatId === 'TMPLT_CALENDAR' ? (
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-8 rounded-[0.1rem] text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 transition-colors">
                  <div className="space-y-1">
                    <p className="text-primary font-black tracking-[0.2em] text-[10px] uppercase">Event schedule</p>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase">
                      {format(currentViewDate, "MMMM yyyy", { locale: ko })}
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const prev = new Date(year, month - 1, 1);
                        setStartDate(prev);
                      }}
                      className="h-12 w-12 border-slate-200 dark:border-white/20 bg-white/50 dark:bg-white/10 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-[0.1rem] transition text-slate-900 dark:text-white"
                    >
                      <ChevronRight className="rotate-180" size={20} />
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const next = new Date(year, month + 1, 1);
                        setStartDate(next);
                      }}
                      className="h-12 w-12 border-slate-200 dark:border-white/20 bg-white/50 dark:bg-white/10 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 rounded-[0.1rem] transition text-slate-900 dark:text-white"
                    >
                      <ChevronRight size={20} />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-4">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                    <div key={d} className="text-center font-black text-slate-400 text-xs tracking-widest pb-4 border-b-2 border-slate-50">{d}</div>
                  ))}
                  {Array.from({ length: 42 }, (_, i) => i - firstDayOfMonth + 1).map((day, i) => {
                    const isCurrentMonth = day > 0 && day <= daysInMonth;
                    const dayPosts = isCurrentMonth ? postsByDay[day] || [] : [];
                    const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                    return (
                      <div key={i} className={cn(
                        "min-h-[160px] p-4 border-2 transition relative group rounded-[0.1rem]",
                        isToday ? "bg-primary/5 border-primary/20 shadow-inner" : "bg-white border-slate-50 hover:border-slate-300",
                        !isCurrentMonth ? "opacity-10 pointer-events-none bg-slate-50/50" : ""
                      )}>
                        <div className="flex justify-between items-start mb-4">
                          <span className={cn(
                            "text-xl font-black", 
                            isToday ? "text-primary" : "text-slate-300 group-hover:text-slate-900",
                            (i % 7 === 0) && isCurrentMonth ? "text-red-400" : "", // Sunday
                            (i % 7 === 6) && isCurrentMonth ? "text-blue-400" : "" // Saturday
                          )}>
                            {isCurrentMonth ? day : ''}
                          </span>
                          {dayPosts.length > 0 && (
                            <Badge className="bg-primary hover:bg-primary text-[9px] font-black h-5 w-5 rounded-full p-0 flex items-center justify-center border-none">
                              {dayPosts.length}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 max-h-[100px] overflow-y-auto custom-scrollbar">
                          {dayPosts.map((post) => (
                            <Link 
                              key={post.nttId}
                              href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${post.nttId}`}
                              className={cn(
                                "block p-2 text-[10px] font-black leading-tight rounded-sm shadow-sm transition hover:scale-105 cursor-pointer truncate",
                                post.noticeAt === 'Y' ? "bg-rose-500 text-white" : "bg-slate-900 text-white"
                              )}
                              title={post.nttSj}
                            >
                              {post.nttSj}
                            </Link>
                          ))}
                        </div>

                        {isCurrentMonth && (
                          <div className="absolute bottom-4 right-4 text-[8px] font-black text-slate-100 group-hover:text-slate-200 transition uppercase">
                            {`${year}_${month + 1}_${day}`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : tmplatId === 'TMPLT_FAQ' && list.length > 0 ? (
              <div className="p-10 space-y-4">
                {list.map((item: BoardPost) => (
                  <FAQItem key={item.nttId} item={item} />
                ))}
              </div>
            ) : tmplatId === 'TMPLT_WIKI' && list.length > 0 ? (
              <div className="p-10 space-y-8">
                {list.map((item: BoardPost) => (
                  <Card key={item.nttId} className="group overflow-hidden border-2 border-slate-50 hover:border-slate-900 transition rounded-[0.1rem]">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-16 bg-slate-100 flex md:flex-col items-center justify-center p-4 gap-2 shrink-0">
                        <Book className="text-slate-400 group-hover:text-slate-900 transition-colors" size={24} />
                      </div>
                      <div className="flex-1 p-8 space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-none border-slate-200">Doc v1.0</Badge>
                          <span className="text-[11px] font-bold text-slate-300 italic">{item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                        </div>
                        <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${item.nttId}`}>
                          <h4 className="text-2xl font-black text-slate-900 leading-tight group-hover:underline decoration-slate-900 decoration-4 underline-offset-8 transition">
                            <HighlightText text={item.nttSj} highlight={querySearchWrd} />
                          </h4>
                        </Link>
                        <p className="text-slate-500 font-medium line-clamp-2 leading-relaxed">{item.nttCn}</p>
                        <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Author</span>
                             <span className="text-xs font-black text-slate-600">
                               <HighlightText text={item.frstRegisterNm} highlight={querySearchWrd} />
                             </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Views</span>
                             <span className="text-xs font-black text-slate-600">{item.inqireCo}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : list.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 gap-4 text-slate-300">
                <div className="p-10 bg-slate-50 rounded-full"><MessageSquare className="w-16 h-16 opacity-10" /></div>
                {querySearchWrd ? (
                  <>
                    <p className="text-xl font-black text-slate-400">
                      &ldquo;<span className="text-primary">{querySearchWrd}</span>&rdquo;?????寃??寃곌낵媛 ?놁뒿?덈떎.
                    </p>
                    <p className="text-sm font-medium text-slate-400">?ㅻⅨ 寃?됱뼱瑜??쒕룄?섍굅?? ?꾪꽣 議곌굔??蹂寃쏀빐 蹂댁꽭??</p>
                    <button
                      onClick={() => {
                        setSearchWrd('');
                        setSearchCnd('0');
                        setOrderBy('date');
                        setStartDate(undefined);
                        setEndDate(undefined);
                        router.push(`${pathname}?bbsId=${bbsId}`);
                      }}
                      className="mt-2 px-6 py-2.5 bg-slate-900 text-white font-black text-sm rounded-[0.1rem] hover:bg-slate-800 transition active:scale-95 flex items-center gap-2"
                    >
                      <X size={14} /> ?꾪꽣 珥덇린??                    </button>
                  </>
                ) : (
                  <p className="text-xl font-black">寃뚯떆湲???꾩쭅 ?놁뒿?덈떎.</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="w-[80px] text-center font-black text-slate-400 tracking-tight text-[11px] py-8">踰덊샇</TableHead>
                    <TableHead className="font-black text-slate-900 tracking-tight text-[11px] py-8 px-6">?쒕ぉ</TableHead>
                    <TableHead className="w-[150px] font-black text-slate-400 tracking-tight text-[11px] py-8 text-center">?묒꽦??/TableHead>
                    <TableHead className="w-[140px] font-black text-slate-400 tracking-tight text-[11px] py-8 text-center">?깅줉??/TableHead>
                    <TableHead className="w-[180px] font-black text-slate-400 tracking-tight text-[11px] py-8 text-center">李몄뿬??/TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((item: BoardPost, idx: number) => (
                    <TableRow key={item.nttId} className="hover:bg-primary/[0.02] transition group border-b last:border-0">
                      <TableCell className="text-center font-bold text-sm text-slate-400 py-8">
                        {totalCount - ((page - 1) * 10) - idx}
                      </TableCell>
                      <TableCell className="px-6 py-8">
                        <Link href={`/admin/community/boards/detail?bbsId=${bbsId}&nttId=${item.nttId}`} className="group/link flex flex-col gap-1">
                          <div className="text-xl font-black text-slate-800 group-hover/link:text-primary transition-colors line-clamp-1">
                            <HighlightText text={item.nttSj} highlight={querySearchWrd} />
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center py-8">
                        <div className="font-bold text-slate-600 bg-slate-100/50 mx-auto w-fit px-5 py-2 rounded-[0.1rem] border border-slate-100 flex items-center gap-2">
                          <User size={14} className="opacity-30" />
                          <HighlightText text={item.frstRegisterNm} highlight={querySearchWrd} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-8">
                        <div className="font-bold text-slate-400 flex items-center justify-center gap-2">
                          <CalendarIcon size={14} className="opacity-30" />
                          {item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <div className="font-black text-primary/60 bg-primary/5 px-4 py-1.5 rounded-lg flex items-center gap-2 border border-primary/10 w-24 justify-center">
                            <Eye size={14} className="opacity-40" />
                            {item.inqireCo}
                          </div>
                          <button
                            data-testid="like-button"
                            onClick={(e) => handleLike(e, String(item.nttId))}
                            className="font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-lg flex items-center gap-2 border border-slate-100 w-24 justify-center hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition active:scale-95 group-hover:bg-white"
                          >
                            <ThumbsUp size={14} className={cn("opacity-30", likeMutation.isPending && "animate-bounce")} />
                            <span data-testid="like-count">{item.likeCo || 0}</span>
                          </button>
                          <div className="font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-lg flex items-center gap-2 border border-slate-100 w-24 justify-center group-hover:bg-white transition-colors">
                            <MessageSquare size={14} className="opacity-30" />
                            {0}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-8 py-10">
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(Math.max(1, queryPage - 1)));
                  router.push(`${pathname}?${params.toString()}`);
                }}
                disabled={queryPage === 1}
                className="h-12 px-8 font-black rounded-[0.1rem] border-2 hover:bg-slate-50"
              >
                ?댁쟾
              </Button>
              <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-900 px-8 py-3 rounded-[0.1rem] shadow-xl border border-slate-200 dark:border-slate-800">
                <span className="text-lg font-black text-slate-900 dark:text-white">{queryPage}</span>
                <div className="h-4 w-px bg-slate-300 dark:bg-white/20" />
                <span className="text-sm font-bold text-slate-400 dark:text-white/50">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('page', String(Math.min(totalPages, queryPage + 1)));
                  router.push(`${pathname}?${params.toString()}`);
                }}
                disabled={queryPage === totalPages}
                className="h-12 px-8 font-black rounded-[0.1rem] border-2 hover:bg-slate-50"
              >
                ?ㅼ쓬
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
