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
        if (!confirm('??젣?섏떆寃좎뒿?덇퉴?')) return;
        try {
            await addressbookUserService.deleteAddressBook(adbkId);
            fetchList(pageNo, searchWrd);
        } catch {
            alert('??젣???ㅽ뙣?덉뒿?덈떎.');
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
                        <Home className="w-3 h-3" /> HOME <ChevronRight className="w-3 h-3 opacity-30" /> ?묒뾽 <ChevronRight className="w-3 h-3 opacity-30" /> 二쇱냼濡?                    </div>
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 ">
                            Contact <span className="text-primary ">Directory</span>
                        </h1>
                        <p className="text-muted-foreground font-medium text-sm max-w-lg leading-relaxed">
                            遺??諛??몃? ?묒뾽???꾪븳 ?듯빀 二쇱냼濡??쇳꽣?낅땲?? ?깅챸, 議곗쭅, 吏곸콉 湲곕컲??鍮좊Ⅸ ?곕씫泥?議고쉶媛 媛?ν빀?덈떎.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-900 text-white px-6 py-4 rounded-[0.1rem] shadow-2xl flex items-center gap-3 ring-8 ring-slate-50 border border-white/10 shrink-0">
                        <UserCircle className="w-5 h-5 text-primary" />
                        <span className="text-sm font-bold opacity-60 tracking-tight">?꾩껜 ?깅줉 ?곕씫泥?/span>
                        <div className="h-4 w-px bg-white/20 mx-1" />
                        <span className="text-2xl font-black">{totalCount}嫄?/span>
                    </div>
                    <Link href="/admin/collaboration/address-book/insertAddressBook">
                        <Button size="lg" className="h-16 px-8 gap-3 bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/20 rounded-[0.1rem] font-black transition active:scale-95 shrink-0">
                            <Plus className="w-5 h-5" /> ?좉퇋 ?곕씫泥?                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-none shadow-2xl overflow-hidden rounded-[0.1rem] bg-white ring-1 ring-slate-100">
                <CardHeader className="bg-slate-50/50 pb-8 pt-10 px-10 border-b">
                    <form onSubmit={handleSearch} className="flex-1 flex gap-3 max-w-2xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <Input
                                type="text"
                                className="pl-12 h-14 text-base font-bold bg-white border-2 border-slate-100 focus:border-slate-900 focus-visible:ring-slate-100/5 transition shadow-inner rounded-[0.1rem]"
                                placeholder="?깅챸, ?꾪솕踰덊샇, ?뚯냽 ?깆쑝濡??뺣? 寃??.."
                                value={searchWrd}
                                onChange={(e) => setSearchWrd(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="h-14 px-10 font-black bg-slate-900 hover:bg-black text-white rounded-[0.1rem] shadow-xl transition active:scale-95">
                            寃?됲븯湲?                        </Button>
                    </form>
                </CardHeader>
                <CardContent className="pt-8 px-10">
                    <div className="rounded-[0.1rem] border-2 border-slate-50 overflow-hidden shadow-sm bg-white ring-1 ring-slate-100/50">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[100px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">SEQ</TableHead>
                                    <TableHead className="font-black text-slate-900 text-[10px] py-6 tracking-[0.2em] px-8">?ъ슜???꾨줈??/TableHead>
                                    <TableHead className="w-[250px] font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">?곕씫泥??뺣낫</TableHead>
                                    <TableHead className="font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">?꾩튂 ?뺣낫</TableHead>
                                    <TableHead className="w-[150px] text-center font-black text-slate-400 text-[10px] py-6 tracking-[0.2em]">?깅줉 ?쇱옄</TableHead>
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
                                            留ㅼ묶?섎뒗 ?곕씫泥??뺣낫瑜?李얠쓣 ???놁뒿?덈떎.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    list.map((item, idx) => (
                                        <TableRow key={item.adbkId} className="hover:bg-slate-50/50 transition border-b last:border-0 group">
                                            <TableCell className="text-center font-mono text-xs text-slate-400 py-8">
                                                {(pageNo - 1) * 10 + idx + 1}
                                            </TableCell>
                                            <TableCell className="px-8 py-8">
                                                <Link href={`/admin/collaboration/address-book/selectAddressBookDetail/${item.adbkId}`} className="flex items-center gap-5 group/item">
                                                    <div className="w-14 h-14 bg-slate-900 rounded-[0.1rem] flex items-center justify-center text-primary font-black text-xl shadow-xl ring-4 ring-slate-50 transition group-hover/item:scale-110">
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
                                                        <span className="font-mono tracking-tighter">{item.telNo || '?뺣낫 ?놁쓬'}</span>
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
                                                        {item.adres || '?깅줉??二쇱냼 ?뺣낫媛 ?놁뒿?덈떎.'}
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
                                                    className="h-12 w-12 text-slate-300 hover:text-rose-500 hover:bg-rose-50/50 transition opacity-0 group-hover:opacity-100 rounded-[0.1rem] border border-transparent hover:border-rose-100 shadow-sm"
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
                                className="px-14 h-16 rounded-[0.1rem] font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition tracking-[0.2em] text-[10px]"
                            >
                                PREV
                            </Button>
                            <div className="bg-slate-50 text-slate-900 border-2 border-white px-10 py-4 rounded-[0.1rem] shadow-xl flex items-center gap-5 ring-8 ring-slate-100/50">
                                <span className="text-2xl font-black">{pageNo}</span>
                                <div className="h-6 w-px bg-slate-200" />
                                <span className="text-sm font-bold text-slate-400 opacity-60">{totalPages}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => setPageNo(p => Math.min(totalPages, p + 1))}
                                disabled={pageNo === totalPages}
                                className="px-14 h-16 rounded-[0.1rem] font-black text-slate-400 border-2 border-transparent hover:border-slate-100 hover:bg-white transition tracking-[0.2em] text-[10px]"
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
