'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCommunityList } from '@/services/business/community/communityService';
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
import { Users, Home, ChevronRight, MessageSquare, ShieldCheck, Calendar, ArrowLeft, ArrowRight } from "lucide-react";
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

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
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = { pageIndex: page, pageUnit: 10 };
      const data = await getCommunityList(params);
      setList((data.list as any) || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.totalPage || 0);
    } catch (error) {
      console.error('Failed to fetch communities', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page]);

  return (
    <div className="flex flex-col gap-6 p-6 animate-in fade-in duration-1000">
      {/* Breadcrumb Area */}
      <div className="flex items-center justify-between px-2">
        <DynamicBreadcrumb />
      </div>

      <Card className="border-none shadow-2xl overflow-hidden rounded-[0.1rem] ring-1 ring-slate-100">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-900 pb-16 pt-16 px-12 text-white relative overflow-hidden">
          <div className="space-y-4 relative z-10 text-left">
            <CardTitle className="text-4xl font-black tracking-tighter flex items-center gap-5">
              <div className="w-16 h-16 rounded-[0.1rem] bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <span className="text-left font-black tracking-tighter">커뮤니티 공간</span>
            </CardTitle>
            <p className="text-slate-400 font-bold text-lg tracking-tight text-left">워크스페이스 내의 다양한 소모임과 커뮤니티 공간을 만나보세요.</p>
          </div>
          <div className="absolute right-[-10%] top-[-10%] opacity-[0.03] rotate-12 pointer-events-none">
            <Users size={400} />
          </div>
        </CardHeader>
        
        <CardContent className="pt-16 px-12 text-left">
          <div className="mb-10 flex items-center bg-slate-50 p-6 rounded-[0.1rem] border border-slate-100 w-fit text-left">
            <div className="text-sm font-black text-slate-600 flex items-center gap-4 text-left">
              <ShieldCheck className="w-6 h-6 text-primary" /> 
              <span className="text-left">활성화된 전체 커뮤니티</span>
              <span className="text-3xl font-black ml-2 text-slate-900 tabular-nums">{totalCount}</span>
            </div>
          </div>

          <div className="rounded-[0.1rem] border-2 border-slate-50 overflow-hidden shadow-sm bg-white ring-1 ring-slate-200/50">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className="w-[100px] text-center font-black text-slate-400 text-[11px] py-8 tracking-[0.2em] uppercase">NO.</TableHead>
                  <TableHead className="w-[350px] font-black text-slate-900 text-sm py-8 tracking-tight">커뮤니티 명칭</TableHead>
                  <TableHead className="font-black text-slate-400 text-sm py-8 tracking-tight">소개 및 비전</TableHead>
                  <TableHead className="w-[180px] font-black text-slate-400 text-sm py-8 text-center tracking-tight">운영 관리자</TableHead>
                  <TableHead className="w-[180px] font-black text-slate-400 text-sm py-8 text-center tracking-tight">최초 개설일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="py-8"><Skeleton className="h-6 w-12 mx-auto rounded-lg" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-8 w-48 rounded-[0.1rem]" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-6 w-full rounded-[0.1rem]" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-6 w-24 mx-auto rounded-[0.1rem]" /></TableCell>
                      <TableCell className="py-8"><Skeleton className="h-6 w-24 mx-auto rounded-[0.1rem]" /></TableCell>
                    </TableRow>
                  ))
                ) : list.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center text-slate-300 font-black text-xl tracking-tighter opacity-50">
                      개설된 커뮤니티 공간이 시스템에 존재하지 않습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  list.map((item, idx) => (
                    <TableRow key={item.cmmntyId} className="hover:bg-slate-50/80 transition-all border-b last:border-0 group cursor-pointer">
                      <TableCell className="text-center font-mono text-sm text-slate-400 font-bold py-8">
                        {totalCount - ((page - 1) * 10) - idx}
                      </TableCell>
                      <TableCell className="py-8">
                        <Link href={`/admin/community/${item.cmmntyId}`} className="flex items-center gap-5 group/item">
                          <div className="w-12 h-12 rounded-[0.1rem] bg-slate-900 flex items-center justify-center text-white font-black text-xs shadow-lg group-hover/item:scale-110 transition-all duration-500">
                            CM
                          </div>
                          <span className="text-xl font-black text-slate-800 group-hover/item:text-primary transition-colors tracking-tighter">
                            {item.cmmntyNm}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="py-8">
                        <p className="text-base text-slate-500 font-bold line-clamp-1 leading-relaxed text-left">
                          "{item.cmmntyIntrcn || '등록된 소개 정보가 정의되지 않았습니다.'}"
                        </p>
                      </TableCell>
                      <TableCell className="text-center py-8">
                        <div className="inline-flex items-center gap-3 px-5 py-2 bg-slate-100 rounded-[0.1rem] text-slate-700 font-black text-xs border border-slate-200">
                          <ShieldCheck className="w-4 h-4 text-primary" /> {item.frstRegisterNm}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-8">
                        <div className="flex items-center justify-center gap-3 text-slate-400 font-bold text-xs font-mono">
                          <Calendar className="w-4 h-4 opacity-30" /> {item.frstRegisterPnttm?.substring(0, 10)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Area */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-12 mt-20 pb-10">
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-10 h-16 rounded-[0.1rem] font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white hover:text-slate-900 transition-all text-xs tracking-[0.2em] uppercase flex items-center gap-3"
              >
                <ArrowLeft size={16} /> 이전
              </Button>
              <div className="bg-slate-900 text-white h-16 px-12 rounded-[0.1rem] shadow-2xl flex items-center gap-5 border-4 border-white ring-8 ring-slate-50">
                <span className="text-3xl font-black tabular-nums">{page}</span>
                <div className="h-8 w-px bg-white/20" />
                <span className="text-sm font-black text-white/40 tabular-nums">{totalPages}</span>
              </div>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-10 h-16 rounded-[0.1rem] font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white hover:text-slate-900 transition-all text-xs tracking-[0.2em] uppercase flex items-center gap-3"
              >
                다음 <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CommunityListPage;
