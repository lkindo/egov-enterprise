'use client';

import React, { use,  useState } from 'react';
import Link from 'next/link';
import { addressbookUserService, AddressBook } from '@/services/business/user/addressbook/AddressbookUserService';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search,  Plus,  Trash2,  UserCircle,  Layers,  Zap,  RefreshCcw,  Activity } from "lucide-react";
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

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
 toast.error('삭제에 실패했습니다.');
 }
 };

 const columns: Column<AddressBook>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-muted-foreground">
 {index !== undefined ? (index + 1 + (pageNo - 1) * 10).toString().padStart(2, '0') : '-'}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 header: '성명',
 accessor: (item) => (
 <Link href={`/admin/collaboration/address-book/select-address-book-detail/${item.adbkId}`} className="group/item">
 <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
 {item.adbkNm}
 </span>
 </Link>
 )
 },
 {
 header: '연락처',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{item.telNo || '-'}</span>
 ),
 className: 'w-40'
 },
 {
 header: '이메일',
 accessor: (item) => (
 <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.email}</span>
 )
 },
 {
 header: '등록일자',
 accessor: (item) => (
 <span className="text-xs font-bold text-slate-300 tabular-nums tracking-widest uppercase">
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
 onClick={() => handleDelete(item.adbkId)}
 className="h-10 w-10 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-all"
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
 onClick={() => fetchList(pageNo, searchWrd)}
 className="h-11 w-14 rounded-xl bg-white border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
 >
 <RefreshCcw size={20} />
 </Button>
 <Link href="/admin/collaboration/address-book/insert-address-book">
 <Button className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
 <Plus size={20} /> 연락처 등록
 </Button>
 </Link>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="전체 연락처" value={totalCount} icon={Layers} color="primary" />
 <HubMetricCard title="활성 노드" value={list.length} icon={Zap} color="amber" />
 <HubMetricCard title="데이터 무결성" value="정상" icon={Activity} color="emerald" />
 <HubMetricCard title="보안 등급" value="SECURED" icon={RefreshCcw} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard 
 title="주소록 매트릭스" 
 description="조직 내외의 통합 연락처 핵심 데이터 스트림입니다." 
 icon={UserCircle}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
 <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
 <Input 
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
 placeholder="성명, 전화번호, 소속 등으로 검색.." 
 />
 <Button type="submit" className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">SEARCH</Button>
 </form>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={list}
 loading={loading}
 emptyMessage="등록된 연락처 정보가 없습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 pagination={{
 currentPage: pageNo,
 totalPages: totalPages,
 onPageChange: (p) => setPageNo(p)
 }}
 />
 </div>
 </div>
 </HubSectionCard>
 </div>
 );
}
