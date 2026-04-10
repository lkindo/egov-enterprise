'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
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

function FAQItem({ item }: { item: BoardPost }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 rounded-[0.1rem] border-2",
        isOpen ? "border-purple-500 bg-purple-50/10 shadow-xl" : "border-slate-100 hover:border-purple-200"
      )}
    >
      <div 
        className="p-6 cursor-pointer flex items-center justify-between group"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-6">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center font-black text-xl transition-all",
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

export const BoardListClient = ({ initialData, params: initialParams }: { initialData: any; params: any }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const bbsId = searchParams.get('bbsId') || initialParams.bbsId;

  const [searchWrd, setSearchWrd] = useState(initialParams.searchWrd || '');
  const [page, setPage] = useState(initialParams.page || 1);
  const [searchCnd, setSearchCnd] = useState(initialParams.searchCnd || '0');
  const [orderBy, setOrderBy] = useState(initialParams.orderBy || 'date');
  const [startDate, setStartDate] = useState<Date | undefined>(initialParams.startDate ? new Date(initialParams.startDate) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(initialParams.endDate ? new Date(initialParams.endDate) : undefined);
  
  // 마스터 정보 및 템플릿 확인
  const masterInfo = initialData.masterInfo || null;
  const tmplatId = masterInfo?.tmplatId || 'TMPLT_LIST';
  // 관리자 대시보드용이 아닌 실제 서비스용 위치 확인
  const isManagementView = pathname.includes('/admin/system/board-masters') || !bbsId.startsWith('BBSMSTR_');

  const { data, isLoading: loading } = useBoardList({
    bbsId,
    page,
    pageUnit: 10,
    searchWrd,
    searchCnd,
    orderBy,
    startDate: startDate ? format(startDate, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
    endDate: endDate ? format(endDate, "yyyy-MM-dd'T'HH:mm:ss") : undefined
  }, initialData);

  const list: BoardPost[] = data?.resultList || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 0;

  // 캘린더 데이터 가공 로직
  const currentViewDate = startDate || new Date();
  const year = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0: Sun, 6: Sat
  
  // 게시글을 날짜별로 그룹화
  const postsByDay = list.reduce((acc: { [key: number]: BoardPost[] }, post) => {
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
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-6 p-6 pb-20">
      {/* Breadcrumb - 동적 메뉴 시스템 연동 */}
      <DynamicBreadcrumb 
        customItems={[
          { name: pathname.includes('/admin/system') ? '시스템 관리' : '커뮤니티 및 콘텐츠' },
          { name: masterInfo?.bbsNm || (bbsId.includes('NOTICE') ? '공지사항' : '게시판') }
        ]}
      />

      {/* 템플릿에 따른 차별화된 상단 헤더 */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-1.5 h-8 rounded-full", tmplatId === 'TMPLT_HUB' ? "bg-indigo-500" : "bg-primary")} />
          <h2 className="text-3xl font-black tracking-tight">
            {masterInfo?.bbsNm || (bbsId.includes('NOTICE') ? '공지사항' : '게시판')}
          </h2>
          {tmplatId === 'TMPLT_HUB' && <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 font-bold ml-2">지식 허브</Badge>}
        </div>
        <p className="text-muted-foreground font-medium ml-4">
          {masterInfo?.bbsIntrcn || '이 게시판의 활동내역과 최신 소식을 확인하세요.'}
        </p>
      </div>

      {/* 관리자 뷰에서만 통계 리포트 호출 */}
      {isAdmin && isManagementView && <BoardStats />}

      <Card className="border-none shadow-2xl overflow-hidden rounded-[0.1rem] ring-1 ring-slate-200 bg-white">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-900 pb-12 pt-12 px-10 text-white relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
              {tmplatId === 'TMPLT_HUB' ? <BookOpen className="w-8 h-8 text-primary" /> : <MessageSquare className="w-8 h-8 text-primary" />}
              <span>{masterInfo?.bbsNm || (bbsId.includes('NOTICE') ? '공지사항' : '자유 게시판')}</span>
            </CardTitle>
            <p className="text-slate-400 font-bold text-sm">총 <span className="text-white">{totalCount}개</span>의 소중한 이야기가 담겨있습니다.</p>
          </div>
          <CardAction className="relative z-10 flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin/community/boards/master">
                <Button variant="outline" size="lg" className="h-14 px-8 gap-2 border-2 border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-900 font-black shadow-xl transition-all rounded-[0.1rem] backdrop-blur-md">
                  <Settings2 className="w-6 h-6" /> 마스터 콘솔
                </Button>
              </Link>
            )}
            <Link href={`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}`}>
              <Button size="lg" className="h-14 px-8 gap-2 bg-primary text-white hover:scale-105 font-black shadow-xl transition-all rounded-[0.1rem]">
                <div className="flex items-center gap-2">
                  <Plus className="w-6 h-6" /> 신규 등록
                </div>
              </Button>
            </Link>
          </CardAction>
          <div className="absolute right-[-5%] top-[-20%] opacity-10 scale-[2]">
            <MessageSquare size={200} />
          </div>
        </CardHeader>
        <CardContent className="pt-10 px-10">
          <div className="flex flex-col gap-6 mb-12 bg-slate-50/50 p-8 rounded-[0.1rem] border-2 border-slate-50 shadow-inner">
            <form onSubmit={handleSearch} className="flex flex-col gap-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={searchCnd} onValueChange={setSearchCnd}>
                  <SelectTrigger className="w-full md:w-[150px] h-16 rounded-[0.1rem] border-2 border-white bg-white font-bold shadow-sm">
                    <SelectValue placeholder="검색 조건" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">제목</SelectItem>
                    <SelectItem value="1">내용</SelectItem>
                    <SelectItem value="2">작성자</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative flex-1 group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 group-focus-within:text-primary transition-colors" />
                  <Input
                    type="text"
                    className="pl-14 h-16 text-lg border-2 border-white bg-white shadow-sm rounded-[0.1rem] focus-visible:ring-primary/20 transition-all font-bold"
                    placeholder="어떤 정보를 찾으시나요?"
                    value={searchWrd}
                    onChange={(e) => setSearchWrd(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex items-center gap-2 flex-1 w-full overflow-x-auto pb-2 md:pb-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-14 px-6 justify-start text-left font-bold rounded-[0.1rem] border-2 border-white bg-white shadow-sm w-full md:w-[280px]",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-3 h-5 w-5 text-primary opacity-50" />
                        {startDate ? (
                          endDate ? (
                            <span>
                              {format(startDate, "yyyy.MM.dd")} - {format(endDate, "yyyy.MM.dd")}
                            </span>
                          ) : (
                            format(startDate, "yyyy.MM.dd")
                          )
                        ) : (
                          <span>기간 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-[0.1rem] overflow-hidden border-none shadow-2xl" align="start">
                      <div className="p-4 bg-white border-b flex items-center justify-between">
                        <span className="font-black text-slate-800">기간 설정</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                          className="h-8 px-2 text-sm font-bold text-slate-400 hover:text-red-500"
                        >
                          <X size={14} className="mr-1" /> 초기화
                        </Button>
                      </div>
                      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          locale={ko}
                          className="p-4"
                        />
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          locale={ko}
                          className="p-4"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Select value={orderBy} onValueChange={setOrderBy}>
                    <SelectTrigger className="w-full md:w-[150px] h-14 rounded-[0.1rem] border-2 border-white bg-white font-bold shadow-sm">
                      <ArrowUpDown className="mr-2 h-4 w-4 text-primary opacity-50" />
                      <SelectValue placeholder="정렬 방식" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">최신순</SelectItem>
                      <SelectItem value="views">조회수순</SelectItem>
                      <SelectItem value="comments">댓글순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" size="lg" className="h-16 px-12 gap-3 bg-slate-900 border-4 border-white shadow-2xl hover:scale-105 transition-all active:scale-95 font-black rounded-[0.1rem]">
                  <Search className="w-6 h-6" /> 조회
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
                    <Card className="lg:col-span-12 p-10 bg-slate-900 rounded-[0.1rem] text-white relative overflow-hidden group border-none">
                      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-primary/20 blur-[100px] rounded-full" />
                      <div className="relative z-10 space-y-6">
                        <Badge className="bg-primary hover:bg-primary text-white border-none font-black tracking-[0.4em] uppercase py-1 px-4">FEATURED_KNOWLEDGE</Badge>
                        <Link href={`/admin/community/boards/selectBoardArticle/${list[0].nttId}?bbsId=${bbsId}`}>
                          <h3 className="text-4xl font-black tracking-tight leading-tight group-hover:text-primary transition-colors cursor-pointer">{list[0].nttSj}</h3>
                        </Link>
                        <div className="flex items-center gap-8 mt-8">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-primary italic font-black text-xs border border-white/10">OP</div>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-white/40 italic uppercase tracking-widest leading-none mb-1">Author</span>
                              <span className="text-sm font-black">{list[0].frstRegisterNm}</span>
                            </div>
                          </div>
                          <div className="h-8 w-px bg-white/10" />
                          <div className="flex items-center gap-3 text-white/40">
                             <Clock size={16} />
                             <span className="text-xs font-bold">{list[0].createdDate ? String(list[0].createdDate).substring(0, 10) : 'Just now'}</span>
                          </div>
                          <div className="h-8 w-px bg-white/10" />
                          <div className="flex items-center gap-3 text-white/40">
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
                    <Card key={item.nttId} className="group p-8 bg-slate-50/50 rounded-[0.1rem] border-2 border-slate-100 space-y-6 hover:border-primary transition-all cursor-pointer relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:scale-125 transition-all text-primary">
                        <BookOpen size={60} />
                      </div>
                      <Link href={`/admin/community/boards/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`}>
                        <h4 className="font-black text-slate-800 text-lg leading-snug line-clamp-2 group-hover:text-primary transition-colors">{item.nttSj}</h4>
                      </Link>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200/50">
                        <div className="flex gap-4">
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs"><Eye size={14} /> {item.inqireCo}</div>
                          <div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs"><MessageSquare size={14} /> 0</div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
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
                  <Card key={item.nttId} className="group overflow-hidden rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-sm transition-all hover:shadow-2xl hover:-translate-y-2">
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
                      <Link href={`/admin/community/boards/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`}>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight group-hover:text-primary transition-colors cursor-pointer line-clamp-2">{item.nttSj}</h3>
                      </Link>
                      <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-[10px] italic">OP</div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700 leading-none mb-1">{item.frstRegisterNm}</span>
                            <span className="text-[10px] font-bold text-slate-400">{item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                          </div>
                        </div>
                        <div className="flex gap-6">
                          <div className="flex items-center gap-1.5 text-slate-300 group-hover:text-primary transition-colors"><ThumbsUp size={16} /><span className="text-xs font-bold text-slate-400">0</span></div>
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
                  <Card key={item.nttId} className="group p-8 bg-white border-2 border-slate-100 rounded-[0.1rem] flex gap-8 hover:border-amber-500 transition-all cursor-pointer relative overflow-hidden">
                      <div className="flex flex-col items-center gap-2 min-w-[80px]">
                        <div className={cn(
                          "w-16 h-16 rounded-xl flex items-center justify-center font-black text-2xl shadow-inner transition-all group-hover:scale-110",
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
                      <Link href={`/admin/community/boards/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`}>
                        <h4 className="text-2xl font-black text-slate-800 leading-tight group-hover:text-amber-600 transition-colors tracking-tighter uppercase italic">{item.nttSj}</h4>
                      </Link>
                      <div className="flex flex-wrap items-center gap-6 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black">AD</div>
                          <span className="text-xs font-bold text-slate-500">{item.frstRegisterNm}</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 text-slate-400 font-black text-xs">
                          <MessageSquare size={14} className="text-amber-400" />
                          <span>{Math.floor(Math.random() * 5)} Answers</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200" />
                        <div className="flex items-center gap-2 text-slate-400 font-black text-xs">
                          <Eye size={14} />
                          <span>{item.inqireCo} views</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-[0.08] transition-all">
                      <HelpCircle size={150} />
                    </div>
                  </Card>
                ))}
              </div>
            ) : tmplatId === 'TMPLT_CALENDAR' ? (
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center bg-slate-900 p-8 rounded-[0.1rem] text-white">
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
                      className="h-12 w-12 border-white/20 bg-white/10 hover:bg-white hover:text-slate-900 rounded-[0.1rem] transition-all text-white"
                    >
                      <ChevronRight className="rotate-180" size={20} />
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const next = new Date(year, month + 1, 1);
                        setStartDate(next);
                      }}
                      className="h-12 w-12 border-white/20 bg-white/10 hover:bg-white hover:text-slate-900 rounded-[0.1rem] transition-all text-white"
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
                        "min-h-[160px] p-4 border-2 transition-all relative group rounded-[0.1rem]",
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
                              href={`/admin/community/boards/selectBoardArticle/${post.nttId}?bbsId=${bbsId}`}
                              className={cn(
                                "block p-2 text-[10px] font-black leading-tight rounded-sm shadow-sm transition-all hover:scale-105 cursor-pointer truncate",
                                post.noticeAt === 'Y' ? "bg-rose-500 text-white" : "bg-slate-900 text-white"
                              )}
                              title={post.nttSj}
                            >
                              {post.nttSj}
                            </Link>
                          ))}
                        </div>

                        {isCurrentMonth && (
                          <div className="absolute bottom-4 right-4 text-[8px] font-black text-slate-100 group-hover:text-slate-200 transition-all uppercase">
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
                  <Card key={item.nttId} className="group overflow-hidden border-2 border-slate-50 hover:border-slate-900 transition-all rounded-[0.1rem]">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-16 bg-slate-100 flex md:flex-col items-center justify-center p-4 gap-2 shrink-0">
                        <Book className="text-slate-400 group-hover:text-slate-900 transition-colors" size={24} />
                      </div>
                      <div className="flex-1 p-8 space-y-4">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-none border-slate-200">Doc v1.0</Badge>
                          <span className="text-[11px] font-bold text-slate-300 italic">{item.createdDate ? String(item.createdDate).substring(0, 10) : '-'}</span>
                        </div>
                        <Link href={`/admin/community/boards/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`}>
                          <h4 className="text-2xl font-black text-slate-900 leading-tight group-hover:underline decoration-slate-900 decoration-4 underline-offset-8 transition-all">{item.nttSj}</h4>
                        </Link>
                        <p className="text-slate-500 font-medium line-clamp-2 leading-relaxed">{item.nttCn}</p>
                        <div className="flex items-center gap-6 pt-4 border-t border-slate-50">
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Author</span>
                             <span className="text-xs font-black text-slate-600">{item.frstRegisterNm}</span>
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
                <p className="text-xl font-black">게시글이 아직 없습니다.</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="w-[80px] text-center font-black text-slate-400 tracking-tight text-[11px] py-8">번호</TableHead>
                    <TableHead className="font-black text-slate-900 tracking-tight text-[11px] py-8 px-6">제목</TableHead>
                    <TableHead className="w-[150px] font-black text-slate-400 tracking-tight text-[11px] py-8 text-center">작성자</TableHead>
                    <TableHead className="w-[140px] font-black text-slate-400 tracking-tight text-[11px] py-8 text-center">등록일</TableHead>
                    <TableHead className="w-[180px] font-black text-slate-400 tracking-tight text-[11px] py-8 text-center">참여도</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((item: BoardPost, idx: number) => (
                    <TableRow key={item.nttId} className="hover:bg-primary/[0.02] transition-all group border-b last:border-0">
                      <TableCell className="text-center font-bold text-sm text-slate-400 py-8">
                        {totalCount - ((page - 1) * 10) - idx}
                      </TableCell>
                      <TableCell className="px-6 py-8">
                        <Link href={`/admin/community/boards/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`} className="group/link flex flex-col gap-1">
                          <div className="text-xl font-black text-slate-800 group-hover/link:text-primary transition-colors line-clamp-1">
                            {item.nttSj}
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center py-8">
                        <div className="font-bold text-slate-600 bg-slate-100/50 mx-auto w-fit px-5 py-2 rounded-[0.1rem] border border-slate-100 flex items-center gap-2">
                          <User size={14} className="opacity-30" />
                          {item.frstRegisterNm}
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
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-12 px-8 font-black rounded-[0.1rem] border-2 hover:bg-slate-50"
              >
                이전
              </Button>
              <div className="flex items-center gap-4 bg-slate-900 px-8 py-3 rounded-[0.1rem] shadow-xl">
                <span className="text-lg font-black text-white">{page}</span>
                <div className="h-4 w-px bg-white/20" />
                <span className="text-sm font-bold text-white/50">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-12 px-8 font-black rounded-[0.1rem] border-2 hover:bg-slate-50"
              >
                다음
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
