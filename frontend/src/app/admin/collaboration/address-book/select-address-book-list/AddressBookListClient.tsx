'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { addressbookUserService, AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Trash2, UserCircle, Layers, RefreshCcw } from "lucide-react";
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import type { AddressBookInitialData } from './AddressBookListServer';

const PAGE_UNIT = 10;

interface AddressBookListClientProps {
 dataPromise: Promise<AddressBookInitialData>;
 initialParams: {
 pageNo: number;
 searchWrd: string;
 };
}

export default function AddressBookListClient({ dataPromise, initialParams }: AddressBookListClientProps) {
 const initialData = use(dataPromise);
 const { toast } = useToast();
 const confirm = useConfirm();

 const [list, setList] = useState<AddressBook[]>(initialData.list);
 const [totalCount, setTotalCount] = useState(initialData.total);
 const [totalPages, setTotalPages] = useState(initialData.totalPage);
 const [pageNo, setPageNo] = useState(initialParams.pageNo);
 const [searchWrd, setSearchWrd] = useState(initialParams.searchWrd);
 const [loading, setLoading] = useState(false);
 // [P1-1] 조회 실패를 "데이터 없음"으로 위장하지 않는다. 서버 컴포넌트의 실패도 그대로 이어받는다.
 const [fetchError, setFetchError] = useState<Error | null>(
   initialData.fetchError ? new Error(initialData.fetchError) : null
 );

 const fetchList = async (targetPageNo: number, targetSearchWrd: string) => {
 setLoading(true);
 try {
 // 백엔드는 Spring Pageable(0-base page)을 받는다. pageNo/pageUnit 은 서버가 읽지 않는다.
 const response = await addressbookUserService.getAddressBooks({
   page: targetPageNo - 1,
   size: PAGE_UNIT,
   searchWrd: targetSearchWrd
 });

 setList(response.list || []);
 setTotalCount(response.total || 0);
 setTotalPages(response.totalPage || 0);
 setFetchError(null);
 } catch (error) {
 console.error('Failed to fetch address books', error);
 setFetchError(error instanceof Error ? error : new Error('주소록 목록을 불러오지 못했습니다.'));
 } finally {
 setLoading(false);
 }
 };

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 setPageNo(1); // [P1-8] 3페이지에서 검색 시 빈 화면이 되는 결함 방지
 void fetchList(1, searchWrd);
 };

 /** 페이지 이동은 반드시 재조회를 동반해야 한다(과거에는 상태만 바뀌고 목록이 그대로였다). */
 const handlePageChange = (target: number) => {
 setPageNo(target);
 void fetchList(target, searchWrd);
 };

 /** [P1-9] native confirm → useConfirm. 본문에 대상 주소록 명칭을 노출한다. */
 const handleDelete = async (item: AddressBook) => {
 const ok = await confirm({
   title: '주소록 삭제',
   message: `'${item.adbkNm}' 주소록을 삭제합니다. 삭제 후에는 목록에서 조회할 수 없습니다.`,
   confirmText: '삭제',
   variant: 'destructive',
 });
 if (!ok) return;

 try {
 await addressbookUserService.deleteAddressBook(item.adbkId);
 toast('주소록이 삭제되었습니다.', 'success');
 void fetchList(pageNo, searchWrd);
 } catch {
 toast('삭제에 실패했습니다.', 'error');
 }
 };

 const columns: Column<AddressBook>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-muted-foreground">
 {index !== undefined ? (index + 1 + (pageNo - 1) * PAGE_UNIT).toString().padStart(2, '0') : '-'}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 header: '주소록 명칭',
 accessor: (item) => (
 <Link href={`/admin/collaboration/address-book/select-address-book-detail/${item.adbkId}`} className="group/item">
 <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
 {item.adbkNm}
 </span>
 </Link>
 )
 },
 {
 // 목록 응답(AddressBookDto)에는 연락처·이메일이 존재하지 않는다(구성원은 상세 조회에서만 내려온다).
 // 항상 비어 있던 두 열을 제거하고 실제로 내려오는 값만 노출한다.
 header: '공개 범위',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.rlsScopeCd || '-'}</span>
 ),
 className: 'w-32'
 },
 {
 header: '등록일자',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-widest">
 {(item.crtDt || '').substring(0, 10).replace(/-/g, '.')}
 </span>
 ),
 className: 'w-32 text-center'
 },
 {
 header: '관리',
 accessor: (item) => (
 <div className="flex items-center justify-end pr-4">
 <Button
 variant="ghost"
 size="icon"
 aria-label={`${item.adbkNm} 주소록 삭제`}
 onClick={() => { void handleDelete(item); }}
 className="h-10 w-10 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-all"
 >
 <Trash2 size={16} />
 </Button>
 </div>
 ),
 className: 'w-24 text-right'
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="통합 주소록 관리"
 breadcrumbs={[{ label: '협업관리' }, { label: '주소록' }]}
 />

 <HubHeader
 title="Contact"
 highlight="Directory"
 subtitle="부서 및 외부 협업을 위한 통합 주소록 센터입니다."
 icon={UserCircle}
 actions={
 <div className="flex gap-4">
 <Button
 variant="outline"
 aria-label="주소록 목록 새로고침"
 onClick={() => { void fetchList(pageNo, searchWrd); }}
 className="h-11 w-14 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
 >
 <RefreshCcw size={20} />
 </Button>
 <Link href="/admin/collaboration/address-book/insert-address-book">
 <Button className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
 <Plus size={20} /> 주소록 등록
 </Button>
 </Link>
 </div>
 }
 />

 <HubMetricGrid className="lg:grid-cols-2">
 <HubMetricCard
   title="전체 주소록"
   value={fetchError ? '조회 실패' : totalCount}
   icon={Layers}
   color="primary"
   status="총 건수"
 />
 <HubMetricCard
   title="현재 페이지 표시"
   value={list.length}
   icon={UserCircle}
   color="emerald"
   status={`${pageNo} / ${Math.max(totalPages, 1)} 페이지`}
 />
 </HubMetricGrid>

 <HubSectionCard
 title="주소록 목록"
 description="조직 내외의 통합 연락처 목록입니다."
 icon={UserCircle}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 pt-2 border-b border-border/50 pb-10 mb-8">
 <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
 <Input
 aria-label="주소록 검색"
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 placeholder="주소록 명칭으로 검색.."
 />
 <Button type="submit" className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-xl hover:bg-primary transition-all">검색</Button>
 </form>
 {/* [P1-6] 동작하는 CSV 내보내기 컴포넌트를 재사용한다(현재 페이지 기준). */}
 <DataExportExcel
   data={list}
   headers={[
     { label: '주소록 ID', key: 'adbkId' },
     { label: '주소록 명칭', key: 'adbkNm' },
     { label: '공개 범위', key: 'rlsScopeCd' },
     { label: '등록일자', key: 'crtDt' },
   ]}
   filename="주소록"
   className="flex items-center gap-2 h-11 px-6 rounded-xl border-2 border-border text-xs font-bold text-muted-foreground hover:text-primary transition-all shrink-0"
 />
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable<AddressBook>
 columns={columns}
 data={list}
 keyField="adbkId"
 loading={loading}
 error={fetchError}
 onRetry={() => { void fetchList(pageNo, searchWrd); }}
 emptyMessage="등록된 주소록이 없습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 pagination={{
 currentPage: pageNo,
 totalPages: totalPages,
 onPageChange: handlePageChange,
 totalCount,
 pageSize: PAGE_UNIT
 }}
 />
 </div>
 </div>
 </HubSectionCard>
 </div>
 );
}
