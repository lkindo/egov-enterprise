'use client';

import { useState, useCallback, useEffect } from 'react';

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
import { getClCodeList } from '@/services/system/codeService';
import { CmmnClCode, SearchParams } from '@/types/system';
import { CommonClCodeForm } from '@/components/admin/system/CommonClCodeForm';

export default function CommonClCodePage() {
    const [codes, setCodes] = useState<CmmnClCode[]>([]);
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedCode, setSelectedCode] = useState<CmmnClCode | undefined>(undefined);

    const fetchCodes = useCallback(async () => {
        try {
            const response = await getClCodeList(params);
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

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setSelectedCode(undefined);
        setIsFormOpen(true);
    }

    const handleEdit = (code: CmmnClCode) => {
        setSelectedCode(code);
        setIsFormOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">공통분류코드 관리</h2>
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
                        <SelectItem value="1">분류코드</SelectItem>
                        <SelectItem value="2">분류코드명</SelectItem>
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
                            <TableHead>분류코드</TableHead>
                            <TableHead>분류코드명</TableHead>
                            <TableHead>사용여부</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {codes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            codes.map((code, index) => (
                                <TableRow
                                    key={code.clCode}
                                    className="cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleEdit(code)}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{code.clCode}</TableCell>
                                    <TableCell>{code.clCodeNm}</TableCell>
                                    <TableCell>{code.useAt}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <CommonClCodeForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                data={selectedCode}
                onSuccess={fetchCodes}
            />
        </div>
    );
}
