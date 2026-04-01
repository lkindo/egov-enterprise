'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Trash2, Home, ChevronRight } from "lucide-react";



const AddressBookListPage = () => {
    const [list, setList] = useState<AddressBook[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [page踰덊샇, setPage踰덊샇] = useState(1);
    const [searchWrd, setSearchWrd] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchList = async () => {
        setLoading(true);
        try {
            const params = { page踰덊샇, pageUnit: 10, searchWrd };
            const response = await addressbookUserService.getAddressBooks(params);

            // Spring Data Page 媛앹껜 援ъ“님留욊쾶 매핑
            setList(response.list || []);
            setTotalCount(response.total || 0);
            setTotalPages(response.totalPage || 0);
        } catch {
            console.error('Failed to fetch address books', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [page踰덊샇]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage踰덊샇(1);
        fetchList();
    };

    const handleDelete = async (adbkId: string) => {
        if (!confirm('님젣?섏떆寃좎뒿?덇퉴?')) return;
        try {
            await addressbookUserService.deleteAddressBook(adbkId);
            fetchList();
        } catch {
            alert('님젣님?ㅽ뙣?덉뒿?덈떎.');
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
                    <Home className="w-4 h-4" /> 님                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>?묒뾽</span>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground font-medium">二쇱냼濡앷?由?/span>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-6">
                    <CardTitle className="text-2xl font-bold tracking-tight">二쇱냼濡?紐⑸줉</CardTitle>
                    <CardAction>
                        <Link href="/admin/collaboration/address-book/insertAddressBook">
                            <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 transition-all">
                                <Plus className="w-4 h-4" /> 등록
                            </Button>
                        </Link>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    {/* Search Area */}
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                        <form onSubmit={handleSearch} className="flex-1 flex gap-2 w-full">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    className="pl-9 h-11 transition-all focus:ring-2 focus:ring-primary/20"
                                    placeholder="?대쫫/?꾪솕踰덊샇濡?寃?됲븯?몄슂"
                                    value={searchWrd}
                                    onChange={(e) => setSearchWrd(e.target.value)}
                                />
                            </div>
                            <Button type="submit" variant="secondary" className="h-11 px-6 font-medium border border-input shadow-sm hover:bg-accent transition-colors">
                                寃님                            </Button>
                        </form>
                        <div className="text-sm font-medium text-muted-foreground whitespace-nowrap bg-muted px-4 py-2 rounded-full">
                            珥?<span className="text-primary font-bold">{totalCount}</span>嫄댁쓽 ?곕씫泥?                        </div>
                    </div>

                    {/* Table Area */}
                    <div className="rounded-xl border overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[80px] text-center font-bold">踰덊샇</TableHead>
                                    <TableHead className="w-[150px] font-bold">?대쫫</TableHead>
                                    <TableHead className="w-[180px] font-bold">?꾪솕踰덊샇</TableHead>
                                    <TableHead className="font-bold">?대찓님/ 二쇱냼</TableHead>
                                    <TableHead className="w-[120px] text-center font-bold">등록님/TableHead>
                                    <TableHead className="w-[100px] text-center font-bold">愿由?/TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : list.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            등록님二쇱냼濡님뺣낫媛 ?놁뒿?덈떎.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    list.map((item, idx) => (
                                        <TableRow key={item.adbkId} className="hover:bg-muted/30 transition-colors group">
                                            <TableCell className="text-center font-medium text-muted-foreground">
                                                {totalCount - ((page踰덊샇 - 1) * 10) - idx}
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/admin/collaboration/address-book/selectAddressBookDetail/${item.adbkId}`} className="font-bold text-primary hover:underline underline-offset-4 decoration-2 decoration-primary/30 transition-all">
                                                    {item.adbkNm}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm tracking-tight">{item.telNo}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-sm font-medium">{item.email}</span>
                                                    <span className="text-sm text-muted-foreground truncate max-w-[400px]">{item.adres}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center text-sm text-muted-foreground">
                                                {item.createdDate?.substring(0, 10)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(item.adbkId)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-8 py-4 border-t border-dashed">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage踰덊샇(p => Math.max(1, p - 1))}
                                disabled={page踰덊샇 === 1}
                                className="px-4 shadow-sm"
                            >
                                ?댁쟾
                            </Button>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-primary">{page踰덊샇}</span>
                                <span className="text-sm text-muted-foreground">/</span>
                                <span className="text-sm font-medium">{totalPages}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage踰덊샇(p => Math.min(totalPages, p + 1))}
                                disabled={page踰덊샇 === totalPages}
                                className="px-4 shadow-sm"
                            >
                                ?ㅼ쓬
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default AddressBookListPage;

