'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { smsAdminService, SmsDto } from '@/services/admin/operation/SmsAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import {
  MessageSquare,
  Send,
  Search,
  RefreshCcw,
  Plus,
  History,
  Phone,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  TrendingUp,
  Mail,
  Zap,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmsAdminClient({ 
  initialSmsList 
}: { 
  initialSmsList: any 
}) {
  const [loading, setLoading] = useState(false);
  const [smsList, setSmsList] = useState(initialSmsList.list || []);
  const [totalCount, setTotalCount] = useState(initialSmsList.pagination.totalItems || 0);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Send SMS State
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState({
    trnsmitTelno: '02-1234-5678', // 발신번호 (기본값)
    recptnTelno: '',
    trnsmitCn: ''
  });

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await smsAdminService.getSmsList({ searchKeyword });
      setSmsList(res.list);
      setTotalCount(res.pagination.totalItems);
    } catch (error) {
      toast.error('발송 내역을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!sendForm.recptnTelno || !sendForm.trnsmitCn) {
      toast.error('수신번호와 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await smsAdminService.sendSms(sendForm);
      toast.success('문자 메시지를 발송했습니다.');
      setIsSendOpen(false);
      handleSearch(); // 목록 갱신
    } catch (error) {
      toast.error('발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: '발송 타임스탬프',
      accessor: (item: SmsDto) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-muted/30 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-border/50 shadow-inner">
            <Calendar size={16} />
          </div>
          <div className="flex flex-col">
            <span className="font-mono font-black text-foreground tracking-tighter leading-none">
              {item.trnsmitPnttm ? format(new Date(item.trnsmitPnttm), 'yyyy.MM.dd') : 'N/A'}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground mt-1 tracking-widest opacity-40">
              {item.trnsmitPnttm ? format(new Date(item.trnsmitPnttm), 'HH:mm:ss') : 'WAITING'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: '엔드포인트 (발신)',
      accessor: (item: SmsDto) => (
        <div className="flex items-center gap-3">
          <Phone size={14} className="text-primary opacity-50" />
          <span className="font-black text-foreground tracking-tighter">{item.trnsmitTelno}</span>
        </div>
      )
    },
    {
      header: '페이로드 (내용)',
      accessor: (item: SmsDto) => (
        <div className="max-w-[450px] truncate font-bold text-muted-foreground/80 lowercase tracking-tight italic">
          "{item.trnsmitCn}"
        </div>
      )
    },
    {
      header: '트랜잭션 상태',
      accessor: () => (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 w-fit shadow-sm">
          <ShieldCheck size={14} />
          <span className="text-[9px] font-black tracking-widest uppercase ">Delivered</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="메시지 오케스트레이션"
        breadcrumbs={[{ label: '부가서비스' }, { label: '문자메시지 엔진' }]}
      />

      <HubHeader 
        title="SMS 트랜잭션" 
        highlight="매트릭스" 
        subtitle="시스템 자동 알림 및 보안 인증 문자 메시지 전송 아카이브 관리" 
        icon={Send} 
        actions={
          <div className="flex gap-4 p-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSearch}
              className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2"
            >
              <RefreshCcw size={16} className={cn(loading && "animate-spin")} /> 로그 동기화
            </Button>
            <Button
              size="lg"
              onClick={() => setIsSendOpen(true)}
              className="h-12 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2"
            >
              <Plus size={18} /> 새 메시지 구성
            </Button>
          </div>
        }
      />

      {/* Luxury Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
        <SummaryBlock 
          title="ACCUMULATED LOGS" 
          value={totalCount.toLocaleString()} 
          icon={<History size={26} />} 
          status="STABLE"
          color="text-slate-900"
        />
        <SummaryBlock 
          title="DELIVERY SUCCESS" 
          value={totalCount.toLocaleString()} 
          icon={<Zap size={26} />} 
          status="NOMINAL"
          color="text-primary"
        />
        <SummaryBlock 
          title="FAILED ATTEMPTS" 
          value="0" 
          icon={<AlertCircle size={26} />} 
          status="CRITICAL"
          color="text-rose-500"
          bg="bg-rose-500/5 shadow-rose-500/5 border-rose-500/20"
        />
      </div>

      {/* Main Stream Area */}
      <HubSectionCard
        title="메시지 전송 스트림"
        description="시스템에서 처리된 모든 아웃바운드 메시지 트래픽의 실시간 이력입니다."
        icon={MessageSquare}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div>
            <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Transmission Log</h3>
            <p className="text-[9px] font-bold text-muted-foreground tracking-[0.3em] uppercase mt-2 opacity-50">Global Output Monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group/search flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
              <Input
                placeholder="PROCURING TARGET..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-14 pl-12 pr-6 w-full md:w-[320px] bg-muted/30 border-none rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <StandardDataTable
            columns={columns}
            data={smsList}
            loading={loading}
            emptyMessage="기록된 메시지 전송 로직이 없습니다."
            className="border-none bg-transparent"
          />
        </div>
      </HubSectionCard>

      {/* Send Message Composition Dialog */}
      <Dialog open={isSendOpen} onOpenChange={setIsSendOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[3.5rem] p-12 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-3xl overflow-hidden relative">
          {/* Background Decorative Element */}
          <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
          
          <DialogHeader className="space-y-6 relative z-10">
            <div className="w-20 h-20 bg-primary dark:bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-primary/30 mx-auto transition-transform hover:rotate-12 duration-500 border-4 border-white/20">
              <Send size={32} />
            </div>
            <div className="text-center space-y-2">
              <DialogTitle className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">Compose Stream</DialogTitle>
              <DialogDescription className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">
                Outbound Message Configuration
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="space-y-10 py-10 relative z-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2 flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Target Terminal Number
              </label>
              <div className="relative group">
                <Smartphone className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={20} />
                <Input
                  placeholder="010-0000-0000"
                  value={sendForm.recptnTelno}
                  onChange={(e) => setSendForm(prev => ({ ...prev, recptnTelno: e.target.value }))}
                  className="h-18 pl-16 pr-8 rounded-3xl border-none bg-slate-50 text-xl font-black tabular-nums focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase tracking-wider"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2 flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Payload Content
              </label>
              <div className="relative">
                <Textarea
                  placeholder="보안 메시지 내용을 구상하십시오..."
                  value={sendForm.trnsmitCn}
                  onChange={(e) => setSendForm(prev => ({ ...prev, trnsmitCn: e.target.value }))}
                  className="min-h-[180px] p-8 rounded-[2.5rem] border-none bg-slate-50 text-base font-bold outline-none focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all resize-none shadow-inner leading-relaxed"
                />
                <div className="absolute bottom-6 right-8 flex items-center gap-2">
                   <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, (sendForm.trnsmitCn.length / 80) * 100)}%` }} />
                   </div>
                   <span className="text-[9px] font-black text-slate-300 tracking-widest">{sendForm.trnsmitCn.length} / 80B</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="relative z-10 gap-4 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsSendOpen(false)}
              className="h-18 px-10 rounded-2xl border-2 border-slate-100 font-black text-[11px] tracking-widest uppercase hover:bg-slate-50 transition-all hover:border-slate-200"
            >
              Terminate
            </Button>
            <Button
              onClick={handleSend}
              disabled={loading}
              className="h-18 px-16 bg-slate-900 border-none text-white rounded-2xl font-black text-[11px] tracking-[0.3em] uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
            >
              {loading ? <RefreshCcw size={18} className="animate-spin" /> : <Zap size={18} />}
              Execute Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryBlock({ title, value, icon, status, color, bg }: any) {
  return (
    <div className={cn("hub-table-container p-12 group hover:scale-[1.02] transition-all relative overflow-hidden bg-white", bg)}>
      <div className="flex justify-between items-start mb-10">
        <div className={cn("w-14 h-14 rounded-[var(--radius-hub-widget)] bg-slate-50 dark:bg-muted/10 flex items-center justify-center shadow-inner border border-border/10 group-hover:rotate-12 transition-transform", color)}>
          {icon}
        </div>
        <HubStatusBadge label={`SYSTEM STATUS: ${status}`} variant="default" className="text-[8px] font-black tracking-widest shadow-sm" />
      </div>
      <div>
        <h3 className="text-4xl font-black tracking-tighter text-foreground leading-none tabular-nums">{value}</h3>
        <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase mt-4 leading-none">{title}</p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000 grayscale">
        {React.cloneElement(icon, { size: 180 })}
      </div>
    </div>
  );
}

const Smartphone = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);
