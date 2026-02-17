'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import axios from '@/lib/api/client';
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
import { LayoutGrid, Plus, Search, Home, ChevronRight, MessageSquare, User, Calendar, Eye, BarChart3 } from "lucide-react";
import { BoardStats } from './BoardStats';

interface Board {
    nttId: string;
    nttSj: string;
    frstRegisterNm: string;
    frstRegisterPnttm: string;
    inqireCo: number;
}

const BBSListContent = () => {
    const searchParams = useSearchParams();
    const bbsId = searchParams.get('bbsId') || 'BBSMSTR_AAAAAAAAAAAA';

    const [list, setList] = useState<Board[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [pageIndex, setPageIndex] = useState(1);
    const [searchWrd, setSearchWrd] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchList = async () => {
        setLoading(true);
        try {
            const params = { bbsId, pageIndex, pageUnit: 10, searchWrd, searchCnd: '0' };
            const response = await axios.get('/bbs', { params });
            setList(response.data.resultList || []);
            setTotalCount(response.data.totalCount || 0);
            setTotalPages(response.data.totalPages || 0);
        } catch (error) {
            console.error('Failed to fetch board articles', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [bbsId, pageIndex]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPageIndex(1);
        fetchList();
    };

    return (
        <div className="flex flex-col gap-6 p-6 pb-20">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 px-5 rounded-full w-fit mb-2">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4 opacity-30" />
                <span>커뮤니티</span>
                <ChevronRight className="w-4 h-4 opacity-30" />
                <span className="text-foreground font-black">게시판 목록</span>
            </div>

            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-primary rounded-full" />
                    <h2 className="text-3xl font-black tracking-tight">게시판 통계 리포트</h2>
                </div>
                <p className="text-muted-foreground font-medium ml-4">이 게시판의 활동량과 트래픽 정보를 한눈에 파악하세요.</p>
            </div>

            <BoardStats />

            <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] ring-1 ring-slate-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-900 pb-12 pt-12 px-10 text-white relative overflow-hidden">
                    <div className="space-y-2 relative z-10">
                        <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
                            <MessageSquare className="w-8 h-8 text-primary" /> 
                            {bbsId.includes('NOTICE') ? '공지사항' : '자유 게시판'}
                        </CardTitle>
                        <p className="text-slate-400 font-bold text-sm">총 <span className="text-white">{totalCount}개</span>의 소중한 이야기가 담겨있습니다.</p>
                    </div>
                    <CardAction className="relative z-10">
                        <Link href={`/cop/bbs/insertBoardArticle?bbsId=${bbsId}`}>
                            <Button size="lg" className="h-14 px-8 gap-2 bg-primary text-white hover:scale-105 font-black shadow-xl transition-all rounded-2xl">
                                <Plus className="w-6 h-6" /> 게시글 작성하기
                            </Button>
                        </Link>
                    </CardAction>
                    {/* Background Pattern */}
                    <div className="absolute right-[-5%] top-[-20%] opacity-10 scale-[2]">
                        <MessageSquare size={200} />
                    </div>
                </CardHeader>
                <CardContent className="pt-10 px-10">
                    {/* Search Area */}
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-12 bg-slate-50/50 p-8 rounded-[2rem] border-2 border-slate-50 shadow-inner">
                        <form onSubmit={handleSearch} className="flex-1 flex gap-3 w-full">
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
                            <Button type="submit" className="h-16 px-12 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                                검색
                            </Button>
                        </form>
                    </div>

                    {/* Table Area */}
                    <div className="rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-2xl bg-white mb-10">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent border-b-2">
                                    <TableHead className="w-[100px] text-center font-black text-slate-400 uppercase tracking-widest text-[11px] py-8">No</TableHead>
                                    <TableHead className="font-black text-slate-900 uppercase tracking-widest text-[11px] py-8 px-6">Content Subject</TableHead>
                                    <TableHead className="w-[180px] font-black text-slate-400 uppercase tracking-widest text-[11px] py-8 text-center">Author</TableHead>
                                    <TableHead className="w-[150px] font-black text-slate-400 uppercase tracking-widest text-[11px] py-8 text-center">Reg Date</TableHead>
                                    <TableHead className="w-[120px] font-black text-slate-400 uppercase tracking-widest text-[11px] py-8 text-center">Stats</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="border-b last:border-0">
                                            <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                                            <TableCell className="py-8 px-6"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-80 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-slate-300">
                                                <div className="p-10 bg-slate-50 rounded-full"><MessageSquare className="w-16 h-16 opacity-10" /></div>
                                                <p className="text-xl font-black">결과가 없습니다.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    list.map((item, idx) => (
                                        <TableRow key={item.nttId} className="hover:bg-primary/[0.02] transition-all group border-b last:border-0">
                                            <TableCell className="text-center font-bold text-xs text-slate-400 py-8">
                                                {totalCount - ((pageIndex - 1) * 10) - idx}
                                            </TableCell>
                                            <TableCell className="px-6 py-8">
                                                <Link href={`/cop/bbs/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`} className="group/link flex flex-col gap-1">
                                                    <span className="text-xl font-black text-slate-800 group-hover/link:text-primary transition-colors line-clamp-1">
                                                        {item.nttSj}
                                                    </span>
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
                                                    <Calendar size={14} className="opacity-30" />
                                                    {item.frstRegisterPnttm?.substring(0, 10)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-8">
                                                <div className="font-black text-primary/60 bg-primary/5 w-fit mx-auto px-5 py-2 rounded-xl flex items-center gap-2 border border-primary/10">
                                                    <Eye size={14} className="opacity-40" />
                                                    {item.inqireCo}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-8 py-10">
                            <Button
                                variant="outline"
                                onClick={() => setPageIndex(p => Math.max(1, p - 1))}
                                disabled={pageIndex === 1}
                                className="h-12 px-8 font-black rounded-xl border-2 hover:bg-slate-50"
                            >
                                Previous
                            </Button>
                            <div className="flex items-center gap-4 bg-slate-900 px-8 py-3 rounded-2xl shadow-xl">
                                <span className="text-lg font-black text-white">{pageIndex}</span>
                                <div className="h-4 w-px bg-white/20" />
                                <span className="text-sm font-bold text-white/50">{totalPages}</span>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setPageIndex(p => Math.min(totalPages, p + 1))}
                                disabled={pageIndex === totalPages}
                                className="h-12 px-8 font-black rounded-xl border-2 hover:bg-slate-50"
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const BoardListPage = () => {
    return (
        <Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-slate-400">Loading Dashboard...</div>}>
            <BBSListContent />
        </Suspense>
    );
};

export default BoardListPage;

const BoardListPage = () => {
    return (
        <Suspense fallback={<div className="p-10 text-center font-bold">로딩 중...</div>}>
            <BBSListContent />
        </Suspense>
    );
};

export default BoardListPage;
