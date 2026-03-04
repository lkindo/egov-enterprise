'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { SmartSearchPanel } from '@/app/components/ui/standard-search-filter';
import { Reward, rewardAdminService as rewardService } from '@/services/admin/system/RewardAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  Plus,
  Trophy,
  Gift,
  User,
  Calendar,
  CheckCircle2,
  Activity,
  Trash2,
  Settings,
  Sparkles,
  Info,
  Clock,
  ArrowRightCircle,
  ShieldCheck,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { RewardForm } from '@/components/admin/system/RewardForm';
import { useRouter } from 'next/navigation';

export default function RewardClient({ initialData, searchUsid }: { initialData: { content: Reward[] }; searchUsid: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedReward, setSelectedReward] = useState<Reward | undefined>(undefined);

  const rewards = initialData.content || [];

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedReward(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Reward) => {
    setMode('edit');
    setSelectedReward(item);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: Partial<Reward>) => {
    try {
      if (mode === 'create') {
        await rewardService.createReward(formData);
        toast('신규 포상이 등록되었습니다.', 'success');
      } else {
        await rewardService.updateReward(selectedReward!.rwdId, formData);
        toast('포상 정보가 수정되었습니다.', 'success');
      }
      setIsModalOpen(false);
      router.refresh();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: '포상 데이터 소거',
      message: `[${name}] 포상 기록을 시스템에서 영구히 삭제하시겠습니까? 관련 데이터 무결성에 주의하십시오.`,
      variant: 'destructive',
      confirmText: 'Purge Data'
    });

    if (isConfirmed) {
      try {
        await rewardService.deleteReward(id);
        toast('데이터가 소거되었습니다.', 'success');
        router.refresh();
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns: ColumnDef<Reward>[] = [
    {
      id: 'rwdKnd',
      header: 'Protocol Type',
      width: 150,
      accessor: (item: Reward) => (
        <span className={cn(
          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest border-2",
          item.rwdKnd === '1' ? "bg-orange-50/50 border-orange-100 text-orange-600" :
            item.rwdKnd === '2' ? "bg-blue-50/50 border-blue-100 text-blue-600" :
              "bg-emerald-50/50 border-emerald-100 text-emerald-600 shadow-inner"
        )}>
          {item.rwdKnd === '1' ? 'Honorary' : item.rwdKnd === '2' ? 'Monetary' : 'Incentive'}
        </span>
      )
    },
    {
      id: 'rwdNm',
      header: 'Nomenclature',
      width: 250,
      accessor: (item: Reward) => (
        <div className="flex flex-col gap-1">
          <span className="font-black italic uppercase tracking-tighter text-slate-900 text-lg leading-tight">{item.rwdNm}</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest opacity-60">Reward ID: {item.rwdId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'usid',
      header: 'Subject Identity',
      width: 180,
      accessor: (item: Reward) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:rotate-3 transition-transform">
            <User size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-700 italic uppercase tabular-nums">{item.usid}</span>
            <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase">Validated Unit</span>
          </div>
        </div>
      )
    },
    {
      id: 'rwdDe',
      header: 'Activation Date',
      width: 150,
      accessor: (item: Reward) => (
        <div className="flex items-center gap-2 text-slate-500 font-mono font-black text-xs">
          <Calendar size={14} className="opacity-30" />
          {item.rwdDe}
        </div>
      )
    },
    {
      id: 'confmAt',
      header: 'Integrity Stance',
      width: 180,
      accessor: (item: Reward) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            item.confmAt === 'Y' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-300"
          )} />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] italic font-mono",
            item.confmAt === 'Y' ? "text-emerald-600" : "text-slate-400 opacity-60"
          )}>
            {item.confmAt === 'Y' ? 'VERIFIED_CHAIN' : 'PENDING_AUDIT'}
          </span>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'SYSTEM OVERRIDE',
      className: 'text-right',
      accessor: (item: Reward) => (
        <div className="flex justify-end gap-2 pr-4">
          <button
            onClick={() => handleOpenEdit(item)}
            className="h-11 w-11 bg-slate-900/5 text-slate-900 hover:text-white hover:bg-slate-900 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => handleDelete(item.rwdId, item.rwdNm)}
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
        title="포상 아키텍처 매니지먼트"
        breadcrumbs={[{ label: '시스템관리' }, { label: '포상관리' }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="h-16 px-10 rounded-[1.5rem] font-black shadow-[0_20px_40px_rgba(15,23,42,0.15)] bg-slate-900 text-white gap-3 hover:-translate-y-1 transition-all active:scale-95 italic uppercase tracking-widest text-[11px] border border-white/10"
          >
            <Plus size={20} strokeWidth={3} /> Establish New Protocol
          </Button>
        }
      />

      {/* Luxury Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-10 rounded-[3.5rem] bg-white border border-slate-100 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-orange-200 transition-all">
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div className="w-16 h-16 rounded-[1.75rem] bg-orange-600 text-white flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
              <Trophy size={28} />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Active Awards</div>
          </div>
          <div className="relative z-10">
            <h4 className="text-5xl font-black italic tracking-tighter tabular-nums mb-2">{rewards.length} Units</h4>
            <p className="text-[10px] text-orange-600/60 font-black uppercase tracking-widest">Total Honorary Sequence</p>
          </div>
          <Trophy size={180} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
        </div>

        <div className="p-10 rounded-[3.5rem] bg-white border border-slate-100 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div className="w-16 h-16 rounded-[1.75rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
              <ShieldCheck size={28} />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Audit Status</div>
          </div>
          <div className="relative z-10">
            <h4 className="text-5xl font-black italic tracking-tighter tabular-nums mb-2">
              {rewards.filter(i => i.confmAt === 'N').length} Nodes
            </h4>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Awaiting Integrity Verification</p>
          </div>
          <ShieldCheck size={180} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
        </div>

        <div className="p-10 rounded-[3.5rem] bg-primary text-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="flex justify-between items-start mb-10 relative z-10">
            <div className="w-16 h-16 rounded-[1.75rem] bg-white text-primary flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
              <Sparkles size={28} />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">System Health</div>
          </div>
          <div className="relative z-10">
            <h4 className="text-5xl font-black italic tracking-tighter mb-2">OPTIMAL</h4>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Reward Engine Operational</p>
          </div>
          <Activity size={200} className="absolute right-[-40px] bottom-[-40px] opacity-[0.1] -rotate-6 group-hover:rotate-0 transition-transform duration-1000" />
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-10 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Info size={40} className="text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
          <h4 className="text-3xl font-black italic tracking-tighter uppercase">Reward Protocol Intelligence</h4>
          <p className="text-base text-slate-400 font-bold leading-relaxed max-w-3xl">
            임직원 포상 내역을 관리하고 실시간으로 라이선스를 발급하십시오. 모든 승인 내역은 <span className="text-emerald-400 font-black italic lowercase tracking-wider hover:text-white transition-colors">Immutable Audit Log</span>에 기록됩니다. 포상 종류와 대상자를 명확히 정의하여 공정성을 확보하십시오.
          </p>
        </div>
        <Activity size={240} className="absolute right-[-60px] top-[-60px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000 pointer-events-none" />
      </div>

      {/* Search Matrix */}
      <div className="p-10 rounded-[4rem] bg-slate-50 border border-slate-100 shadow-inner group relative overflow-hidden">
        <SmartSearchPanel
          fields={[
            { name: 'usid', label: 'Subject Identity (UID)', type: 'text', placeholder: 'Enter unit identifier...' }
          ]}
          onSearch={(v: any) => {
            const val = v.usid || '';
            router.push(`/admin/system/reward?usid=${val}`);
          }}
          onReset={() => router.push('/admin/system/reward')}
        />
        <Search size={150} className="absolute right-[-30px] bottom-[-30px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      {/* Main Data Grid */}
      <div className="bg-white rounded-[5rem] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.05)] border border-slate-50 relative group/matrix ring-1 ring-slate-100">
        <UltimateDataGrid
          title="REWARD PROTOCOL DEFINITION MATRIX"
          columns={columns}
          data={rewards}
          emptyMessage="등록된 포상 프로토콜 정수가 존재하지 않습니다."
          className="bg-slate-50/50 p-10 rounded-[4rem] border border-dashed border-slate-200"
          keyField="rwdId"
        />
        <div className="flex justify-center items-center gap-6 mt-10 text-[9px] font-black italic text-slate-300 tracking-[0.4em] uppercase opacity-40">
          <div className="flex items-center gap-3">
            <Clock size={12} />
            REAL-TIME SYNC ACTIVE
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <div className="flex items-center gap-3">
            <ShieldCheck size={12} />
            SECURED ARCHITECTURE
          </div>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? 'Inaugurate New Reward Entry' : 'Refine Reward Blueprint'}
        maxWidth="lg"
      >
        <div className="p-6">
          <RewardForm
            initialData={selectedReward}
            onSubmit={handleSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </div>
      </StandardModal>
    </div>
  );
}