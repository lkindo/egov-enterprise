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
import { Home, ChevronRight, MessageSquare, User, Calendar as CalendarIcon, Eye, Plus, Search, ArrowUpDown, X, Settings2, BookOpen } from "lucide-react";
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from "@/lib/utils";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const BoardStats = dynamic(() => import('./BoardStats').then(mod => mod.BoardStats), {
 ssr: false,
 loading: () => <Skeleton className="h-[280px] w-full rounded-[2rem]" />
});

interface Board {
 nttId: string;
 nttSj: string;
 frstRegisterNm: string;
 frstRegisterPnttm: string;
 inqireCo: number;
 commentCo?: number;
}

export const BoardListClient = ({ initialData, params: initialParams }: { initialData: any; params: any }) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';
  const bbsId = searchParams.get('bbsId') || initialParams.bbsId;

  const [searchWrd, setSearchWrd] = useState(initialParams.searchWrd || '');
 const [page번호, setPage번호] = useState(initialParams.page번호 || 1);
 const [searchCnd, setSearchCnd] = useState(initialParams.searchCnd || '0');
 const [orderBy, setOrderBy] = useState(initialParams.orderBy || 'date');
  const [startDate, setStartDate] = useState<Date | undefined>(initialParams.startDate ? new Date(initialParams.startDate) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(initialParams.endDate ? new Date(initialParams.endDate) : undefined);
  
  // 마스터 정보 및 템플릿 확인
  const masterInfo = initialData.masterInfo || null;
  const tmplatId = masterInfo?.tmplatId || 'TMPLT_LIST';
  // 메뉴를 통한 진입 여부 (관리자 대시보드용이 아닌 실제 서비스용인지 확인)
  // 관리자 권한이 있어도 일반 게시판 서비스 위치일 경우 통계를 숨김
  const isManagementView = pathname.includes('/admin/system/board-masters') || !bbsId.startsWith('BBSMSTR_');

 const { data, isLoading: loading } = useBoardList({
 bbsId,
 page번호,
 pageUnit: 10,
 searchWrd,
 searchCnd,
 orderBy,
 startDate: startDate ? format(startDate, "yyyy-MM-dd'T'HH:mm:ss") : undefined,
 endDate: endDate ? format(endDate, "yyyy-MM-dd'T'HH:mm:ss") : undefined
 }, initialData);

 const list: Board[] = data?.resultList || [];
 const totalCount = data?.totalCount || 0;
 const totalPages = data?.totalPages || 0;

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setPage번호(1);
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
      {masterInfo?.bbsIntrcn || '이 게시판의 활동량과 최신 소식을 확인하세요.'}
    </p>
  </div>

  {/* 관리자 뷰에서만 통계 리포트 노출 */}
  {isAdmin && isManagementView && <BoardStats />}

 <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] ring-1 ring-slate-200 bg-white">
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
  <Button variant="outline" size="lg" className="h-14 px-8 gap-2 border-2 border-white/20 bg-white/10 text-white hover:bg-white hover:text-slate-900 font-black shadow-xl transition-all rounded-2xl backdrop-blur-md">
  <Settings2 className="w-6 h-6" /> 마스터 콘솔
  </Button>
  </Link>
  )}
  <Link href={`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}`}>
  <Button size="lg" className="h-14 px-8 gap-2 bg-primary text-white hover:scale-105 font-black shadow-xl transition-all rounded-2xl">
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
 <div className="flex flex-col gap-6 mb-12 bg-slate-50/50 p-8 rounded-[3rem] border-2 border-slate-50 shadow-inner">
 <form onSubmit={handleSearch} className="flex flex-col gap-6">
 <div className="flex flex-col md:flex-row gap-4">
 <Select value={searchCnd} onValueChange={setSearchCnd}>
 <SelectTrigger className="w-full md:w-[150px] h-16 rounded-2xl border-2 border-white bg-white font-bold shadow-sm">
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
 className="pl-14 h-16 text-lg border-2 border-white bg-white shadow-sm rounded-2xl focus-visible:ring-primary/20 transition-all font-bold"
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
 "h-14 px-6 justify-start text-left font-bold rounded-2xl border-2 border-white bg-white shadow-sm w-full md:w-[280px]",
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
 <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl" align="start">
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
 <SelectTrigger className="w-full md:w-[150px] h-14 rounded-2xl border-2 border-white bg-white font-bold shadow-sm">
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

  <Button type="submit" size="lg" className="h-16 px-12 gap-3 bg-slate-900 border-4 border-white shadow-2xl hover:scale-105 transition-all active:scale-95 font-black rounded-3xl">
  <Search className="w-6 h-6" /> 조회
  </Button>
 </div>
 </form>
 </div>

  <div className="rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-2xl bg-white mb-10">
    {loading ? (
      <Table>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={`board-loading-${i}`} className="border-b last:border-0">
              <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
              <TableCell className="py-8 px-6"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
              <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
              <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
              <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (tmplatId === 'TMPLT_GALLERY' || tmplatId === 'TMPLT_HUB') && list.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-10">
        {list.map((item: Board, idx: number) => (
          <Card key={item.nttId} className="group overflow-hidden rounded-[2.5rem] border-2 border-slate-50 hover:border-primary/20 hover:shadow-2xl transition-all cursor-pointer">
            <div className="h-56 bg-slate-100 relative overflow-hidden">
               <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:scale-125 transition-transform duration-700">
                 <BookOpen size={100} />
               </div>
               <Badge className="absolute top-6 left-6 bg-white/90 text-slate-900 border-none font-black backdrop-blur-md">
                 번호. {totalCount - ((page번호 - 1) * 10) - idx}
               </Badge>
            </div>
            <CardContent className="p-8 space-y-4 bg-white relative z-10">
              <Link href={`/admin/community/boards/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`}>
                <h3 className="text-2xl font-black text-slate-800 line-clamp-2 group-hover:text-primary transition-colors">{item.nttSj}</h3>
              </Link>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <User size={14} />
                  </div>
                  <span className="text-sm font-bold text-slate-600">{item.frstRegisterNm}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Eye size={12} /> {item.inqireCo}회</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><MessageSquare size={12} /> {item.commentCo || 0}개</span>
                </div>
              </div>
            </CardContent>
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
          {list.map((item: Board, idx: number) => (
            <TableRow key={item.nttId} className="hover:bg-primary/[0.02] transition-all group border-b last:border-0">
              <TableCell className="text-center font-bold text-sm text-slate-400 py-8">
                {totalCount - ((page번호 - 1) * 10) - idx}
              </TableCell>
              <TableCell className="px-6 py-8">
                <Link href={`/admin/community/boards/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`} className="group/link flex flex-col gap-1">
                  <div className="text-xl font-black text-slate-800 group-hover/link:text-primary transition-colors line-clamp-1">
                    {item.nttSj}
                  </div>
                </Link>
              </TableCell>
              <TableCell className="text-center py-8">
                <div className="font-bold text-slate-600 bg-slate-100/50 mx-auto w-fit px-5 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                  <User size={14} className="opacity-30" />
                  {item.frstRegisterNm}
                </div>
              </TableCell>
              <TableCell className="text-center py-8">
                <div className="font-bold text-slate-400 flex items-center justify-center gap-2">
                  <CalendarIcon size={14} className="opacity-30" />
                  {item.frstRegisterPnttm ? String(item.frstRegisterPnttm).substring(0, 10) : '-'}
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
                    {item.commentCo || 0}
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
 onClick={() => setPage번호((p: number) => Math.max(1, p - 1))}
 disabled={page번호 === 1}
 className="h-12 px-8 font-black rounded-xl border-2 hover:bg-slate-50"
 >
 이전
 </Button>
 <div className="flex items-center gap-4 bg-slate-900 px-8 py-3 rounded-2xl shadow-xl">
 <span className="text-lg font-black text-white">{page번호}</span>
 <div className="h-4 w-px bg-white/20" />
 <span className="text-sm font-bold text-white/50">{totalPages}</span>
 </div>
 <Button
 variant="outline"
 onClick={() => setPage번호((p: number) => Math.min(totalPages, p + 1))}
 disabled={page번호 === totalPages}
 className="h-12 px-8 font-black rounded-xl border-2 hover:bg-slate-50"
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
