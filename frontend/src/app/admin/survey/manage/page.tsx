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
import { Plus, Search, FileText, Calendar, User, LayoutGrid } from "lucide-react";
import { getPollList } from '@/services/poll/pollService';
import { OnlinePollManageVO, PollSearchParams } from '@/types/business/poll';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PollManagePage() {
  const router = useRouter();
  const [params, setParams] = useState<PollSearchParams>({
    page: 1,
    searchKeyword: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-polls', params],
    queryFn: () => getPollList(params),
  });

  const polls: OnlinePollManageVO[] = data?.resultList || [];
  const pagination = data?.paginationInfo;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(prev => ({ ...prev, page: 1 }));
  };

  const getStatusBadge = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    if (end < today) return <Badge variant="secondary" className="rounded-md font-bold px-3">종료</Badge>;
    return <Badge variant="default" className="rounded-md font-bold px-3 bg-emerald-500 hover:bg-emerald-600">진행중</Badge>;
  };

  return (
    <div className="p-8 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-[0.1rem] text-primary">
              <LayoutGrid size={18} />
            </div>
            <span className="text-sm font-black text-primary tracking-tight uppercase">Survey Governance</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground ">온라인 설문 <span className="text-primary">관리</span></h1>
          <p className="text-muted-foreground font-bold text-sm max-w-lg">조직 내 의견 수렴 및 투표 프로세스를 통합 관리하고 분석합니다.</p>
        </div>
        <Button onClick={() => router.push('/admin/survey/manage/create')} className="h-14 px-8 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-sm tracking-tight shadow-xl hover:bg-slate-800 transition-all active:scale-95 gap-3">
          <Plus className="w-5 h-5" /> 설문 신규 등록
        </Button>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-[0.1rem] bg-white ring-1 ring-slate-100">
        <CardHeader className="bg-slate-50/50 border-b p-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="설문명을 입력하여 검색하세요"
                className="h-14 pl-14 rounded-[0.1rem] border-2 border-transparent bg-white shadow-sm focus:border-primary focus:ring-0 transition-all font-bold"
                value={params.searchKeyword || ''}
                onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
              />
            </div>
            <Button type="submit" className="h-14 px-10 rounded-[0.1rem] bg-white border-2 border-slate-200 text-slate-900 font-black text-sm hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all active:scale-95">조회하기</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] text-center font-black text-slate-400 text-xs py-6">ID</TableHead>
                <TableHead className="font-black text-slate-900 text-xs py-6 px-4">설문 정보 (Survey Name)</TableHead>
                <TableHead className="w-[250px] font-black text-slate-400 text-xs py-6 text-center">기간 (Period)</TableHead>
                <TableHead className="w-[120px] font-black text-slate-400 text-xs py-6 text-center">상태</TableHead>
                <TableHead className="w-[150px] font-black text-slate-400 text-xs py-6 text-center">등록자</TableHead>
                <TableHead className="w-[150px] font-black text-slate-400 text-xs py-6 text-center">등록일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton columnCount={6} rowCount={10} />
              ) : polls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold tracking-tight opacity-40">
                    검색 결과가 존재하지 않습니다.
                  </TableCell>
                </TableRow>
              ) : (
                polls.map((poll, index) => (
                  <TableRow
                    key={poll.pollId}
                    className="cursor-pointer hover:bg-slate-50/50 transition-all border-b last:border-0 group"
                    onClick={() => router.push(`/admin/survey/manage/${poll.pollId}`)}
                  >
                    <TableCell className="text-center font-mono text-sm text-slate-400 py-6">
                      {index + 1 + ((params.page || 1) - 1) * 10}
                    </TableCell>
                    <TableCell className="px-4 py-6">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[17px] font-black text-slate-800 group-hover:text-primary transition-colors">{poll.pollNm}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full text-slate-500 font-bold text-xs">
                        <Calendar className="w-3.5 h-3.5 opacity-40" /> {poll.pollBeginDe} ~ {poll.pollEndDe}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6">{getStatusBadge(poll.pollEndDe)}</TableCell>
                    <TableCell className="text-center py-6">
                      <div className="flex items-center justify-center gap-2 text-slate-600 font-bold text-sm">
                        <User className="w-3.5 h-3.5 opacity-30" /> {poll.frstRegisterNm}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-6 font-mono text-sm text-slate-400">
                      {poll.createdDate?.slice(0, 10)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {pagination && (
        <div className="flex justify-center pt-10 pb-20">
          <PagePagination
            pagination={pagination}
            onPageChange={(page) => setParams(prev => ({ ...prev, page }))}
          />
        </div>
      )}
    </div>
  );
}
