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
import { Plus, Search } from "lucide-react";
import { getPollList } from '@/services/poll/pollService';
import { OnlinePollManageVO, PollSearchParams } from '@/types/business/poll';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";

export default function PollManagePage() {
 const router = useRouter();
 const [params, setParams] = useState<PollSearchParams>({
 page번호: 1,
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
 setParams(prev => ({ ...prev, page번호: 1 }));
 };

 const getStatusBadge = (endDate: string) => {
 const today = new Date();
 const end = new Date(endDate);
 if (end < today) return <Badge variant="secondary">종료됨</Badge>;
 return <Badge variant="default">진행중</Badge>;
 };

 return (
 <div className="space-y-6">
 <div className="flex justify-between items-center">
 <h2 className="text-2xl font-bold tracking-tight">온라인 설문 관리</h2>
 <Button onClick={() => router.push('/admin/survey/manage/create')}>
 <Plus className="mr-2 h-4 w-4" />
 설문 등록
 </Button>
 </div>

 <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
 <Input
 placeholder="설문명 검색"
 className="max-w-sm"
 value={params.searchKeyword || ''}
 onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
 />
 <Button type="submit">
 <Search className="mr-2 h-4 w-4" />
 조회
 </Button>
 </form>

 <div className="rounded-md border">
 <Table>
 <TableHeader>
 <TableRow>
 <TableHead className="w-[60px]">번호</TableHead>
 <TableHead>설문명</TableHead>
 <TableHead>기간</TableHead>
 <TableHead>상태</TableHead>
 <TableHead>등록자</TableHead>
 <TableHead>등록일</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {isLoading ? (
 <TableSkeleton columnCount={6} rowCount={10} />
 ) : polls.length === 0 ? (
 <TableRow>
 <TableCell colSpan={6} className="h-24 text-center">
 설문 데이터가 없습니다.
 </TableCell>
 </TableRow>
 ) : (
 polls.map((poll, index) => (
 <TableRow
 key={poll.pollId}
 className="cursor-pointer hover:bg-slate-50"
 onClick={() => router.push(`/admin/survey/manage/${poll.pollId}`)}
 >
 <TableCell>{index + 1 + ((params.page번호 || 1) - 1) * 10}</TableCell>
 <TableCell className="font-medium">{poll.pollNm}</TableCell>
 <TableCell>{poll.pollBeginDe} ~ {poll.pollEndDe}</TableCell>
 <TableCell>{getStatusBadge(poll.pollEndDe)}</TableCell>
 <TableCell>{poll.frstRegisterNm}</TableCell>
 <TableCell>{poll.frstRegistPnttm?.slice(0, 10)}</TableCell>
 </TableRow>
 ))
 )}
 </TableBody>
 </Table>
 </div>

 {pagination && (
 <PagePagination
 pagination={pagination}
 onPageChange={(page) => setParams(prev => ({ ...prev, page번호: page }))}
 />
 )}
 </div>
 );
}
