'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import damService from '@/services/dam/damService';
import { KnoManagementVO } from '@/types/dam';

export default function KnoListPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [knoList, setKnoList] = useState<KnoManagementVO[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchKnoList = async (page: number) => {
        try {
            const result = await damService.getKnoList({
                pageIndex: page,
                searchKeyword: searchKeyword
            });
            if (result.success) {
                setKnoList(result.list || []);
                // Pagination info handling needs adjustment based on actual backend response
                // Assuming result.pagination.totalRecordCount / pageSize
                const total = result.pagination?.totalRecordCount || 0;
                setTotalPages(Math.ceil(total / 10)); // default page unit 10
            }
        } catch (error) {
            console.error('Failed to fetch kno list:', error);
        }
    };

    useEffect(() => {
        const page = Number(searchParams.get('page')) || 1;
        setCurrentPage(page);
        fetchKnoList(page);
    }, [searchParams]);

    const handleSearch = () => {
        fetchKnoList(1);
        router.push(`/admin/dam/kno?page=1`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight">지식정보 관리</h2>
                <Button asChild>
                    <Link href="/admin/dam/kno/create">지식정보 등록</Link>
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <Input
                    placeholder="지식정보명 검색"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="max-w-sm"
                />
                <Button onClick={handleSearch}>검색</Button>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">순번</TableHead>
                            <TableHead>지식명</TableHead>
                            <TableHead className="w-[150px]">지식유형</TableHead>
                            <TableHead className="w-[150px]">공개여부</TableHead>
                            <TableHead className="w-[150px]">등록일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {knoList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    데이터가 없습니다.
                                </TableCell>
                            </TableRow>
                        ) : (
                            knoList.map((kno, index) => (
                                <TableRow key={kno.knoId}>
                                    <TableCell>{index + 1 + (currentPage - 1) * 10}</TableCell>
                                    <TableCell>
                                        <Link href={`/admin/dam/kno/${kno.knoId}`} className="hover:underline text-blue-600">
                                            {kno.knoNm}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{kno.knoType}</TableCell>
                                    <TableCell>{kno.othbcAt === 'Y' ? '공개' : '비공개'}</TableCell>
                                    <TableCell>{kno.frstRegisterPnttm?.slice(0, 10)}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                href={`/admin/dam/kno?page=${Math.max(1, currentPage - 1)}`}
                                aria-disabled={currentPage === 1}
                            />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <PaginationItem key={page}>
                                <PaginationLink
                                    href={`/admin/dam/kno?page=${page}`}
                                    isActive={currentPage === page}
                                >
                                    {page}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                href={`/admin/dam/kno?page=${Math.min(totalPages, currentPage + 1)}`}
                                aria-disabled={currentPage === totalPages}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            )}
        </div>
    );
}
