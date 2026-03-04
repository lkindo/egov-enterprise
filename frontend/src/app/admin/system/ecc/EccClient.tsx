'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { SmartSearchPanel } from '@/app/components/ui/standard-search-filter';
import { eventCmpgnAdminService, EventCmpgn } from '@/services/admin/system/EventCmpgnAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  Megaphone,
  Calendar,
  Users,
  Star,
  Plus,
  Edit,
  Trash2,
  Clock,
  Activity,
  Sparkles,
  Info,
  ArrowRightCircle,
  ShieldCheck,
  Search,
  Settings,
  Globe,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { EventCmpgnForm } from '@/components/admin/system/EventCmpgnForm';
import { useRouter } from 'next/navigation';

export default function EccClient({ initialData, searchEventCn }: { initialData: { content: EventCmpgn[] }; searchEventCn: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<EventCmpgn | undefined>(undefined);

  const eccList = initialData.content || [];

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedEvent(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: EventCmpgn) => {
    setMode('edit');
    setSelectedEvent(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: Partial<EventCmpgn>) => {
    try {
      if (mode === 'create') {
        await eventCmpgnAdminService.createEventCmpgn(formData);
        toast('신규 캠페인 아키텍처가 성공적으로 배포되었습니다.', 'success');
      } else {
        await eventCmpgnAdminService.updateEventCmpgn(selectedEvent!.eventId, formData);
        toast('캠페인 파라미터가 최적화되었습니다.', 'success');
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: '캠페인 데이터 소거',
      message: `[${name}] 캠페인 기록을 영구히 삭제하시겠습니까? 관련 참여자 통계 데이터가 손실됩니다.`,
      variant: 'destructive',
      confirmText: 'Purge Campaign'
    });
    if (isConfirmed) {
      try {
        await eventCmpgnAdminService.deleteEventCmpgn(id);
        toast('데이터가 성공적으로 소거되었습니다.', 'success');
        router.refresh();
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns: ColumnDef<EventCmpgn>[] = [
    {
      id: 'eventTyCode',
      header: 'Strategic Type',
      width: 130,
      accessor: (item: EventCmpgn) => (
        <span className={cn(
          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest border-2 shadow-inner",
          item.eventTyCode === '1' ? "bg-purple-50/50 border-purple-100 text-purple-600" : "bg-blue-50/50 border-blue-100 text-blue-600"
        )}>
          {item.eventTyCode === '1' ? 'EVENT' : 'CAMPAIGN'}
        </span>
      )
    },
    {
      id: 'eventNm',
      header: 'Nomenclature',
      width: 250,
      accessor: (item: EventCmpgn) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="font-black italic uppercase tracking-tighter text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors">{item.eventNm}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest opacity-60 italic">Campaign Node: {item.eventId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'eventPeriod',
      header: 'Execution window',
      width: 220,
      accessor: (item: EventCmpgn) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-inner">
            <Calendar size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-700 italic tabular-nums">{item.eventBeginDe}</span>
            <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase italic opacity-60">to {item.eventEndDe}</span>
          </div>
        </div>
      )
    },
    {
      id: 'receptPeriod',
      header: 'Reception window',
      width: 220,
      accessor: (item: EventCmpgn) => (
        <div className="flex items-center gap-3 opacity-60">
          <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 italic font-black text-[10px] shadow-inner">
            REQ
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-slate-500 italic tabular-nums">{item.receptBeginDe}</span>
            <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase italic">to {item.receptEndDe}</span>
          </div>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'STRATEGY CONTROL',
      className: 'text-right',
      accessor: (item: EventCmpgn) => (
        <div className="flex justify-end gap-2 pr-4">
          <button
            onClick={() => handleOpenEdit(item)}
            className="h-11 w-11 bg-slate-900/5 text-slate-900 hover:text-white hover:bg-slate-900 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => handleDelete(item.eventId, item.eventNm)}
            className="h-11 w-11 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-white hover:border-rose-100 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="브랜딩 및 캠페인 아키텍처"
        breadcrumbs={[{ label: '시스템관리' }, { label: '행사캠페인' }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="h-16 px-10 rounded-[1.5rem] font-black shadow-[0_20px_40px_rgba(15,23,42,0.15)] bg-slate-900 text-white gap-3 hover:-translate-y-1 transition-all active:scale-95 italic uppercase tracking-widest text-[11px] border border-white/10"
          >
            <Plus size={20} strokeWidth={3} /> Inaugurate New Vision
          </Button>
        }
      />

      {/* Luxury Stats Hub */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <StatCard
          title="ACTIVE EVENTS"
          count={eccList.filter(i => i.eventTyCode === '1').length}
          icon={<Star size={24} />}
          color="purple"
        />
        <StatCard
          title="STRATEGIC CAMPAIGNS"
          count={eccList.filter(i => i.eventTyCode === '2').length}
          icon={<Megaphone size={24} />}
          color="blue"
        />
        <StatCard
          title="RECEPTION PHASE"
          count={eccList.length}
          icon={<Clock size={24} />}
          color="emerald"
        />
        <StatCard
          title="TOTAL ASSETS"
          count={eccList.length}
          icon={<Globe size={24} />}
          color="slate"
        />
      </div>

      {/* Campaign Intelligence Shield */}
      <div className="p-10 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Zap size={40} className="text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
          <h4 className="text-3xl font-black italic tracking-tighter uppercase tabular-nums">Enterprise Campaign Engine</h4>
          <p className="text-base text-slate-400 font-bold leading-relaxed max-w-3xl italic">
            전사적 행사와 전략적 캠페인을 정밀하게 설계하고 모니터링하십시오. 모든 일정 데이터는 <span className="text-primary font-black italic">Next-Level Logic</span>을 기반으로 실시간 동기화되며, 임직원의 참여 경험을 극대화할 수 있도록 설계되었습니다.
          </p>
        </div>
        <Activity size={240} className="absolute right-[-60px] top-[-60px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000 pointer-events-none" />
      </div>

      {/* Search Filter Panel */}
      <div className="p-10 rounded-[4rem] bg-slate-50 border border-slate-100 shadow-inner group relative overflow-hidden">
        <SmartSearchPanel
          fields={[
            { name: 'eventCn', label: 'Campaign Intelligence Query', type: 'text', placeholder: 'Search by campaign content, vision, or keyword...' }
          ]}
          onSearch={(v: any) => {
            router.push(`/admin/system/ecc?eventCn=${v.eventCn || ''}`);
          }}
          onReset={() => router.push('/admin/system/ecc')}
        />
        <Search size={150} className="absolute right-[-30px] bottom-[-30px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
      </div>

      {/* Main Matrix Repository */}
      <div className="bg-white rounded-[5rem] p-6 shadow-[0_60px_100px_rgba(0,0,0,0.08)] border border-slate-100 relative group/matrix ring-1 ring-slate-200/50">
        <UltimateDataGrid
          title="CAMPAIGN EXECUTION REPOSITORY MASTER"
          columns={columns}
          data={eccList}
          emptyMessage="등록된 캠페인 또는 전략적 행사 가용 데이터가 비어 있습니다."
          className="bg-slate-50/50 p-10 rounded-[4rem] border border-dashed border-slate-200"
          keyField="eventId"
        />
        <div className="flex justify-center items-center gap-12 mt-12 text-[10px] font-black italic text-slate-300 tracking-[0.4em] uppercase opacity-40">
          <div className="flex items-center gap-3">
            <Globe size={12} className="animate-pulse" />
            GLOBAL SYNC READY
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <div className="flex items-center gap-3">
            <ShieldCheck size={12} />
            SECURITY ARCH: OPTIMAL
          </div>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? 'Broadcast New Vision Protocol' : 'Refine Strategic Blueprint'}
        maxWidth="lg"
      >
        <div className="p-4">
          <EventCmpgnForm
            initialData={selectedEvent}
            onSubmit={handleSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </div>
      </StandardModal>
    </div>
  );
}

function StatCard({ title, count, icon, color }: any) {
  const colorStyles: any = {
    purple: "bg-white border-purple-100 text-purple-600 shadow-purple-500/5",
    blue: "bg-white border-blue-100 text-blue-600 shadow-blue-500/5",
    emerald: "bg-white border-emerald-100 text-emerald-600 shadow-emerald-500/5",
    slate: "bg-slate-900 border-slate-800 text-white shadow-2xl"
  };

  const iconStyles: any = {
    purple: "bg-purple-50 group-hover:bg-purple-600 group-hover:text-white",
    blue: "bg-blue-50 group-hover:bg-blue-600 group-hover:text-white",
    emerald: "bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white",
    slate: "bg-white/10 group-hover:bg-white group-hover:text-slate-900"
  };

  return (
    <div className={cn(
      "p-8 rounded-[3rem] border-2 transition-all group relative overflow-hidden",
      colorStyles[color]
    )}>
      <div className="relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-inner transition-all duration-700", iconStyles[color])}>
          {icon}
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1 italic font-mono">{title}</p>
        <h4 className="text-4xl font-black tracking-tighter tabular-nums italic leading-none">{count} Units</h4>
      </div>
      <div className="absolute right-[-20%] bottom-[-20%] opacity-[0.03] group-hover:rotate-12 transition-all duration-1000 pointer-events-none">
        {React.cloneElement(icon, { size: 160 })}
      </div>
    </div>
  );
}