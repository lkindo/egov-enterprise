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
import { LayoutGrid, Plus, Search, Home, ChevronRight, MessageSquare, User, Calendar, Eye } from "lucide-react";

interface Board {
    nttId: string;
    nttSj: string;
    frstRegisterNm: string;
    frstRegisterPnttm: string;
    inqireCo: number;
}

const BBSListContent = () => {
    const searchParams = useSearchParams();
    const bbsId = searchParams.get('bbsId') || 'BBSMSTR_AAAAAAAAAAAA'; // Default or from URL

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
        <div className="flex flex-col gap-6 p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-xl w-fit">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>커뮤니티</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-bold">게시판</span>
            </div>

            <Card className="border-none shadow-xl overflow-hidden rounded-3xl ring-1 ring-slate-200">
                <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 pb-10 pt-10 px-8 text-white">
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
                            <MessageSquare className="w-8 h-8 text-primary-foreground" /> 소통 공간
                        </CardTitle>
                        <p className="text-slate-400 font-medium text-sm">팀원들과 자유롭게 의견을 나누고 정보를 공유하세요.</p>
                    </div>
                    <CardAction>
                        <Link href={`/cop/bbs/insertBoardArticle?bbsId=${bbsId}`}>
                            <Button size="lg" className="gap-2 bg-white text-slate-900 hover:bg-slate-100 font-black shadow-xl transition-all active:scale-95">
                                <Plus className="w-5 h-5" /> 새 글 쓰기
                            </Button>
                        </Link>
                    </CardAction>
                </CardHeader>
                <CardContent className="pt-10">
                    {/* Search Area */}
                    <div className="flex flex-col md:flex-row items-center gap-6 mb-10 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                        <form onSubmit={handleSearch} className="flex-1 flex gap-3 w-full">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                                <Input
                                    type="text"
                                    className="pl-12 h-14 text-lg border-2 border-white bg-white shadow-sm rounded-2xl focus-visible:ring-primary/20 transition-all font-medium"
                                    placeholder="검색어를 입력하세요 (제목/내용)"
                                    value={searchWrd}
                                    onChange={(e) => setSearchWrd(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="h-14 px-10 rounded-2xl font-black text-lg shadow-lg hover:shadow-primary/20 transition-all active:scale-95">
                                검색하기
                            </Button>
                        </form>
                        <div className="flex items-center gap-4 whitespace-nowrap">
                            <div className="h-10 w-px bg-slate-200 hidden md:block" />
                            <div className="text-sm font-bold text-slate-500 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-50">
                                전체 게시물 <span className="text-primary text-lg font-black ml-1">{totalCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="rounded-[2rem] border-2 border-slate-50 overflow-hidden shadow-2xl bg-white ring-1 ring-slate-100">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent border-b-2">
                                    <TableHead className="w-[80px] text-center font-black text-slate-400 uppercase tracking-widest text-[11px] py-6">No</TableHead>
                                    <TableHead className="font-black text-slate-900 uppercase tracking-widest text-[11px] py-6 px-4">Subject</TableHead>
                                    <TableHead className="w-[150px] font-black text-slate-400 uppercase tracking-widest text-[11px] py-6 text-center">Author</TableHead>
                                    <TableHead className="w-[120px] font-black text-slate-400 uppercase tracking-widest text-[11px] py-6 text-center">Date</TableHead>
                                    <TableHead className="w-[100px] font-black text-slate-400 uppercase tracking-widest text-[11px] py-6 text-center">Views</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="border-b last:border-0">
                                            <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-6 px-4"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-64 text-center">
                                            <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                                                <div className="p-6 bg-slate-50 rounded-full"><MessageSquare className="w-12 h-12 opacity-20" /></div>
                                                <p className="text-lg font-bold">등록된 게시물이 없습니다.</p>
                                                <p className="text-sm font-medium">첫 번째 소중한 글을 남겨보세요!</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    list.map((item, idx) => (
                                        <TableRow key={item.nttId} className="hover:bg-slate-50/50 transition-all group border-b last:border-0">
                                            <TableCell className="text-center font-mono text-xs text-slate-400 py-6">
                                                {totalCount - ((pageIndex - 1) * 10) - idx}
                                            </TableCell>
                                            <TableCell className="px-4 py-6">
                                                <Link href={`/cop/bbs/selectBoardArticle/${item.nttId}?bbsId=${bbsId}`} className="group/link flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-primary/40 group-hover/link:bg-primary group-hover/link:scale-150 transition-all opacity-0 group-hover/link:opacity-100" />
                                                    <span className="text-lg font-black text-slate-800 group-hover/link:text-primary transition-colors line-clamp-1 leading-normal">
                                                        {item.nttSj}
                                                    </span>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-center py-6">
                                                <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600 bg-slate-100/50 mx-auto w-fit px-4 py-1.5 rounded-full border border-slate-100">
                                                    <User className="w-3.5 h-3.5 opacity-40" /> {item.frstRegisterNm}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-6">
                                                <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-400">
                                                    <Calendar className="w-3.5 h-3.5 opacity-30" /> {item.frstRegisterPnttm?.substring(0, 10)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-6">
                                                <div className="flex items-center justify-center gap-2 text-sm font-black text-primary/60 bg-primary/5 w-fit mx-auto px-4 py-1.5 rounded-xl">
                                                    <Eye className="w-3.5 h-3.5 opacity-40" /> {item.inqireCo}
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
                        <div className="flex items-center justify-center gap-6 mt-16 pb-10">
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => setPageIndex(p => Math.max(1, p - 1))}
                                disabled={pageIndex === 1}
                                className="px-10 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-30 rounded-2xl border-2"
                            >
                                Previous Page
                            </Button>
                            <div className="flex items-center gap-4 bg-slate-900 px-8 py-3 rounded-full shadow-2xl ring-8 ring-slate-100">
                                <span className="text-lg font-black text-white">{pageIndex}</span>
                                <div className="h-4 w-px bg-white/20" />
                                <span className="text-sm font-bold text-white/50">{totalPages}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => setPageIndex(p => Math.min(totalPages, p + 1))}
                                disabled={pageIndex === totalPages}
                                className="px-10 font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-30 rounded-2xl border-2"
                            >
                                Next Page
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
        <Suspense fallback={<div className="p-10 text-center font-bold">로딩 중...</div>}>
            <BBSListContent />
        </Suspense>
    );
};

export default BoardListPage;
