'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { getDeptJobList } from '@/services/deptJob/deptJobService';
import { DeptJobVO, DeptJobSearchParams } from '@/types/deptJob';
import { PaginationResponse } from '@/types/system';

export default function DeptJobListPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<DeptJobVO[]>([]);
    const [params, setParams] = useState<DeptJobSearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    const [pagination, setPagination] = useState<PaginationResponse<any>['paginationInfo'] | null>(null);

    const fetchList = useCallback(async () => {
        try {
            const response = await getDeptJobList(params);
            if (response && response.resultList) {
                setJobs(response.resultList);
                setPagination(response.paginationInfo);
            } else {
                setJobs([]);
            }
        } catch (error) {
            console.error(error);
            setJobs([]);
        }
    }, [params]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case '1': return <Badge variant="destructive">높음</Badge>;
            case '2': return <Badge variant="default">보통</Badge>;
            case '3': return <Badge variant="secondary">낮음</Badge>;
            default: return <Badge variant="outline">미지정</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">부서 업무 관리</h2>
                <Button onClick={() => router.push('/cop/smt/djm/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    업무 등록
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="업무명 검색"
                    className="max-w-sm"
                    value={params.searchKeyword}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button onClick={handleSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    조회
                </Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">번호</TableHead>
                            <TableHead>우선순위</TableHead>
                            <TableHead>업무명</TableHead>
                            <TableHead>업무함</TableHead>
                            <TableHead>담당자</TableHead>
                            <TableHead>등록일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {jobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    등록된 부서 업무가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobs.map((job, index) => (
                                <TableRow
                                    key={job.deptJobId}
                                    className="cursor-pointer hover:bg-slate-50"
                                    onClick={() => router.push(`/cop/smt/djm/${job.deptJobId}`)}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{getPriorityBadge(job.priort)}</TableCell>
                                    <TableCell className="font-medium">{job.deptJobNm}</TableCell>
                                    <TableCell>{job.deptJobBxNm || '-'}</TableCell>
                                    <TableCell>{job.chargerNm || '-'}</TableCell>
                                    <TableCell>{job.frstRegistPnttm?.slice(0, 10)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
