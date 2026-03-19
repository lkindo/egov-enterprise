'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCommunityList } from '@/services/community/communityService';
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
import { Users, Home, ChevronRight, MessageSquare, ShieldCheck, Calendar } from "lucide-react";

interface Community {
 cmmntyId: string;
 cmmntyNm: string;
 cmmntyIntrcn: string;
 frstRegisterNm: string;
 frstRegisterPnttm: string;
}

const CommunityListPage = () => {
 const [list, setList] = useState<Community[]>([]);
 const [totalCount, setTotalCount] = useState(0);
 const [totalPages, setTotalPages] = useState(0);
 const [page번호, setPage번호] = useState(1);
 const [loading, setLoading] = useState(false);

 const fetchList = async () => {
 setLoading(true);
 try {
 const params = { page번호, pageUnit: 10 };
 const data = await getCommunityList(params);
 setList((data.resultList as any) || []);
 setTotalCount(data.totalCount || 0);
 // Calculate total pages if not provided by backend
 setTotalPages(Math.ceil((data.totalCount || 0) / 10));
 } catch (error) {
 console.error('Failed to fetch communities', error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchList();
 }, [page번호]);

 return (
 <div className="flex flex-col gap-6 p-6">
 {/* Breadcrumb */}
 <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-2xl w-fit">
 <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
 <Home className="w-4 h-4" /> 홈
 </Link>
 <ChevronRight className="w-4 h-4" />
 <span>협업</span>
 <ChevronRight className="w-4 h-4" />
 <span className="text-foreground font-bold">커뮤니티 관리</span>
 </div>

 <Card className="border-none shadow-2xl overflow-hidden rounded-[2rem] ring-1 ring-slate-100">
 <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-br from-blue-600 to-indigo-700 pb-12 pt-12 px-10 text-white">
 <div className="space-y-2">
 <CardTitle className="text-4xl font-black tracking-tighter flex items-center gap-4">
 <Users className="w-10 h-10 text-blue-200" /> 커뮤니티 공간
 </CardTitle>
 <p className="text-blue-100/70 font-medium text-lg">워크스페이스 내의 다양한 소모임과 커뮤니티를 확인하세요.</p>
 </div>
 </CardHeader>
 <CardContent className="pt-12 px-10">
 <div className="mb-8 flex items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 w-fit">
 <div className="text-sm font-black text-blue-700 flex items-center gap-3">
 <ShieldCheck className="w-5 h-5" /> 활성화된 전체 커뮤니티 <span className="text-2xl font-black ml-1 animate-pulse">{totalCount}</span>
 </div>
 </div>

 <div className="rounded-[1.5rem] border-2 border-slate-50 overflow-hidden shadow-sm bg-white ring-1 ring-slate-100">
 <Table>
 <TableHeader className="bg-slate-50/50">
 <TableRow className="hover:bg-transparent">
 <TableHead className="w-[80px] text-center font-black text-slate-400 text-sm py-6 tracking-tight">번호</TableHead>
 <TableHead className="w-[300px] font-black text-slate-900 text-sm py-6 tracking-tight">커뮤니티명</TableHead>
 <TableHead className="font-black text-slate-400 text-sm py-6 tracking-tight">소개</TableHead>
 <TableHead className="w-[150px] font-black text-slate-400 text-sm py-6 text-center tracking-tight">관리자</TableHead>
 <TableHead className="w-[150px] font-black text-slate-400 text-sm py-6 text-center tracking-tight">개설일</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {loading ? (
 Array.from({ length: 5 }).map((_, i) => (
 <TableRow key={i}>
 <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
 <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
 <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
 <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
 <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
 </TableRow>
 ))
 ) : list.length === 0 ? (
 <TableRow>
 <TableCell colSpan={5} className="h-48 text-center text-slate-400 font-bold text-xl tracking-tighter opacity-30">
 No Communities Found
 </TableCell>
 </TableRow>
 ) : (
 list.map((item, idx) => (
 <TableRow key={item.cmmntyId} className="hover:bg-blue-50/30 transition-all border-b last:border-0 group">
 <TableCell className="text-center font-mono text-sm text-slate-400 py-6">
 {totalCount - ((page번호 - 1) * 10) - idx}
 </TableCell>
 <TableCell className="py-6">
 <Link href={`/admin/community/${item.cmmntyId}`} className="flex items-center gap-4 group/item">
 <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black text-sm shadow-sm group-hover/item:scale-110 transition-transform">
 CM
 </div>
 <span className="text-xl font-black text-slate-800 group-hover/item:text-blue-700 transition-colors">
 {item.cmmntyNm}
 </span>
 </Link>
 </TableCell>
 <TableCell className="py-6">
 <p className="text-base text-slate-500 font-medium line-clamp-1 leading-relaxed italic">
 "{item.cmmntyIntrcn || '등록된 소개 기능이 없습니다.'}"
 </p>
 </TableCell>
 <TableCell className="text-center py-6">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full text-slate-700 font-bold text-sm border border-slate-200 shadow-inner">
 <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> {item.frstRegisterNm}
 </div>
 </TableCell>
 <TableCell className="text-center py-6">
 <div className="flex items-center justify-center gap-2 text-slate-400 font-bold text-sm">
 <Calendar className="w-4 h-4 opacity-50" /> {item.frstRegisterPnttm?.substring(0, 10)}
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
 <div className="flex items-center justify-center gap-10 mt-20 pb-10">
 <Button
 variant="ghost"
 size="lg"
 onClick={() => setPage번호(p => Math.max(1, p - 1))}
 disabled={page번호 === 1}
 className="px-12 h-14 rounded-2xl font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white hover:text-blue-600 transition-all tracking-tight text-sm"
 >
 이전
 </Button>
 <div className="bg-slate-900 text-white px-10 py-4 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] flex items-center gap-4 border-4 border-white ring-8 ring-slate-100">
 <span className="text-2xl font-black">{page번호}</span>
 <div className="h-6 w-px bg-white/20" />
 <span className="text-sm font-bold text-white/40">{totalPages}</span>
 </div>
 <Button
 variant="ghost"
 size="lg"
 onClick={() => setPage번호(p => Math.min(totalPages, p + 1))}
 disabled={page번호 === totalPages}
 className="px-12 h-14 rounded-2xl font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white hover:text-blue-600 transition-all tracking-tight text-sm"
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

export default CommunityListPage;
