'use client';

import React, { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { addressbookUserService, AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, Home, ChevronRight, UserCircle, Phone, Mail, MapPin } from "lucide-react";

interface AddressBookListClientProps {
  dataPromise: Promise<{
    list: AddressBook[];
    total: number;
    totalPage: number;
  }>;
  initialParams: {
    pageNo: number;
    searchWrd: string;
  };
}

export default function AddressBookListClient({ dataPromise, initialParams }: AddressBookListClientProps) {
    const initialData = use(dataPromise);
    const [list, setList] = useState<AddressBook[]>(initialData.list);
    const [totalCount, setTotalCount] = useState(initialData.total);
    const [totalPages, setTotalPages] = useState(initialData.totalPage);
    const [pageNo, setPageNo] = useState(initialParams.pageNo);
    const [searchWrd, setSearchWrd] = useState(initialParams.searchWrd);
    const [loading, setLoading] = useState(false);

    const fetchList = async (targetPageNo: number, targetSearchWrd: string) => {
        setLoading(true);
        try {
            const params = { pageNo: targetPageNo, pageUnit: 10, searchWrd: targetSearchWrd };
            const response = await addressbookUserService.getAddressBooks(params);

            setList(response.list || []);
            setTotalCount(response.total || 0);
            setTotalPages(response.totalPage || 0);
        } catch (error) {
            console.error('Failed to fetch address books', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPageNo(1);
        fetchList(1, searchWrd);
    };

    const handleDelete = async (adbkId: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await addressbookUserService.deleteAddressBook(adbkId);
            fetchList(pageNo, searchWrd);
        } catch {
            alert('삭제에 실패했습니다.');
        }
    };

    // Subsequent page changes
    useEffect(() => {
        if (pageNo !== initialParams.pageNo) {
            fetchList(pageNo, searchWrd);
        }
    }, [pageNo]);

    return (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-700">
            {/* Breadcrumb & Header Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black text-primary tracking-[0.2em] bg-primary/5 px-4 py-1.5 rounded-full w-fit">
                        <Home className="w-3 h-3" /> HOME <ChevronRight className="w-3 h-3 opacity-30" /> 협업 <ChevronRight className="w-3 h-3 opacity-30" /> 주소록
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 ">
                            Contact <span className="text-primary ">Directory</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-sm max-w-lg leading-relaxed">
                            부서 및 외부 협업을 위한 통합 주소록 센터입니다. 성명, 조직, 직책 기반의 빠른 연락처 조회가 가능합니다.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 ring-8 ring-slate-50 border border-white/10 shrink-0">
                        <UserCircle className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold opacity-60 tracking-tight">전체 등록 연락처</span>
                        <div className="h-4 w-px bg-white/20 mx-1" />
                        <span className="text-2xl font-black">{totalCount}건</span>
                    </div>
                    <Link href="/admin/collaboration/address-book/insert-address-book">
                        <Button size="lg" className="h-16 px-8 gap-3 bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 rounded-xl font-black transition-all active:scale-95 shrink-0">
                            <Plus className="w-5 h-5" /> 신규 연락처
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-none shadow-2xl overflow-hidden rounded-xl bg-white ring-1 ring-slate-100">
                <CardHeader className="bg-slate-50/50 pb-8 pt-10 px-10 border-b">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-3 max-w-2xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <Input
                                type="text"
                                className="pl-12 h-14 text-base font-bold bg-white border-2 border-slate-100 focus:border-slate-900 focus-visible:ring-slate-100/5 transition-all shadow-inner rounded-xl"
                                placeholder="성명, 전화번호, 소속 등으로 정밀 검색..."
                                value={searchWrd}
                                onChange={(e) => setSearchWrd(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="h-14 px-10 font-black bg-slate-900 hover:bg-black text-white rounded-xl shadow-xl transition-all active:scale-95">
                            검색하기
                        </Button>
                    </form>
                </CardHeader>
                <CardContent className="pt-8 px-10">
                    <div className="rounded-xl border-2 border-slate-50 overflow-hidden shadow-sm bg-white ring-1 ring-slate-100/50">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[100px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">SEQ</TableHead>
                                    <TableHead className="font-black text-slate-900 text-[10px] py-6 tracking-[0.2em] px-8">사용자 프로필</TableHead>
                                    <TableHead className="w-[250px] font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">연락처 정보</TableHead>
                                    <TableHead className="font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">위치 정보</TableHead>
                                    <TableHead className="w-[150px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">등록 일자</TableHead>
                                    <TableHead className="w-[100px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">ACTION</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="py-8"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                            <TableCell className="py-8"><Skeleton className="h-6 w-full rounded-lg" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-64 text-center text-slate-300 font-black tracking-tighter opacity-40 italic text-xl">
                                            매칭되는 연락처 정보를 찾을 수 없습니다.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    list.map((item, idx) => (
                                        <TableRow key={item.adbkId} className="hover:bg-slate-50/50 transition-all border-b last:border-0 group">
                                            <TableCell className="text-center font-mono text-xs text-slate-400 py-8">
                                                {(pageNo - 1) * 10 + idx + 1}
                                            </TableCell>
                                            <TableCell className="px-8 py-8">
                                                <Link href={`/admin/collaboration/address-book/select-address-book-detail/${item.adbkId}`} className="flex items-center gap-5 group/item">
                                                    <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-primary font-black text-xl shadow-xl ring-4 ring-slate-50 transition-all group-hover/item:scale-110">
                                                        {item.adbkNm?.charAt(0)}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-xl font-black text-slate-800 group-hover/item:text-primary transition-colors tracking-tight">
                                                            {item.adbkNm}
                                                        </span>
                                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase tracking-widest leading-none">Internal</span>
                                                            <span className="opacity-30">|</span>
                                                            <span className="tracking-tight">{item.adbkId}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="py-8">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 text-sm font-black text-slate-600">
                                                        <Phone className="w-4 h-4 text-primary opacity-40" />
                                                        <span className="font-mono tracking-tighter">{item.telNo || '정보 없음'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
                                                        <Mail className="w-4 h-4 opacity-30" />
                                                        <span className="truncate max-w-[200px]">{item.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-8">
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="w-4 h-4 text-primary opacity-40 mt-1 shrink-0" />
                                                    <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[300px]">
                                                        {item.adres || '등록된 주소 정보가 없습니다.'}
                                                    </p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center py-8">
                                                <div className="inline-flex items-center px-4 py-1.5 bg-slate-50 border-2 border-white rounded-full text-slate-400 font-bold font-mono text-[11px] shadow-sm tracking-tight text-center">
                                                    {(item.createdDate || '').substring(0, 10).replace(/-/g, '.')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.adbkId)}
                                                    className="h-12 w-12 text-slate-300 hover:text-rose-500 hover:bg-rose-50/50 transition-all opacity-0 group-hover:opacity-100 rounded-xl border border-transparent hover:border-rose-100 shadow-sm"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-8 mt-20 pb-10">
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => setPageNo(p => Math.max(1, p - 1))}
                                disabled={pageNo === 1}
                                className="px-14 h-16 rounded-xl font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition-all tracking-[0.2em] text-[10px]"
                            >
                                PREV
                            </Button>
                            <div className="bg-slate-50 text-slate-900 border-2 border-white px-10 py-4 rounded-xl shadow-xl flex items-center gap-5 ring-8 ring-slate-100/50">
                                <span className="text-2xl font-black">{pageNo}</span>
                                <div className="h-6 w-px bg-slate-200" />
                                <span className="text-sm font-bold text-slate-400 opacity-60">{totalPages}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                                disabled={pageNo === totalPages}
                                className="px-14 h-16 rounded-xl font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition-all tracking-[0.2em] text-[10px]"
                            >
                                NEXT
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
