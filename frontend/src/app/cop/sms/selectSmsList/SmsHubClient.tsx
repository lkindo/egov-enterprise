'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Search, 
  RefreshCcw, 
  Send, 
  Phone, 
  Calendar,
  Clock,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowUpRight,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { smsAdminService, SmsDto } from '@/services/foundation/operation/SmsAdminService';
import { useToast } from '@/app/components/ui/toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function SmsHubClient({ 
  initialData 
}: { 
  initialData: any 
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [newSms, setNewSms] = useState<SmsDto>({
    trnsmitTelno: '010-1234-5678',
    recptnTelno: '',
    trnsmitCn: '',
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['sms-list', searchKeyword, page],
    queryFn: () => smsAdminService.getSmsList({ page, searchKeyword }),
    initialData: (page === 1 && !searchKeyword) ? initialData : undefined
  });

  const sendMutation = useMutation({
    mutationFn: (sms: SmsDto) => {
      // 백엔드 DTO에 정의되지 않은 recptnTelno 필드를 제거하고 recipients로 변환
      const { recptnTelno, ...rest } = sms;
      const payload = {
        ...rest,
        recipients: recptnTelno ? [{ recptnTelno }] : (sms.recipients || [])
      };
      return smsAdminService.sendSms(payload as any);
    },
    onSuccess: () => {
      toast('SMS가 성공적으로 전송되었습니다.', 'success');
      setIsDialogOpen(false);
      setNewSms({ ...newSms, recptnTelno: '', trnsmitCn: '' });
      queryClient.invalidateQueries({ queryKey: ['sms-list'] });
    },
    onError: (err: any) => {
      toast(err.message || 'SMS 전송에 실패했습니다.', 'error');
    }
  });

  const smsList = useMemo(() => {
    return (data?.list || []) as SmsDto[];
  }, [data]);

  const columns: Column<SmsDto>[] = [
    {
      header: 'ID',
      accessor: (item) => (
        <span className="text-[10px] font-black font-mono text-slate-400 tracking-tighter">
          #{item.smsId?.substring(0, 8).toUpperCase()}
        </span>
      )
    },
    {
      header: 'RECIPIENT',
      accessor: (item) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[var(--radius-hub-item)] bg-slate-900 flex items-center justify-center text-primary shadow-lg group-hover:scale-110 transition-transform">
            <Phone size={16} />
          </div>
          <span className="text-sm font-black text-slate-900 tracking-tighter font-mono italic">
            {item.recptnTelno}
          </span>
        </div>
      )
    },
    {
      header: 'MESSAGE_CONTENT',
      accessor: (item) => (
        <p className="text-sm text-muted-foreground font-bold line-clamp-1 italic max-w-md group-hover:text-slate-900 transition-colors">
          {item.trnsmitCn}
        </p>
      )
    },
    {
      header: 'TIMESTAMP',
      accessor: (item) => (
        <div className="flex items-center gap-3 text-muted-foreground/40 font-bold text-[10px] font-mono tracking-widest uppercase">
          <Clock size={14} /> {item.createdDate || item.trnsmitPnttm || '-'}
        </div>
      )
    },
    {
      header: 'STATUS',
      accessor: () => (
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[9px] font-black tracking-widest uppercase">
          <CheckCircle2 size={12} /> DELIVERED
        </div>
      )
    }
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-[var(--gap-hub-section)] pb-24 animate-in fade-in duration-1000">
        <PageHeader
          title="커뮤니케이션 매트릭스"
          breadcrumbs={[{ label: '운영 관리' }, { label: 'SMS 서비스' }]}
        />

        <HubHeader
          title="Communication"
          highlight="Pulse"
          subtitle="전사 메시징 프로토콜 및 발송 로그 실시간 아카이브"
          icon={MessageSquare}
          actions={
            <div className="flex gap-4 p-2 items-center">
               <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="h-14 px-10 rounded-[var(--radius-hub-item)] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
                  >
                    <Plus size={20} />
                    신규 문자 발송
                    <Zap size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:scale-125" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl bg-white border-none shadow-[0_0_100px_rgba(0,0,0,0.1)] p-0 overflow-hidden rounded-2xl">
                    <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12 scale-150">
                            <Send size={150} />
                        </div>
                        <div className="relative z-10 space-y-2">
                            <span className="text-[10px] font-black text-primary tracking-[0.4em] uppercase font-mono italic">Protocol_Transmission</span>
                            <DialogHeader>
                                <DialogTitle className="text-3xl font-black tracking-tighter uppercase font-mono italic flex items-center gap-4 text-white">
                                    <MessageSquare className="text-primary" /> Send_Message
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 text-xs font-bold italic mt-2">
                                    새로운 문자 메시지를 발송하기 위한 파라미터를 입력하십시오.
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                    </div>
                    <div className="p-10 space-y-10">
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase font-mono italic">Recipient_Phone_Number</Label>
                                <div className="relative group">
                                    <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                                    <Input
                                        placeholder="010-0000-0000"
                                        className="pl-16 h-16 bg-slate-50 border-2 border-slate-100 rounded-[var(--radius-hub-item)] text-lg font-black tracking-widest focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-200 font-mono italic"
                                        value={newSms.recptnTelno}
                                        onChange={(e) => setNewSms({ ...newSms, recptnTelno: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase font-mono italic">Message_Content_Payload</Label>
                                <div className="relative group">
                                    <Textarea
                                        placeholder="전달할 메시지 내용을 입력하세요..."
                                        className="min-h-[200px] p-8 bg-slate-50 border-2 border-slate-100 rounded-[var(--radius-hub-item)] text-lg font-black tracking-tighter focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-200 leading-relaxed font-mono italic"
                                        value={newSms.trnsmitCn}
                                        onChange={(e) => setNewSms({ ...newSms, trnsmitCn: e.target.value })}
                                    />
                                    <div className="absolute bottom-6 right-6 px-4 py-2 bg-slate-900/5 rounded-lg text-[10px] font-black text-slate-400 tracking-widest uppercase font-mono italic">
                                        {newSms.trnsmitCn.length} / 80 BYTES
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4 border-t border-slate-100">
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsDialogOpen(false)}
                                className="h-16 px-10 rounded-[var(--radius-hub-item)] font-black text-[11px] tracking-widest uppercase font-mono italic hover:bg-slate-50"
                            >
                                ABORT_OPERATION
                            </Button>
                            <Button 
                                disabled={sendMutation.isPending}
                                onClick={() => sendMutation.mutate(newSms)}
                                className="flex-1 h-16 rounded-[var(--radius-hub-item)] bg-slate-900 text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all gap-4 group"
                            >
                                {sendMutation.isPending ? 'PROCESSING...' : (
                                    <>
                                        EXECUTE_TRANSMISSION
                                        <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
              </Dialog>
            </div>
          }
        />

        <div className="grid grid-cols-12 gap-[var(--gap-hub-section)]">
          {/* Left Metrics */}
          <div className="col-span-12 lg:col-span-3 space-y-8">
            <div className="hub-glass-premium rounded-[var(--radius-hub-section)] p-8 space-y-8 border-2 border-slate-100/50 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                <Zap size={120} className="text-primary" />
              </div>
              <div className="relative z-10 space-y-2">
                <span className="text-[10px] font-black text-primary tracking-[0.4em] uppercase font-mono italic">Traffic_Analysis</span>
                <h4 className="text-3xl font-black tracking-tighter text-slate-900 uppercase font-mono italic">Channel<br />Throughput</h4>
              </div>
              <div className="space-y-6 relative z-10">
                <MetricItem label="Total Packets" value={data?.total || 0} />
                <MetricItem label="Success Ratio" value="99.8%" />
                <MetricItem label="Latency Index" value="240ms" />
              </div>
            </div>

            <div className="rounded-[var(--radius-hub-section)] bg-slate-900 p-8 text-white space-y-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
                <h5 className="text-[10px] font-black text-primary tracking-[0.4em] uppercase font-mono italic">Security_Audit</h5>
                <p className="text-xs font-bold text-white/60 leading-relaxed italic">
                    모든 메시지 전송은 정보통신망법에 의거하여 로깅 및 감사가 수행됩니다.
                </p>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-[var(--radius-hub-item)] border border-white/5">
                    <ShieldCheck size={18} className="text-primary" />
                    <span className="text-[9px] font-black tracking-widest uppercase font-mono">TLS_ENCRYPTED_NODE</span>
                </div>
            </div>
          </div>

          {/* Main List Area */}
          <div className="col-span-12 lg:col-span-9">
            <HubSectionCard
              title="Transmission Log"
              description="시스템에서 처리된 모든 아웃바운드 메시지 엔티티의 시퀀스입니다"
              icon={Clock}
            >
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-[var(--gap-hub-widget)] px-2 pt-2 border-b border-slate-100 pb-8">
                  <div className="relative w-full sm:w-96 group/search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                    <Input
                      className="pl-16 h-16 bg-slate-50/50 border-none rounded-[var(--radius-hub-item)] text-[11px] font-black tracking-widest shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-500 uppercase font-mono italic"
                      placeholder="Search packets..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => refetch()}
                        className="h-12 rounded-[var(--radius-hub-item)] px-6 text-[10px] font-black tracking-widest gap-3 hover:bg-slate-900 hover:text-white bg-slate-50 border border-slate-100 transition-all uppercase group shadow-sm font-mono italic"
                      >
                        <RefreshCcw size={16} className={cn("text-primary group-hover:text-white transition-colors", isLoading ? "animate-spin" : "group-hover:rotate-180")} /> 
                        SYNCHRONIZE
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-slate-900 text-white border-none rounded-[var(--radius-hub-item)] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                      실시간 데이터 동기화
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={page + searchKeyword}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.5 }}
                    >
                      <StandardDataTable<SmsDto>
                        columns={columns}
                        data={smsList}
                        loading={isLoading}
                        error={error as Error | null}
                        onRetry={() => refetch()}
                        keyField="smsId"
                        emptyMessage="검색된 메시지 발송 내역이 존재하지 않습니다."
                        isPremium={true}
                        className="border-none shadow-none bg-transparent"
                        pagination={{
                          currentPage: page,
                          totalPages: data?.totalPage || 1,
                          onPageChange: (p) => setPage(p)
                        }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </HubSectionCard>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function MetricItem({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase font-mono italic">{label}</span>
      <span className="text-xl font-black text-slate-900 tabular-nums font-mono italic">{value}</span>
    </div>
  );
}
