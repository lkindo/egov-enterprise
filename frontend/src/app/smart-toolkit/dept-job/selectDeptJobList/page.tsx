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
import { Briefcase, Plus, Trash2, Home, ChevronRight, FileText, User, Calendar, CheckSquare } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

interface DeptJob {
 deptJobId: string;
 deptJobNm: string;
 deptJobCn: string;
 frstRegisterNm: string;
 frstRegisterPnttm: string;
 priort: string; // Priority
}

const DeptJobListPage = () => {
 const [list, setList] = useState<DeptJob[]>([]);
 const [totalCount, setTotalCount] = useState(0);
 const [totalPages, setTotalPages] = useState(0);
 const [page踰덊샇, setPage踰덊샇] = useState(1);
 const [loading, setLoading] = useState(false);

 const fetchList = async () => {
 setLoading(true);
 try {
 const params = { page踰덊샇, pageUnit: 10 };
 const response = (await axios.get('/deptjob', { params })) as any;
 setList(response.data.resultList || []);
 setTotalCount(response.data.totalCount || 0);
 setTotalPages(response.data.totalPages || 0);
 } catch {
 console.error('Failed to fetch dept jobs', error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchList();
 }, [page踰덊샇]);

 const handleDelete = async (id: string) => {
 if (!confirm('님젣?섏떆寃좎뒿?덇퉴?')) return;
 try {
 (await axios.delete(`/deptjob/${id}`)) as any;
 fetchList();
 } catch {
 alert('님젣님?ㅽ뙣?덉뒿?덈떎.');
 }
 };

 const getPriorityBadge = (priority: string) => {
 switch (priority) {
 case '1': return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md border border-rose-200">?믪쓬</span>;
 case '2': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-md border border-amber-200">以묎컙</span>;
 default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-md border border-slate-200">님쓬</span>;
 }
 };

 return (
 <div className="flex flex-col gap-6 p-6">
  <DynamicBreadcrumb />

 <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
 <CardHeader className="flex flex-row items-center justify-between pb-8 pt-8 px-8 border-b bg-muted/20">
 <div className="space-y-1">
 <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
 <Briefcase className="w-8 h-8 text-primary" /> 遺?쒖뾽臾?紐⑸줉
 </CardTitle>
 <p className="text-sm text-muted-foreground font-medium tracking-tight opacity-70">?怨?遺?쒖쓽 紐⑤뱺 怨쇱뾽님泥닿퀎?곸쑝濡?愿由ы븯怨?怨듭쑀?섏꽭님</p>
 </div>
 <CardAction>
 <Link href="/smart-toolkit/dept-job/insertDeptJob">
 <Button size="lg" className="gap-2 shadow-lg font-black bg-primary hover:bg-primary/90 transition-all active:scale-95">
 <Plus className="w-5 h-5" /> 신규 등록
 </Button>
 </Link>
 </CardAction>
 </CardHeader>
 <CardContent className="pt-10 px-8">
 <div className="mb-8 flex items-center gap-4">
 <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 ring-8 ring-slate-50">
 <CheckSquare className="w-5 h-5 text-primary" />
 <span className="text-sm font-bold opacity-60 tracking-tight">?꾩껜 吏꾪뻾 嫄댁닔</span>
 <span className="text-xl font-black">{totalCount}嫄?/span>
 </div>
 </div>

 <div className="rounded-2xl border-2 border-slate-50 overflow-hidden shadow-sm bg-white ring-1 ring-slate-100">
 <Table>
 <TableHeader className="bg-slate-50/50">
 <TableRow>
 <TableHead className="w-[80px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">?쒕쾲</TableHead>
 <TableHead className="w-[120px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">以묒슂님/TableHead>
 <TableHead className="font-black text-slate-900 text-[10px] py-6 tracking-[0.2em] px-4">업무 媛쒖슂 (Task Name)</TableHead>
 <TableHead className="w-[150px] font-black text-slate-400 text-[10px] py-6 text-center tracking-[0.2em]">?대떦님/TableHead>
 <TableHead className="w-[150px] font-black text-slate-400 text-[10px] py-6 text-center tracking-[0.2em]">등록님/TableHead>
 <TableHead className="w-[100px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">愿由?/TableHead>
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
 <TableCell className="py-6"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
 </TableRow>
 ))
 ) : list.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold tracking-tight opacity-30">
 諛곗젙님遺님업무媛 ?놁뒿?덈떎.
 </TableCell>
 </TableRow>
 ) : (
 list.map((item, idx) => (
 <TableRow key={item.deptJobId} className="hover:bg-slate-50/50 transition-all border-b last:border-0 group">
 <TableCell className="text-center font-mono text-sm text-slate-400 py-6">
 {totalCount - ((page踰덊샇 - 1) * 10) - idx}
 </TableCell>
 <TableCell className="text-center py-6">
 {getPriorityBadge(item.priort)}
 </TableCell>
 <TableCell className="px-4 py-6">
 <Link href={`/smart-toolkit/dept-job/selectDeptJobDetail/${item.deptJobId}`} className="flex items-center gap-3">
 <FileText className="w-5 h-5 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
 <span className="text-lg font-black text-slate-800 group-hover:text-primary transition-colors">
 {item.deptJobNm}
 </span>
 </Link>
 </TableCell>
 <TableCell className="text-center py-6">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-100 rounded-full text-slate-700 font-bold text-sm shadow-sm">
 <User className="w-3.5 h-3.5 opacity-40" /> {item.frstRegisterNm}
 </div>
 </TableCell>
 <TableCell className="text-center py-6">
 <div className="flex items-center justify-center gap-2 text-slate-400 font-bold text-sm">
 <Calendar className="w-4 h-4 opacity-30" /> {item.frstRegisterPnttm?.substring(0, 10)}
 </div>
 </TableCell>
 <TableCell className="text-center">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(item.deptJobId)}
 className="h-10 w-10 text-slate-300 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 rounded-xl"
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
 <div className="flex items-center justify-center gap-6 mt-16 pb-10">
 <Button
 variant="ghost"
 size="lg"
 onClick={() => setPage踰덊샇(p => Math.max(1, p - 1))}
 disabled={page踰덊샇 === 1}
 className="px-12 h-14 rounded-2xl font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition-all tracking-tight text-[10px]"
 >
 ?댁쟾
 </Button>
 <div className="bg-slate-50 text-slate-900 border-2 border-white px-10 py-3 rounded-2xl shadow-xl flex items-center gap-4 ring-8 ring-slate-100/50">
 <span className="text-xl font-black">{page踰덊샇}</span>
 <div className="h-4 w-px bg-slate-200" />
 <span className="text-sm font-bold text-slate-400">{totalPages}</span>
 </div>
 <Button
 variant="ghost"
 size="lg"
 onClick={() => setPage踰덊샇(p => Math.min(totalPages, p + 1))}
 disabled={page踰덊샇 === totalPages}
 className="px-12 h-14 rounded-2xl font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition-all tracking-tight text-[10px]"
 >
 ?ㅼ쓬
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
};

export default DeptJobListPage;

