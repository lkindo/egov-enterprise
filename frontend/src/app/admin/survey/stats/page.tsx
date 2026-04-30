'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, BarChart3, PieChart, TrendingUp, Calendar, FileBarChart } from "lucide-react";
import { getPollList } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO, PollSearchParams } from '@/types/business/poll';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SurveyStatsPage() {
  const router = useRouter();
  const [params, setParams] = useState<PollSearchParams>({
    page: 0, 
    searchKeyword: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-survey-stats', params],
    queryFn: () => getPollList(params),
  });

  const polls: OnlinePollManageVO[] = data?.list || [];
  const totalCount = data?.total || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(prev => ({ ...prev, page: 0 }));
  };

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600">
                    <TrendingUp size={18} />
                </div>
                <span className="text-sm font-black text-amber-600 tracking-tight uppercase">Data Analytics</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground ">설문 통계 <span className="text-amber-500">분석</span></h1>
            <p className="text-muted-foreground font-bold text-sm max-w-lg">실시간 응답 현황을 다각도로 분석하여 데이터 인사이트를 도출합니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-xl border-none shadow-sm bg-slate-900 text-white p-8 space-y-4 text-left">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <FileBarChart size={24} className="text-amber-400" />
                </div>
                <div className="text-left">
                    <p className="text-slate-400 text-xs font-black tracking-widest uppercase text-left">Targeted Polls</p>
                    <h3 className="text-4xl font-black text-left">{totalCount}</h3>
                </div>
            </Card>
            <Card className="rounded-xl border-none shadow-sm bg-white p-8 space-y-4 ring-1 ring-slate-100 text-left">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <TrendingUp size={24} className="text-amber-600" />
                </div>
                <div className="text-left">
                    <p className="text-slate-400 text-xs font-black tracking-widest uppercase text-left">Response Rate</p>
                    <h3 className="text-4xl font-black text-left">78.4<span className="text-lg text-slate-300 font-bold ml-1">%</span></h3>
                </div>
            </Card>
            <Card className="rounded-xl border-none shadow-sm bg-white p-8 space-y-4 ring-1 ring-slate-100 text-left">
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-left">
                    <PieChart size={24} className="text-slate-600" />
                </div>
                <div className="text-left">
                    <p className="text-slate-400 text-xs font-black tracking-widest uppercase text-left">Active Analytics</p>
                    <h3 className="text-4xl font-black text-left uppercase">Live</h3>
                </div>
            </Card>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-8 text-left">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <Input
                        placeholder="분석할 설문명을 입력하세요"
                        className="h-14 pl-14 rounded-xl border-2 border-transparent bg-white shadow-sm focus:border-amber-500 focus:ring-0 transition-all font-bold text-left"
                        value={params.searchKeyword || ''}
                        onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                    />
                </div>
                <Button type="submit" className="h-14 px-10 rounded-xl bg-slate-900 border-none text-white font-black text-sm shadow-sm transition-all active:scale-95">분석 조회</Button>
            </form>
        </CardHeader>
        <CardContent className="p-0 text-left">
          <Table>
            <TableHeader className="bg-slate-50/50 text-left">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[80px] text-center font-black text-slate-400 text-xs py-6">번호</TableHead>
                <TableHead className="font-black text-slate-900 text-xs py-6 px-4 text-left">설문 주제 (Survey Subject)</TableHead>
                <TableHead className="w-[120px] font-black text-slate-400 text-xs py-6 text-center">응답 수</TableHead>
                <TableHead className="w-[250px] font-black text-slate-400 text-xs py-6 text-center">조사 기간</TableHead>
                <TableHead className="w-[120px] font-black text-slate-400 text-xs py-6 text-center">진행 상태</TableHead>
                <TableHead className="w-[150px] font-black text-slate-400 text-xs py-6 text-right px-8">통계 리포트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-left border-none">
              {isLoading ? (
                <TableSkeleton columnCount={6} rowCount={10} />
              ) : polls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold tracking-tight opacity-40">
                    통계 데이터가 존재하지 않습니다.
                  </TableCell>
                </TableRow>
              ) : (
                polls.map((poll, index) => (
                  <TableRow key={poll.pollId} className="hover:bg-amber-50/30 transition-all border-b last:border-0 group border-slate-50">
                    <TableCell className="text-center font-mono text-sm text-slate-400 py-6">
                        {index + 1 + (params.page || 0) * 10}
                    </TableCell>
                    <TableCell className="px-4 py-6 text-left">
                        <span className="text-[17px] font-black text-slate-800 group-hover:text-amber-600 transition-colors uppercase text-left">{poll.pollNm}</span>
                    </TableCell>
                    <TableCell className="text-center py-6">
                        <span className="font-mono font-black text-slate-900 text-center">0</span>
                    </TableCell>
                    <TableCell className="text-center py-6 uppercase">
                        <div className="inline-flex items-center gap-2 text-slate-500 font-bold text-xs uppercase text-center">
                          <Calendar className="w-3.5 h-3.5 opacity-40 text-amber-500" /> {poll.pollBeginDe} ~ {poll.pollEndDe}
                        </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                        <Badge variant="outline" className="rounded-md font-bold px-3 border-amber-200 text-amber-600 bg-amber-50 group-hover:bg-amber-100 transition-colors">집계중</Badge>
                    </TableCell>
                    <TableCell className="text-right px-8 py-6">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/survey/stats/${poll.pollId}`)} className="rounded-xl font-black text-xs gap-2 group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <BarChart3 className="h-4 w-4" /> 결과 리포트
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && (
        <div className="flex justify-center pt-10 pb-20">
            <PagePagination
                total={data.total}
                page={data.page}
                size={data.size}
                onPageChange={(page) => setParams(prev => ({ ...prev, page: page - 1 }))}
            />
        </div>
      )}
    </div>
  );
}
