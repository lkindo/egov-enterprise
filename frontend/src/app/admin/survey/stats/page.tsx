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
    page: 1, 
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
    setParams(prev => ({ ...prev, page: 1 }));
  };

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-[0.1rem] text-amber-600">
                    <TrendingUp size={18} />
                </div>
                <span className="text-sm font-black text-amber-600 tracking-tight uppercase">Data Analytics</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground ">?ㅻЦ ?듦퀎 <span className="text-amber-500">遺꾩꽍</span></h1>
            <p className="text-muted-foreground font-bold text-sm max-w-lg">?ㅼ떆媛??묐떟 ?꾪솴???ㅺ컖?꾨줈 遺꾩꽍?섏뿬 ?곗씠???몄궗?댄듃瑜??꾩텧?⑸땲??</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-[0.1rem] border-none shadow-sm bg-slate-900 text-white p-8 space-y-4 text-left">
                <div className="w-12 h-12 rounded-[0.1rem] bg-white/10 flex items-center justify-center">
                    <FileBarChart size={24} className="text-amber-400" />
                </div>
                <div className="text-left">
                    <p className="text-slate-400 text-xs font-black tracking-widest uppercase text-left">Targeted Polls</p>
                    <h3 className="text-4xl font-black text-left">{totalCount}</h3>
                </div>
            </Card>
            <Card className="rounded-[0.1rem] border-none shadow-sm bg-white p-8 space-y-4 ring-1 ring-slate-100 text-left">
                <div className="w-12 h-12 rounded-[0.1rem] bg-amber-100 flex items-center justify-center">
                    <TrendingUp size={24} className="text-amber-600" />
                </div>
                <div className="text-left">
                    <p className="text-slate-400 text-xs font-black tracking-widest uppercase text-left">Response Rate</p>
                    <h3 className="text-4xl font-black text-left">78.4<span className="text-lg text-slate-300 font-bold ml-1">%</span></h3>
                </div>
            </Card>
            <Card className="rounded-[0.1rem] border-none shadow-sm bg-white p-8 space-y-4 ring-1 ring-slate-100 text-left">
                <div className="w-12 h-12 rounded-[0.1rem] bg-slate-100 flex items-center justify-center text-left">
                    <PieChart size={24} className="text-slate-600" />
                </div>
                <div className="text-left">
                    <p className="text-slate-400 text-xs font-black tracking-widest uppercase text-left">Active Analytics</p>
                    <h3 className="text-4xl font-black text-left uppercase">Live</h3>
                </div>
            </Card>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-[0.1rem] bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-8 text-left">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    <Input
                        placeholder="遺꾩꽍???ㅻЦ紐낆쓣 ?낅젰?섏꽭??
                        className="h-14 pl-14 rounded-[0.1rem] border-2 border-transparent bg-white shadow-sm focus:border-amber-500 focus:ring-0 transition font-bold text-left"
                        value={params.searchKeyword || ''}
                        onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                    />
                </div>
                <Button type="submit" className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-sm shadow-sm transition active:scale-95">遺꾩꽍 議고쉶</Button>
            </form>
        </CardHeader>
        <CardContent className="p-0 text-left">
          <Table>
            <TableHeader className="bg-slate-50/50 text-left">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[80px] text-center font-black text-slate-400 text-xs py-6">踰덊샇</TableHead>
                <TableHead className="font-black text-slate-900 text-xs py-6 px-4 text-left">?ㅻЦ 二쇱젣 (Survey Subject)</TableHead>
                <TableHead className="w-[120px] font-black text-slate-400 text-xs py-6 text-center">?묐떟 ??/TableHead>
                <TableHead className="w-[250px] font-black text-slate-400 text-xs py-6 text-center">議곗궗 湲곌컙</TableHead>
                <TableHead className="w-[120px] font-black text-slate-400 text-xs py-6 text-center">吏꾪뻾 ?곹깭</TableHead>
                <TableHead className="w-[150px] font-black text-slate-400 text-xs py-6 text-right px-8">?듦퀎 由ы룷??/TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-left border-none">
              {isLoading ? (
                <TableSkeleton columnCount={6} rowCount={10} />
              ) : polls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold tracking-tight opacity-40">
                    ?듦퀎 ?곗씠?곌? 議댁옱?섏? ?딆뒿?덈떎.
                  </TableCell>
                </TableRow>
              ) : (
                polls.map((poll, index) => (
                  <TableRow key={poll.pollId} className="hover:bg-amber-50/30 transition border-b last:border-0 group border-slate-50">
                    <TableCell className="text-center font-mono text-sm text-slate-400 py-6">
                        {index + 1 + ((params.page || 1) - 1) * 10}
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
                        <Badge variant="outline" className="rounded-md font-bold px-3 border-amber-200 text-amber-600 bg-amber-50 group-hover:bg-amber-100 transition-colors">吏묎퀎以?/Badge>
                    </TableCell>
                    <TableCell className="text-right px-8 py-6">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/survey/stats/${poll.pollId}`)} className="rounded-[0.1rem] font-black text-xs gap-2 group-hover:bg-amber-500 group-hover:text-white transition">
                        <BarChart3 className="h-4 w-4" /> 寃곌낵 由ы룷??                      </Button>
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
                onPageChange={(page) => setParams(prev => ({ ...prev, page }))}
            />
        </div>
      )}
    </div>
  );
}
