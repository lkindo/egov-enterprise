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
import { Plus, Search } from "lucide-react";
import { getTermsList } from '@/services/terms/termsService';
import { TermsSearchParams, StplatManageVO } from '@/types/terms';
import { TableSkeleton } from "@/components/common/TableSkeleton";
import { PagePagination } from "@/components/common/PagePagination";

export default function TermsListPage() {
    const router = useRouter();
    const [params, setParams] = useState<TermsSearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-terms', params],
        queryFn: () => getTermsList(params),
    });

    const termsList: StplatManageVO[] = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">약관 관리</h2>
                <Button onClick={() => router.push('/admin/terms/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    약관 등록
                </Button>
            </div>

            <form onSubmit={handleSearch} className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="약관명 검색"
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
                            <TableHead>약관명</TableHead>
                            <TableHead>등록일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton columnCount={3} rowCount={10} />
                        ) : termsList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    등록된 약관이 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            termsList.map((term, index) => (
                                <TableRow
                                    key={term.useStplatId}
                                    className="cursor-pointer hover:bg-slate-50"
                                    onClick={() => router.push(`/admin/terms/${term.useStplatId}`)}
                                >
                                    <TableCell>{index + 1 + ((params.pageIndex || 1) - 1) * 10}</TableCell>
                                    <TableCell className="font-medium">{term.useStplatNm}</TableCell>
                                    <TableCell>{term.frstRegistPnttm?.slice(0, 10)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {pagination && (
                <PagePagination
                    pagination={pagination}
                    onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))}
                />
            )}
        </div>
    );
}
