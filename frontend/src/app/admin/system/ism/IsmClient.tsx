'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ismAdminService, InfrmlSanctn } from '@/services/foundation/system/IsmAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Activity,
  Sparkles,
  Info,
  ArrowRightCircle,
  ShieldAlert,
  Terminal,
  Cpu,
  Fingerprint,
  User,
  Zap,
  Layers,
  SearchCode,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function IsmClient({ initialData }: { initialData: { content: InfrmlSanctn[] } }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [isModalOpen, setIsOpen] = useState(false);
  const [selectedSanctn, setSelectedSanctn] = useState<InfrmlSanctn | null>(null);
  const [returnResn, setReturnResn] = useState('');
  const [loading, setLoading] = useState(false);

  const ismList = initialData.content || [];

  const handleOpenConfirm = (sanctn: InfrmlSanctn) => {
    setSelectedSanctn(sanctn);
    setReturnResn('');
    setIsOpen(true);
  };

  const handleProcess = async (status: 'C' | 'R') => {
    if (!selectedSanctn) return;
    try {
      setLoading(true);
      await ismAdminService.confirmInfrmlSanctn(selectedSanctn.infrmlSanctnId, status, returnResn);
      toast(`결재 시퀀스가 ${status === 'C' ? '성공적으로 승인' : '반려'} 처리되었습니다.`, 'success');
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast('프로세스 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<InfrmlSanctn>[] = [
    {
      header: '도메인 및 아키텍처',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex items-center gap-5 py-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
                <Layers size={18} />
            </div>
            <div className="flex flex-col gap-1">
                <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black tracking-tight border border-slate-200 w-fit">
                    {item.jobSe || item.jobSeCode || 'STATIC_NODE'}
                </span>
                <span className="font-black tracking-tighter text-foreground text-md uppercase leading-tight mt-1">{item.sancltNm}</span>
            </div>
        </div>
      )
    },
    {
      header: '결재 아이덴티티',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                <Fingerprint size={16} />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-black text-foreground tracking-tight">{item.applcntId}</span>
                <span className="text-[9px] font-black text-muted-foreground/40 tracking-[0.3em] font-mono italic">ID: {item.infrmlSanctnId.slice(0, 8)}</span>
            </div>
        </div>
      ),
      className: 'w-56'
    },
    {
      header: '결재 대기 (PENDING)',
      accessor: (item: InfrmlSanctn) => {
          let status: '활성' | 'DISABLED' | 'INACTIVE' = 'INACTIVE';
          if (item.confmAt === 'Y') status = '활성';
          if (item.confmAt === 'R') status = 'DISABLED';
          
          return <HubStatusBadge status={status} labels={{ ACTIVE: '승인됨 (CONFIRMED)', DISABLED: '반려됨 (REJECTED)', INACTIVE: '결재 대기 (PENDING)' }} />;
      },
      className: 'w-48'
    },
    {
      header: '관리',
      className: 'text-right w-48',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex justify-end gap-3 pr-4">
          {(item.confmAt === 'N' || item.confmAt === 'A') && (
            <Button
              onClick={() => handleOpenConfirm(item)}
              className="h-10 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10 flex items-center gap-2 group"
            >
              <ShieldCheck size={16} className="group-hover:rotate-12 transition-transform" /> 승인 실행
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all opacity-40 hover:opacity-100"
            onClick={() => toast('아카이브 전용 모드입니다.', 'info')}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="인텔리전스 약식결재 거버넌스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '약식결재' }]}
      />

      <HubHeader 
        title="결재" 
        highlight="패브릭" 
        subtitle="규격화되지 않은 비정형 결재 요청의 유연한 검증 및 전사 의사결정 시퀀스 통합 관리" 
        icon={ShieldCheck} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <div className="px-6 py-3 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex items-center gap-4 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black text-emerald-700 tracking-widest uppercase">의사결정_허브: 온라인</span>
            </div>
            <Button
                variant="ghost"
                onClick={() => router.refresh()}
                className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
            >
                <Activity size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="결재_대기_시퀀스" value={ismList.filter(i => i.confmAt === 'N' || i.confmAt === 'A').length} icon={Clock} color="amber" status="주의" />
        <HubMetricCard title="승인된_자산_수" value={ismList.filter(i => i.confmAt === 'Y').length} icon={CheckCircle2} color="emerald" status="최적" />
        <HubMetricCard title="반려_로그_수" value={ismList.filter(i => i.confmAt === 'R').length} icon={XCircle} color="rose" />
        <HubMetricCard title="전체_의사결정_수" value={ismList.length} icon={FileText} color="primary" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Intelligence Shield Panel */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <div className="rounded-[4rem] bg-slate-900 text-white p-12 shadow-2xl relative overflow-hidden group h-full border-none">
                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <Terminal size={240} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-12">
                    <div className="space-y-4">
                        <div className="w-20 h-20 rounded-[2rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                            <Cpu size={36} className="text-primary" />
                        </div>
                        <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase">불변<br />의결 원장</h4>
                    </div>
                    
                    <p className="text-sm text-slate-400 font-bold leading-relaxed italic border-l-4 border-primary pl-8">
                        모든 약식 결재 아키텍처는 데이터 무결성 검증을 거치며, 결정 근거는 분산 원장에 영구히 기록되어 감사가 가능합니다.
                    </p>

                    <div className="space-y-6 pt-12 border-t border-white/5">
                        <div className="flex items-center justify-between group/stat">
                            <span className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-primary transition-colors">로직_허브_무결성</span>
                            <span className="text-lg font-black font-mono tracking-tighter text-emerald-500">정상</span>
                        </div>
                        <div className="flex items-center justify-between group/stat">
                            <span className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-amber-500 transition-colors">보안_프로토콜</span>
                            <span className="text-lg font-black font-mono tracking-tighter">ENF_2.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Approval Inventory */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
            <HubSectionCard title="약식 결재 시퀀스 데이터 매트릭스" description="시스템의 유연한 의사결정을 위해 캡처된 모든 비정형 결재 요청의 실시간 명세입니다." icon={SearchCode}>
                <div className="overflow-hidden min-h-[500px]">
                    <StandardDataTable
                        columns={columns}
                        data={ismList}
                        loading={loading}
                        emptyMessage="조회된 약식 결재 프로토콜이 현재 섹터에 존재하지 않습니다."
                        className="border-none bg-transparent"
                    />
                </div>
            </HubSectionCard>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title="결재 시퀀스 오케스트레이션 수행"
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black text-[10px] tracking-widest uppercase border-2">조사_취소</Button>
            <Button 
                onClick={() => handleProcess('R')}
                className="flex-1 h-16 bg-rose-50 text-rose-500 rounded-2xl font-black text-[10px] tracking-widest uppercase hover:bg-rose-500 hover:text-white transition-all active:scale-95 border-2 border-rose-100 flex items-center justify-center gap-3"
            >
              <XCircle size={18} strokeWidth={3} /> 시퀀스 반려
            </Button>
            <Button
                onClick={() => handleProcess('C')}
                className="flex-[2] h-16 bg-slate-900 border-none text-white rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:-translate-y-2 hover:bg-primary transition-all active:scale-95 group"
            >
              <CheckCircle2 size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> 최종 승인
            </Button>
          </div>
        }
      >
        <div className="space-y-12 pt-4">
          <div className="p-10 bg-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden group/modal-target">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                  <Activity size={16} className="text-primary animate-pulse" />
                </div>
                <span className="text-[10px] text-primary/60 font-black tracking-[0.4em] uppercase">Target_Sequence_Probe</span>
              </div>
              <h4 className="text-3xl font-black text-white tracking-tighter uppercase leading-tight">{selectedSanctn?.sancltNm}</h4>
              <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                  <User size={14} className="text-slate-400" />
                  <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{selectedSanctn?.applcntId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-white/20 tracking-[0.3em] font-mono uppercase italic">UUID: {selectedSanctn?.infrmlSanctnId}</span>
                </div>
              </div>
            </div>
            <Zap size={240} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] -rotate-12 group-hover/modal-target:rotate-0 transition-transform duration-1000" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <label className="text-[11px] font-black tracking-[0.4em] text-slate-400 uppercase flex items-center gap-3">
                    <SearchCode size={14} className="text-primary" /> 결재/반려 의사결정 로그 (Decision Opinion) <span className="text-rose-500 animate-pulse">*</span>
                </label>
            </div>
            <textarea
              value={returnResn}
              onChange={(e) => setReturnResn(e.target.value)}
              placeholder="해당 결재 시퀀스에 대한 검증 의견을 아카이브를 위해 기술하십시오..."
              className="w-full min-h-[200px] p-10 rounded-[3rem] border-2 bg-slate-50 font-bold text-lg outline-none focus:bg-white focus:ring-[12px] focus:ring-primary/5 focus:border-primary/20 transition-all shadow-inner leading-relaxed resize-none placeholder:text-slate-300"
            />
            <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <AlertCircle size={16} className="text-amber-500" />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase opacity-80">
                    * 작성된 의견은 수정이 불가능하며 모든 관계자에게 실시간으로 통지됩니다.
                </p>
            </div>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
