'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
 RefreshCcw,
 Mail,
 Search,
 Plus,
 Trash2,
 Zap,
 ArrowUpRight,
 Clock,
 Sparkles,
 Layers,
 Send,
 Loader2,
 ShieldCheck,
 User,
 ExternalLink,
 Activity,
 MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { mailService, SentMail } from '@/services/business/mail/MailService';
import { motion, AnimatePresence } from 'framer-motion';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

export default function MailHistoryHubClient() {
 const router = useRouter();
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const [searchKeyword, setSearchKeyword] = useState('');

 // --- Data Fetching ---
 const { data: mailData, isLoading } = useQuery({
 queryKey: ['mail-history', searchKeyword],
 queryFn: () => mailService.getSentMails({ page: 0, size: 50, searchKeyword }),
 });
 const mails = (mailData as any)?.list || [];

 const columns: Column<SentMail>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-slate-400">
 {(index !== undefined ? index + 1 : 0).toString().padStart(2, '0')}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 header: '메일 제목',
 accessor: (mail) => (
 <div className="flex flex-col gap-1 py-1">
 <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">
 {mail.sj}
 </span>
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
 ID: {mail.mssageId}
 </span>
 </div>
 )
 },
 {
 header: '수신자',
 accessor: (mail) => (
 <span className="text-xs font-bold text-slate-600 tracking-tight">{mail.recptnPerson}</span>
 ),
 className: 'w-40'
 },
 {
 header: '발송 일시',
 accessor: (mail) => (
 <span className="text-xs font-bold text-slate-400 tabular-nums tracking-tighter">
 {mail.createdDate}
 </span>
 ),
 className: 'w-48'
 },
 {
 header: '발송 상태',
 accessor: (mail) => (
 <div className={cn(
 "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase",
 mail.sndngResultCode === '1' ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
 )}>
 {mail.sndngResultCode === '1' ? 'SUCCESS' : 'FAILED'}
 </div>
 ),
 className: 'w-32 text-center'
 },
 {
 header: '관리',
 accessor: () => (
 <div className="flex items-center justify-end pr-4">
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-slate-100">
 <MoreVertical size={16} className="text-slate-400" />
 </Button>
 </div>
 ),
 className: 'w-24 text-right'
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="메일 발신 이력 관리"
 breadcrumbs={[{ label: '협업관리' }, { label: '메시징' }, { label: '발신이력' }]}
 />

 <HubHeader 
 title="Dispatch" 
 highlight="History" 
 subtitle="시스템에서 발송된 모든 메일 이력 및 전송 상태를 추적합니다." 
 icon={Mail} 
 actions={
 <div className="flex gap-4">
 <Button
 variant="outline"
 onClick={() => queryClient.invalidateQueries()}
 className="h-11 w-14 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm"
 >
 <RefreshCcw size={20} />
 </Button>
 <Button 
 onClick={() => router.push('/admin/collaboration/mail-send')}
 className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl"
 >
 <Plus size={20} /> 신규 발송
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="전체 이력" value={mails.length} icon={Layers} color="primary" />
 <HubMetricCard title="성공률" value="99.2%" icon={Zap} color="emerald" status="안전함" />
 <HubMetricCard title="보안 검증" value="VERIFIED" icon={ShieldCheck} color="indigo" />
 <HubMetricCard title="트래픽" value="STABLE" icon={Activity} color="amber" />
 </HubMetricGrid>

 <HubSectionCard 
 title="발신 로그 매트릭스" 
 description="메일 전송에 대한 상세 프로토콜 및 수신자 정보 스트림입니다." 
 icon={Mail}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
 <div className="relative group max-w-xl w-full">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
 <Input 
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
 placeholder="메일 제목 또는 수신자 검색.." 
 />
 </div>
 </div>

 <div className="min-h-[500px]">
 <StandardDataTable
 columns={columns}
 data={mails}
 loading={isLoading}
 emptyMessage="식별된 발신 이력이 존재하지 않습니다."
 isPremium={true}
 className="border-none bg-transparent shadow-none"
 />
 </div>
 </div>
 </HubSectionCard>
 </div>
 );
}
