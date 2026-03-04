'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { KnoManagementVO } from '@/types/dam';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KnoListClient({
    initialData,
    searchKeyword: initialKeyword,
    currentPage: initialPage
}: {
    initialData: any;
    searchKeyword: string;
    currentPage: number
}) {
    const router = useRouter();
    const [searchKeyword, setSearchKeyword] = useState(initialKeyword);
    const knoList: KnoManagementVO[] = initialData.list || [];
    const totalCount = initialData.pagination?.totalRecordCount || 0;
    const totalPages = Math.ceil(totalCount / 10);

    const handleSearch = () => {
        router.push(`/admin/dam/kno?page=1&searchKeyword=${encodeURIComponent(searchKeyword)}`);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 italic uppercase underline decoration-primary/30 underline-offset-8">지식정보 관리</h2>
                <Button asChild className="rounded-xl shadow-lg hover:shadow-primary/20 transition-all font-bold">
                    <Link href="/admin/dam/kno/create">지식정보 등록</Link>
                </Button>
            </div>

            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                <div className="relative max-w-sm w-full">
                    <Input
                        placeholder="지식정보명 검색"
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="rounded-xl border-slate-200 focus:ring-primary/20 pr-10"
                    />
                </div>
                <Button onClick={handleSearch} className="rounded-xl px-8 font-bold">검색</Button>
            </div>

            <div className="rounded-[2.5rem] border border-slate-100 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-50">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="w-[80px] font-black text-slate-400 uppercase text-[10px] tracking-widest px-6 py-5">순번</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest px-6 py-5">지식명</TableHead>
                            <TableHead className="w-[150px] font-black text-slate-400 uppercase text-[10px] tracking-widest px-6 py-5 text-center">지식유형</TableHead>
                            <TableHead className="w-[150px] font-black text-slate-400 uppercase text-[10px] tracking-widest px-6 py-5 text-center">공개여부</TableHead>
                            <TableHead className="w-[150px] font-black text-slate-400 uppercase text-[10px] tracking-widest px-6 py-5 text-center">등록일</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {knoList.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3 grayscale opacity-30">
                                        <Loader2 className="w-10 h-10" />
                                        <p className="font-black uppercase tracking-tighter italic">데이터가 없습니다.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            knoList.map((kno, index) => (
                                <TableRow key={kno.knoId} className="hover:bg-slate-50/50 transition-colors border-slate-50 group">
                                    <TableCell className="px-6 py-5 text-xs font-bold text-slate-400">
                                        {(initialPage - 1) * 10 + index + 1}
                                    </TableCell>
                                    <TableCell className="px-6 py-5">
                                        <Link href={`/admin/dam/kno/${kno.knoId}`} className="font-black text-slate-900 hover:text-primary transition-colors block text-lg tracking-tight">
                                            {kno.knoNm}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-center">
                                        <span className="inline-flex px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                            {kno.knoType === '1' ? '지침' : kno.knoType === '2' ? '법령' : '매뉴얼'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-center">
                                        <span className={cn(
                                            "inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                            kno.othbcAt === 'Y' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                        )}>
                                            {kno.othbcAt === 'Y' ? 'PUBLIC' : 'PRIVATE'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-5 text-center font-bold text-slate-500 tabular-nums text-sm">
                                        {kno.frstRegisterPnttm?.slice(0, 10)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center pt-8">
                    <Pagination>
                        <PaginationContent className="gap-2">
                            <PaginationItem>
                                <PaginationPrevious
                                    href={`/admin/dam/kno?page=${Math.max(1, initialPage - 1)}&searchKeyword=${encodeURIComponent(searchKeyword)}`}
                                    className={cn("rounded-xl border-2 font-black uppercase text-[10px] tracking-widest", initialPage === 1 && "pointer-events-none opacity-50")}
                                />
                            </PaginationItem>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <PaginationItem key={page}>
                                    <PaginationLink
                                        href={`/admin/dam/kno?page=${page}&searchKeyword=${encodeURIComponent(searchKeyword)}`}
                                        isActive={initialPage === page}
                                        className={cn(
                                            "rounded-xl border-2 font-black transition-all",
                                            initialPage === page ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200" : "hover:bg-slate-50"
                                        )}
                                    >
                                        {page}
                                    </PaginationLink>
                                </PaginationItem>
                            ))}

                            <PaginationItem>
                                <PaginationNext
                                    href={`/admin/dam/kno?page=${Math.min(totalPages, initialPage + 1)}&searchKeyword=${encodeURIComponent(searchKeyword)}`}
                                    className={cn("rounded-xl border-2 font-black uppercase text-[10px] tracking-widest", initialPage === totalPages && "pointer-events-none opacity-50")}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                </div>
            )}
        </div>
    );
}
