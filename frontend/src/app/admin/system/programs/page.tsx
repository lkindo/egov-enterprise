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
import { getProgramList } from '@/services/system/programService';
import { ProgrmManage, SearchParams } from '@/types/system';
import { ProgramForm } from '@/components/admin/system/ProgramForm';

export default function ProgramPage() {
    const [programs, setPrograms] = useState<ProgrmManage[]>([]);
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState<ProgrmManage | undefined>(undefined);

    const fetchPrograms = useCallback(async () => {
        try {
            const response = await getProgramList(params);
            if (response && response.resultList) {
                setPrograms(response.resultList);
            } else {
                setPrograms([]);
            }
        } catch (error) {
            console.error(error);
            setPrograms([]);
        }
    }, [params]);

    useEffect(() => {
        fetchPrograms();
    }, [fetchPrograms]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const handleCreate = () => {
        setSelectedProgram(undefined);
        setIsFormOpen(true);
    }

    const handleEdit = (program: ProgrmManage) => {
        setSelectedProgram(program);
        setIsFormOpen(true);
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">프로그램 관리</h2>
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
                        <SelectItem value="1">프로그램파일명</SelectItem>
                        <SelectItem value="2">프로그램명</SelectItem>
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
                            <TableHead>프로그램파일명</TableHead>
                            <TableHead>프로그램명</TableHead>
                            <TableHead>URL</TableHead>
                            <TableHead>설명</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {programs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            programs.map((program, index) => (
                                <TableRow
                                    key={program.progrmFileNm}
                                    className="cursor-pointer hover:bg-slate-50"
                                    onClick={() => handleEdit(program)}
                                >
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{program.progrmFileNm}</TableCell>
                                    <TableCell>{program.progrmKoreanNm}</TableCell>
                                    <TableCell>{program.url}</TableCell>
                                    <TableCell>{program.progrmDc}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ProgramForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                data={selectedProgram}
                onSuccess={fetchPrograms}
            />
        </div>
    );
}
