'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 RefreshCcw,
 Inbox,
 Bookmark,
 Search,
 Plus,
 Zap,
 Share2,
 Activity,
 MoreVertical
} from 'lucide-react';
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { noteService } from '@/services/business/user/NoteService';
import { scrapService } from '@/services/business/user/ScrapService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

type CollaborationTab = 'MESSAGES' | 'SCRAPS';

export default function CollaborationHubClient({ defaultTab = 'MESSAGES' }: any) {
 const router = useRouter();
 const queryClient = useQueryClient();
 const [activeTab, setActiveTab] = useState<CollaborationTab>(defaultTab);
 const [searchKeyword, setSearchKeyword] = useState('');

 React.useEffect(() => {
   if (defaultTab) {
     setActiveTab(defaultTab);
   }
 }, [defaultTab]);

 // --- Data Fetching ---
 const { data: noteData, isLoading: notesLoading } = useQuery({
 queryKey: ['collab-notes', activeTab, searchKeyword],
 queryFn: () => noteService.getReceivedNotes({ page: 0, size: 50 }),
 enabled: activeTab === 'MESSAGES'
 });
 const notes = (noteData as any)?.list || [];

 const { data: scrapData, isLoading: scrapsLoading } = useQuery({
 queryKey: ['collab-scraps', activeTab, searchKeyword],
 queryFn: () => scrapService.getMyScraps({ page: 0, size: 50 }),
 enabled: activeTab === 'SCRAPS'
 });
 const scraps = (scrapData as any)?.list || [];

 const isLoading =
    (activeTab === 'MESSAGES' && notesLoading) ||
    (activeTab === 'SCRAPS' && scrapsLoading);

 const messageColumns: Column<any>[] = [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{(index! + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
 },
 {
 header: '쪽지 제목',
 accessor: (item) => (
 <div className="flex flex-col gap-1 py-1">
 <div className="flex items-center gap-2">
 {item.openYn === 'N' && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
 <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.noteSj}</span>
 </div>
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">ID: {item.noteId}</span>
 </div>
 )
 },
 {
 header: '발신자',
 accessor: (item) => <span className="text-xs font-bold text-muted-foreground tracking-tight">{item.trnsmiterNm || item.dsptchUserId}</span>,
 className: 'w-32'
 },
 {
 header: '발신일시',
 accessor: (item) => <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{item.crtDt?.substring(0, 16)}</span>,
 className: 'w-48'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-muted">
 <MoreVertical size={16} className="text-muted-foreground" />
 </Button>
 </div>
 ),
 className: 'w-20 text-right'
 }
 ];

 const scrapColumns: Column<any>[] = [
 {
 header: '번호',
 accessor: (_, index) => <span className="font-mono text-xs font-bold text-muted-foreground">{(index! + 1).toString().padStart(2, '0')}</span>,
 className: 'w-20 text-center'
 },
 {
 header: '스크랩 제목',
 accessor: (item) => <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">{item.scrapNm}</span>
 },
 {
 header: '등록일자',
 accessor: (item) => <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">{item.crtDt?.substring(0, 10)}</span>,
 className: 'w-48'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-muted">
 <MoreVertical size={16} className="text-muted-foreground" />
 </Button>
 </div>
 ),
 className: 'w-20 text-right'
 }
 ];

 const headerAction = useMemo(() => {
    return (
      <Button onClick={() => router.push('/admin/collaboration/mail-send')} className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl gap-2">
        <Plus size={18} /> 신규 전송
      </Button>
    );
  }, [router]);

 return (
 <TooltipProvider delayDuration={0}>
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
 <div className="flex gap-4 items-center">
 <div className="flex bg-muted p-1 rounded-xl border border-border/50">
 <Button
 variant="ghost"
 size="sm"
 className={cn("h-8 rounded-lg px-4 text-[10px] font-black uppercase transition-all", activeTab === 'MESSAGES' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
 onClick={() => { setActiveTab('MESSAGES'); setSearchKeyword(''); }}
 >
 MESSAGES
 </Button>
 <Button
 variant="ghost"
 size="sm"
 className={cn("h-8 rounded-lg px-4 text-[10px] font-black uppercase transition-all", activeTab === 'SCRAPS' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}
 onClick={() => { setActiveTab('SCRAPS'); setSearchKeyword(''); }}
 >
 SCRAPS
 </Button>
 </div>
 {headerAction}
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="메시지 노드" value={notes.length} icon={Inbox} color="primary" />
 <HubMetricCard title="지식 노드" value={scraps.length} icon={Bookmark} color="amber" />
 <HubMetricCard title="데이터 상태" value="Normal" icon={Activity} color="indigo" />
 </HubMetricGrid>

 <HubSectionCard 
 title={activeTab === 'MESSAGES' ? "메시지 스트림 매트릭스" : "지식 스크랩 아카이브"}
 description="조직 내에서 발생하는 실시간 협업 데이터 스트림 및 자산 명세입니다." 
 icon={Zap}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
 <div className="relative group max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} />
 <Input 
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
 placeholder="검색어를 입력하십시오.." 
 />
 </div>
 <Button variant="outline" onClick={() => queryClient.invalidateQueries()} className="h-11 px-6 rounded-xl border-2 border-border text-muted-foreground hover:text-primary transition-all">
 <RefreshCcw size={20} />
 </Button>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={activeTab === 'MESSAGES' ? messageColumns : scrapColumns}
 data={activeTab === 'MESSAGES' ? notes : scraps}
 loading={isLoading}
 emptyMessage="식별된 협업 데이터 유닛이 없습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 />
 </div>
 </div>
 </HubSectionCard>
 </div>
 </TooltipProvider>
 );
}
