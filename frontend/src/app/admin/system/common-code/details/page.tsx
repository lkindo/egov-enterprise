'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getDetailCodeList, getCmmnCodeList } from '@/services/system/codeService';
import { CmmnDetailCode, SearchParams, CmmnCode } from '@/types/system';
import { CommonDetailCodeForm } from '@/components/admin/system/CommonDetailCodeForm';

export default function CommonDetailCodePage() {
    const searchParams = useSearchParams();
    const [codes, setCodes] = useState<CmmnDetailCode[]>([]);
    const [cmmnCodes, setCmmnCodes] = useState<CmmnCode[]>([]);
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: searchParams.get('searchKeyword') || '',
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCode, setSelectedCode] = useState<CmmnDetailCode | undefined>(undefined);

    const fetchCodes = useCallback(async () => {
        try {
            const response = await getDetailCodeList(params);
            if (response && response.resultList) {
                setCodes(response.resultList);
            } else {
                setCodes([]);
            }
        } catch (error) {
            console.error(error);
            setCodes([]);
        }
    }, [params]);

    const fetchCmmnCodes = useCallback(async () => {
        try {
            const response = await getCmmnCodeList({ pageIndex: 1, searchCondition: '', searchKeyword: '' });
            if (response && response.resultList) {
                setCmmnCodes(response.resultList);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => {
        fetchCodes();
        fetchCmmnCodes();
    }, [fetchCodes, fetchCmmnCodes]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setSelectedCode(undefined);
        setIsFormOpen(true);
    }

    const handleEdit = (code: CmmnDetailCode) => {
        setSelectedCode(code);
        setIsFormOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">공통상세코드 관리</h2>
                <Button onClick={handleCreate}>신규 등록</Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-lg">
                <Select
                    value={params.searchCondition}
                    onValueChange={(value) => setParams(prev => ({ ...prev, searchCondition: value }))}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="검색조건" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1">코드ID</SelectItem>
                        <SelectItem value="2">코드</SelectItem>
                        <SelectItem value="3">코드명</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    placeholder="검색어를 입력하세요"
                    className="max-w-sm"
                    value={params.searchKeyword}
                    onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                />
                <Button onClick={handleSearch}>조회</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">순번</TableHead>
                            <TableHead>코드ID</TableHead>
                            <TableHead>코드</TableHead>
                            <TableHead>코드명</TableHead>
                            <TableHead>사용여부</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {codes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            codes.map((code, index) => (
                                <TableRow
                                    key={`${code.codeId}-${code.code}`}
                                    className="cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleEdit(code)}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{code.codeId}</TableCell>
                                    <TableCell>{code.code}</TableCell>
                                    <TableCell>{code.codeNm}</TableCell>
                                    <TableCell>{code.useAt}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CommonDetailCodeForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                data={selectedCode}
                onSuccess={fetchCodes}
                codes={cmmnCodes.map(c => ({ label: c.codeIdNm, value: c.codeId }))}
            />
        </div>
    );
}
