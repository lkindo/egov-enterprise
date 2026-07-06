'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCcw, 
 Mail, 
 Search, 
 Plus, 
 Trash2, 
 Zap, 
 ArrowUpRight, 
 Clock, 
 Layers, 
 ShieldCheck, 
 User, 
 ExternalLink, 
 Activity, 
 MoreVertical } from 'lucide-react';
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
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // Debounce search keyword
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // --- Data Fetching ---
  const { data: mailData, isLoading } = useQuery({
    queryKey: ['mail-history', debouncedKeyword],
    queryFn: () => mailService.getSentMails({ 
      page: 0, 
      size: 100, 
      searchKeyword: debouncedKeyword,
      searchCondition: '1' 
    }),
  });
  const mails = (mailData as any)?.list || [];
  // Debug logs removed to comply with zero-tolerance clean console requirement

  // --- Mutations ---
  const deleteMutation = useMutation({
    mutationFn: (id: string) => mailService.deleteMail(id),
    onSuccess: () => {
      toast('메일이 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['mail-history'] });
    },
    onError: () => {
      toast('메일 삭제에 실패했습니다.', 'error');
    }
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('정말 이 메일 이력을 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

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
 {mail.crtDt}
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
 accessor: (mail) => (
 <div className="flex items-center justify-end gap-2 pr-4">
 <Button 
   variant="ghost" 
   size="icon" 
   data-testid="delete-mail-btn"
   onClick={(e) => handleDelete(e, mail.mssageId)}
   className="w-10 h-10 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
 >
   <Trash2 size={16} />
 </Button>
 <Button variant="ghost" size="icon" className="w-10 h-10 rounded-lg hover:bg-slate-100">
 <MoreVertical size={16} className="text-slate-400" />
 </Button>
 </div>
 ),
 className: 'w-24 text-right'
 }
 ];

  const [selectedMail, setSelectedMail] = useState<SentMail | null>(null);

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

  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className={cn("transition-all duration-500", selectedMail ? "lg:col-span-5" : "lg:col-span-12")}>
      <HubSectionCard 
      title="발신 로그 매트릭스" 
      description="메일 전송 상세 로그입니다." 
      icon={Mail}
      className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
      <div className="space-y-8">
      <form 
        onSubmit={(e) => { e.preventDefault(); setDebouncedKeyword(searchKeyword); }}
        className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8"
      >
        <div className="relative group max-w-xl w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
          <Input 
            aria-label="메일 검색"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
            placeholder="메일 제목 또는 수신자 검색.." 
          />
        </div>
        <Button 
          type="submit"
          variant="outline"
          className="ml-4 h-11 rounded-xl border-slate-200 text-slate-600 hover:text-primary font-bold px-6"
        >
          검색
        </Button>
      </form>

      <div className="min-h-[500px]">
      <StandardDataTable
      columns={columns}
      data={mails}
      loading={isLoading}
      onRowClick={(item) => setSelectedMail(item)}
      emptyMessage="식별된 발신 이력이 존재하지 않습니다."
      isPremium={true}
      rowTestId="mail-item"
      className="border-none bg-transparent shadow-none"
      />
      </div>
      </div>
      </HubSectionCard>
    </div>

    <div className="lg:col-span-7">
      <AnimatePresence mode="wait">
        {selectedMail ? (
          <motion.div 
            key="detail-active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="h-full"
          >
            <HubSectionCard
              title="Mail Intelligence"
              description="선택된 메시지의 전송 프로토콜 및 수신자 명세입니다."
              icon={Zap}
              className="bg-slate-900 text-white border-none shadow-2xl h-full sticky top-8"
            >
              <div className="space-y-10">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">Protocol_Details</span>
                    <h3 className="text-2xl font-bold tracking-tighter text-white">{selectedMail.sj}</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedMail(null)}
                    className="text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <ArrowUpRight size={20} />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-white/40">
                      <User size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Recipient</span>
                    </div>
                    <p className="text-sm font-bold text-white">{selectedMail.recptnPerson}</p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-white/40">
                      <Clock size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Timestamp</span>
                    </div>
                    <p className="text-sm font-bold text-white">{selectedMail.crtDt}</p>
                  </div>
                </div>

                <div className="p-8 bg-white/5 rounded-2xl border border-white/10 space-y-6">
                  <div className="flex items-center gap-3">
                    <Layers className="text-primary" size={18} />
                    <span className="text-xs font-bold text-white/40 tracking-tight uppercase">Message_Payload</span>
                  </div>
                  <div className="text-sm text-white/70 leading-relaxed font-medium">
                    시스템 아키텍처에 의해 암호화된 메시지 본문입니다. <br />
                    전송 상태: {selectedMail.sndngResultCode === '1' ? 'SUCCESS_AUTHORIZED' : 'FAILURE_REJECTED'}
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white hover:text-slate-900 font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    <ExternalLink size={16} className="mr-2" /> View Full
                  </Button>
                  <Button 
                    variant="destructive"
                    data-testid="delete-mail-btn"
                    onClick={(e) => handleDelete(e, selectedMail.mssageId)}
                    className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-xl"
                  >
                    <Trash2 size={16} className="mr-2" /> Delete Node
                  </Button>
                </div>
              </div>
            </HubSectionCard>
          </motion.div>
        ) : (
          <motion.div 
            key="detail-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center p-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-white rounded-2xl shadow-xl flex items-center justify-center text-slate-300">
              <Mail size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Select Dispatch Node</h3>
              <p className="text-sm text-slate-500 font-medium max-w-[280px]">
                상세 정보를 확인하거나 관리할 메일 이력 항목을 왼쪽 리스트에서 선택하십시오.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  </div>
  );
}
