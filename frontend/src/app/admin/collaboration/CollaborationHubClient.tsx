'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 RefreshCcw,
 Mail,
 Inbox,
 Bookmark,
 Search,
 Plus,
 Trash2,
 Users,
 Zap,
 Share2,
 ChevronRight,
 ArrowUpRight,
 User,
 Clock,
 Phone,
 Globe,
 Star,
 Sparkles,
 Layers,
 Send,
 MessageSquare,
 Loader2,
 ShieldCheck,
 Activity,
 MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { noteService } from '@/services/business/user/NoteService';
import { scrapService } from '@/services/business/user/ScrapService';
import { addressbookUserService } from '@/services/business/user/addressbook/AddressbookUserService';
import { motion, AnimatePresence } from 'framer-motion';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

type CollaborationTab = 'MESSAGES' | 'ADDRESS_BOOK' | 'SCRAPS';

export default function CollaborationHubClient({ defaultTab = 'MESSAGES' }: any) {
 const router = useRouter();
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [activeTab, setActiveTab] = useState<CollaborationTab>(defaultTab);
 const [searchKeyword, setSearchKeyword] = useState('');

 // --- Data Fetching ---
 const { data: noteData, isLoading: notesLoading } = useQuery({
 queryKey: ['collab-notes', activeTab, searchKeyword],
 queryFn: () => noteService.getReceivedNotes({ page: 0, size: 50 }),
 enabled: activeTab === 'MESSAGES'
 });
 const notes = (noteData as any)?.list || [];

 const { data: addressData, isLoading: addressLoading } = useQuery({
 queryKey: ['collab-addressbook', searchKeyword],
 queryFn: () => addressbookUserService.getAddressBooks({ size: 50, searchWrd: searchKeyword }),
 enabled: activeTab === 'ADDRESS_BOOK'
 });
 const addresses = (addressData as any)?.list || [];

 const { data: scrapData, isLoading: scrapsLoading } = useQuery({
 queryKey: ['collab-scraps', activeTab, searchKeyword],
 queryFn: () => scrapService.getMyScraps({ page: 0, size: 50 }),
 enabled: activeTab === 'SCRAPS'
 });
 const scraps = (scrapData as any)?.list || [];

 const isLoading = notesLoading || addressLoading || scrapsLoading;

 const messageColumns: Column<any>[] = [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-slate-400">{(index! + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
 },
 {
 header: '쪽지 제목',
 accessor: (item) => (
 <div className="flex flex-col gap-1 py-1">
 <div className="flex items-center gap-2">
 {item.openYn === 'N' && <span className="w-1.5 h-1.5 rounded-lg bg-primary animate-pulse" />}
 <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">{item.noteSj}</span>
 </div>
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">ID: {item.noteId}</span>
 </div>
 )
 },
 {
 header: '발신자',
 accessor: (item) => <span className="text-xs font-bold text-slate-600 tracking-tight">{item.trnsmitterNm || item.trnsmitterId}</span>,
 className: 'w-32'
 },
 {
 header: '발신일시',
 accessor: (item) => <span className="text-xs font-bold text-slate-400 tabular-nums tracking-tighter">{item.sendDt?.substring(0, 16)}</span>,
 className: 'w-48'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-slate-100">
 <MoreVertical size={16} className="text-slate-400" />
 </Button>
 </div>
 ),
 className: 'w-20 text-right'
 }
 ];

 const addressColumns: Column<any>[] = [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-slate-400">{(index! + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
 },
 {
 header: '성명',
 accessor: (item) => <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">{item.adbkNm}</span>
 },
 {
 header: '이메일',
 accessor: (item) => <span className="text-xs font-bold text-slate-500 tracking-tight">{item.email || '-'}</span>,
 className: 'w-64'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-slate-100">
 <MoreVertical size={16} className="text-slate-400" />
 </Button>
 </div>
 ),
 className: 'w-20 text-right'
 }
 ];

 const scrapColumns: Column<any>[] = [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-slate-400">{(index! + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
 },
 {
 header: '스크랩 제목',
 accessor: (item) => <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">{item.scrapNm}</span>
 },
 {
 header: '등록일자',
 accessor: (item) => <span className="text-xs font-bold text-slate-400 tabular-nums tracking-tighter">{item.createdDate?.substring(0, 10)}</span>,
 className: 'w-48'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-slate-100">
 <MoreVertical size={16} className="text-slate-400" />
 </Button>
 </div>
 ),
 className: 'w-20 text-right'
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="협업 및 네트워크 허브"
 breadcrumbs={[{ label: '협업관리' }, { label: '커넥트매트릭스' }]}
 />

 <HubHeader 
 title="Connect" 
 highlight="Matrix" 
 subtitle="조직 내 원활한 소통과 정보 공유를 위한 통합 협업 공간입니다." 
 icon={Share2} 
 actions={
 <div className="flex gap-4">
 <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
 <Button
 variant="ghost"
 size="sm"
 className={cn("h-8 rounded-lg px-4 text-[10px] font-black uppercase transition-all", activeTab === 'MESSAGES' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
 onClick={() => { setActiveTab('MESSAGES'); setSearchKeyword(''); }}
 >
 MESSAGES
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className={cn("h-8 rounded-lg px-4 text-[10px] font-black uppercase transition-all", activeTab === 'ADDRESS_BOOK' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
 onClick={() => { setActiveTab('ADDRESS_BOOK'); setSearchKeyword(''); }}
 >
 CONTACTS
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className={cn("h-8 rounded-lg px-4 text-[10px] font-black uppercase transition-all", activeTab === 'SCRAPS' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
 onClick={() => { setActiveTab('SCRAPS'); setSearchKeyword(''); }}
 >
 SCRAPS
 </Button>
 </div>
 <Button onClick={() => router.push('/admin/collaboration/mail-send')} className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
 <Plus size={18} /> 신규 전송
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="메시지 노드" value={notes.length} icon={Inbox} color="primary" />
 <HubMetricCard title="인적 자산" value={addresses.length} icon={Users} color="emerald" />
 <HubMetricCard title="지식 노드" value={scraps.length} icon={Bookmark} color="amber" />
 <HubMetricCard title="데이터 상태" value="Normal" icon={Activity} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard 
 title={activeTab === 'MESSAGES' ? "메시지 스트림 매트릭스" : activeTab === 'ADDRESS_BOOK' ? "네트워크 인덱스" : "지식 스크랩 아카이브"}
 description="조직 내에서 발생하는 실시간 협업 데이터 스트림 및 자산 명세입니다." 
 icon={Zap}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
 <div className="relative group max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
 <Input 
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
 placeholder="검색어를 입력하십시오.." 
 />
 </div>
 <Button variant="outline" onClick={() => queryClient.invalidateQueries()} className="h-11 px-6 rounded-xl border-2 border-slate-100 text-slate-400 hover:text-primary transition-all">
 <RefreshCcw size={20} />
 </Button>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={activeTab === 'MESSAGES' ? messageColumns : activeTab === 'ADDRESS_BOOK' ? addressColumns : scrapColumns}
 data={activeTab === 'MESSAGES' ? notes : activeTab === 'ADDRESS_BOOK' ? addresses : scraps}
 loading={isLoading}
 emptyMessage="식별된 협업 데이터 유닛이 없습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 />
 </div>
 </div>
 </HubSectionCard>
 </div>
 );
}
