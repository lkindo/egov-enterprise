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
  priort: string;
}

const DeptJobListPage = () => {
  const [list, setList] = useState<DeptJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = { pageNo, pageUnit: 10 };
      const response = (await axios.get('/deptjob', { params })) as any;
      setList(response.data.resultList || []);
      setTotalCount(response.data.totalCount || 0);
      setTotalPages(response.data.totalPages || 0);
    } catch (error) {
      console.error('Failed to fetch dept jobs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [pageNo]);

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      (await axios.delete(`/deptjob/${id}`)) as any;
      fetchList();
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case '1': return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md border border-rose-200">높음</span>;
      case '2': return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-md border border-amber-200">중간</span>;
      default: return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-md border border-slate-200">낮음</span>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <DynamicBreadcrumb />

      <Card className="border-none shadow-xl overflow-hidden rounded-[0.1rem]">
        <CardHeader className="flex flex-row items-center justify-between pb-8 pt-8 px-8 border-b bg-muted/20">
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tighter flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-primary" /> 부서 업무 목록
            </CardTitle>
            <p className="text-sm text-muted-foreground font-medium tracking-tight opacity-70">부서의 모든 과업을 체계적으로 관리하고 공유하세요.</p>
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
            <div className="bg-slate-900 text-white px-6 py-3 rounded-[0.1rem] shadow-xl flex items-center gap-3 ring-8 ring-slate-50">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold opacity-60 tracking-tight">전체 진행 건수</span>
              <span className="text-xl font-black">{totalCount}건</span>
            </div>
          </div>

          <div className="rounded-[0.1rem] border-2 border-slate-50 overflow-hidden shadow-sm bg-white ring-1 ring-slate-100">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[80px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">번호</TableHead>
                  <TableHead className="w-[120px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">중요도</TableHead>
                  <TableHead className="font-black text-slate-900 text-[10px] py-6 tracking-[0.2em] px-4">업무 개요 (Task Name)</TableHead>
                  <TableHead className="w-[150px] font-black text-slate-400 text-[10px] py-6 text-center tracking-[0.2em]">담당자</TableHead>
                  <TableHead className="w-[150px] font-black text-slate-400 text-[10px] py-6 text-center tracking-[0.2em]">등록일</TableHead>
                  <TableHead className="w-[100px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">관리</TableHead>
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
                      배정된 부서 업무가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item, idx) => (
                    <TableRow key={item.deptJobId} className="hover:bg-slate-50/50 transition-all border-b last:border-0 group">
                      <TableCell className="text-center font-mono text-sm text-slate-400 py-6">
                        {totalCount - ((pageNo - 1) * 10) - idx}
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
                          className="h-10 w-10 text-slate-300 hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100 rounded-[0.1rem]"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-6 mt-16 pb-10">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setPageNo(p => Math.max(1, p - 1))}
                disabled={pageNo === 1}
                className="px-12 h-14 rounded-[0.1rem] font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition-all tracking-tight text-[10px]"
              >
                이전
              </Button>
              <div className="bg-slate-50 text-slate-900 border-2 border-white px-10 py-3 rounded-[0.1rem] shadow-xl flex items-center gap-4 ring-8 ring-slate-100/50">
                <span className="text-xl font-black">{pageNo}</span>
                <div className="h-4 w-px bg-slate-200" />
                <span className="text-sm font-bold text-slate-400">{totalPages}</span>
              </div>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                disabled={pageNo === totalPages}
                className="px-12 h-14 rounded-[0.1rem] font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition-all tracking-tight text-[10px]"
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

export default DeptJobListPage;
