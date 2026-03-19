'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { addressbookUserService, AddressBook } from '@/services/user/addressbook/AddressbookUserService';
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
 const [page번호, setPage번호] = useState(1);
 const [searchWrd, setSearchWrd] = useState('');
 const [loading, setLoading] = useState(false);

 const fetchList = async () => {
 setLoading(true);
 try {
 const params = { page번호, pageUnit: 10, searchWrd };
 const response = await addressbookUserService.getAddressBooks(params);

 // Spring Data Page 객체 구조에 맞게 매핑
 setList(response.list || []);
 setTotalCount(response.total || 0);
 setTotalPages(response.totalPage || 0);
 } catch (error) {
 console.error('Failed to fetch address books', error);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 fetchList();
 }, [page번호]);

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setPage번호(1);
 fetchList();
 };

 const handleDelete = async (adbkId: string) => {
 if (!confirm('삭제하시겠습니까?')) return;
 try {
 await addressbookUserService.deleteAddressBook(adbkId);
 fetchList();
 } catch (error) {
 alert('삭제에 실패했습니다.');
 }
 };

 return (
 <div className="flex flex-col gap-6 p-6">
 {/* Breadcrumb Navigation */}
 <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
 <Link href="/" className="hover:text-foreground flex items-center gap-1 transition-colors">
 <Home className="w-4 h-4" /> 홈
 </Link>
 <ChevronRight className="w-4 h-4" />
 <span>협업</span>
 <ChevronRight className="w-4 h-4" />
 <span className="text-foreground font-medium">주소록관리</span>
 </div>

 <Card className="border-none shadow-md">
 <CardHeader className="flex flex-row items-center justify-between pb-6">
 <CardTitle className="text-2xl font-bold tracking-tight">주소록 목록</CardTitle>
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
 placeholder="이름/전화번호로 검색하세요"
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 />
 </div>
 <Button type="submit" variant="secondary" className="h-11 px-6 font-medium border border-input shadow-sm hover:bg-accent transition-colors">
 검색
 </Button>
 </form>
 <div className="text-sm font-medium text-muted-foreground whitespace-nowrap bg-muted px-4 py-2 rounded-full">
 총 <span className="text-primary font-bold">{totalCount}</span>건의 연락처
 </div>
 </div>

 {/* Table Area */}
 <div className="rounded-xl border overflow-hidden shadow-sm">
 <Table>
 <TableHeader className="bg-muted/50">
 <TableRow>
 <TableHead className="w-[80px] text-center font-bold">번호</TableHead>
 <TableHead className="w-[150px] font-bold">이름</TableHead>
 <TableHead className="w-[180px] font-bold">전화번호</TableHead>
 <TableHead className="font-bold">이메일 / 주소</TableHead>
 <TableHead className="w-[120px] text-center font-bold">등록일</TableHead>
 <TableHead className="w-[100px] text-center font-bold">관리</TableHead>
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
 등록된 주소록 정보가 없습니다.
 </TableCell>
 </TableRow>
 ) : (
 list.map((item, idx) => (
 <TableRow key={item.adbkId} className="hover:bg-muted/30 transition-colors group">
 <TableCell className="text-center font-medium text-muted-foreground">
 {totalCount - ((page번호 - 1) * 10) - idx}
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
 onClick={() => setPage번호(p => Math.max(1, p - 1))}
 disabled={page번호 === 1}
 className="px-4 shadow-sm"
 >
 이전
 </Button>
 <div className="flex items-center gap-2">
 <span className="text-sm font-bold text-primary">{page번호}</span>
 <span className="text-sm text-muted-foreground">/</span>
 <span className="text-sm font-medium">{totalPages}</span>
 </div>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setPage번호(p => Math.min(totalPages, p + 1))}
 disabled={page번호 === totalPages}
 className="px-4 shadow-sm"
 >
 다음
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
};

export default AddressBookListPage;
