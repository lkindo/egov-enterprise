'use client';

export const dynamic = "force-dynamic";

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
import { Plus, Search } from "lucide-react";
import { getTermsList } from '@/services/terms/termsService';
import { StplatManageVO, TermsSearchParams } from '@/types/terms';
import { PaginationResponse } from '@/types/system';

export default function TermsListPage() {
    const router = useRouter();
    const [termsList, setTermsList] = useState<StplatManageVO[]>([]);
    const [params, setParams] = useState<TermsSearchParams>({
        pageIndex: 1,
        searchKeyword: '',
    });
    const [pagination, setPagination] = useState<PaginationResponse<any>['paginationInfo'] | null>(null);

    const fetchList = useCallback(async () => {
        try {
            const response = await getTermsList(params);
            if (response && response.resultList) {
                setTermsList(response.resultList);
                setPagination(response.paginationInfo);
            } else {
                setTermsList([]);
            }
        } catch (error) {
            console.error(error);
            setTermsList([]);
        }
    }, [params]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

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

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Input
                    placeholder="약관명 검색"
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
                            <TableHead>약관명</TableHead>
                            <TableHead>등록일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {termsList.length === 0 ? (
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
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{term.useStplatNm}</TableCell>
                                    <TableCell>{term.frstRegistPnttm?.slice(0, 10)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
