'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Plus, Trash2, Home, ChevronRight, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Note: I should check if Badge exists, if not I'll use a span with Tailwind

const ScheduleListPage = () => {
    const [list, setList] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [pageIndex, setPageIndex] = useState(1);
    const [loading, setLoading] = useState(false);

    const fetchList = async () => {
        setLoading(true);
        try {
            const params = { pageIndex, pageUnit: 10 };
            const response = await axios.get('/schedule', { params });
            setList(response.data.resultList || []);
            setTotalCount(response.data.totalCount || 0);
            setTotalPages(response.data.totalPages || 0);
        } catch (error) {
            console.error('Failed to fetch schedules', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [pageIndex]);

    const handleDelete = async (id: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await axios.delete(`/schedule/${id}`);
            fetchList();
        } catch (error) {
            alert('삭제에 실패했습니다.');
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return dateStr.substring(0, 10);
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> Home
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>협업</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">일정관리</span>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-primary/5 pb-6 border-b">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-bold tracking-tight">일정 목록</CardTitle>
                        <p className="text-sm text-muted-foreground font-medium">관리 중인 모든 일정을 한눈에 확인하세요.</p>
                    </div>
                    <CardAction>
                        <Link href="/cop/smt/sim/insertSchedule">
                            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
                                <Plus className="w-4 h-4" /> 일정 등록
                            </Button>
                        </Link>
                    </CardAction>
                </CardHeader>
                <CardContent className="pt-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="bg-muted px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            전체 <span className="text-primary">{totalCount}</span>건
                        </div>
                    </div>

                    <div className="rounded-xl border shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[80px] text-center font-bold">번호</TableHead>
                                    <TableHead className="font-bold">일정명</TableHead>
                                    <TableHead className="w-[180px] font-bold text-center">시작일</TableHead>
                                    <TableHead className="w-[180px] font-bold text-center">종료일</TableHead>
                                    <TableHead className="w-[200px] font-bold">장소</TableHead>
                                    <TableHead className="w-[100px] text-center font-bold">관리</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-40 text-center text-muted-foreground font-medium">
                                            등록된 일정이 없습니다. 새로운 일정을 등록해 보세요!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    list.map((item, idx) => (
                                        <TableRow key={item.schdulId} className="hover:bg-muted/30 transition-colors group">
                                            <TableCell className="text-center text-muted-foreground font-medium">
                                                {totalCount - ((pageIndex - 1) * 10) - idx}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/cop/smt/sim/selectScheduleDetail/${item.schdulId}`} className="font-bold text-primary hover:underline underline-offset-4 decoration-2 decoration-primary/30">
                                                    {item.schdulNm}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-sm">
                                                <div className="flex items-center justify-center gap-1.5 text-blue-600 font-semibold bg-blue-50 py-1 px-2 rounded-md">
                                                    <Clock className="w-3 h-3" /> {formatDate(item.schdulBgnde)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-sm">
                                                <div className="flex items-center justify-center gap-1.5 text-rose-600 font-semibold bg-rose-50 py-1 px-2 rounded-md">
                                                    <Clock className="w-3 h-3" /> {formatDate(item.schdulEndde)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm font-medium">
                                                    <MapPin className="w-3.5 h-3.5 opacity-70" /> {item.schdulPlace || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.schdulId)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-8 pt-6 border-t border-dashed">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageIndex(p => Math.max(1, p - 1))}
                                disabled={pageIndex === 1}
                                className="shadow-xs hover:bg-muted"
                            >
                                이전
                            </Button>
                            <div className="flex items-center bg-muted/50 rounded-lg px-4 py-1.5 border">
                                <span className="text-sm font-bold text-primary">{pageIndex}</span>
                                <span className="text-sm text-muted-foreground mx-2">/</span>
                                <span className="text-sm font-medium">{totalPages}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPageIndex(p => Math.min(totalPages, p + 1))}
                                disabled={pageIndex === totalPages}
                                className="shadow-xs hover:bg-muted"
                            >
                                다음
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ScheduleListPage;
