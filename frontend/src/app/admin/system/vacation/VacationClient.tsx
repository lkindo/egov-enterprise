'use client';

import React from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { SmartSearchPanel } from '@/app/components/ui/standard-search-filter';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { vacationAdminService } from '@/services/admin/vacation/VacationAdminService';
import { Vacation } from '@/types/vacation';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  Check,
  X,
  Calendar,
  User,
  Clock,
  ShieldCheck,
  Activity,
  BarChart3,
  Info,
  History,
  ArrowRightCircle,
  Briefcase,
  HeartPulse,
  Timer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function VacationClient({
  initialVacations,
  initialStats,
  searchWrd,
  status
}: {
  initialVacations: Vacation[];
  initialStats: any[];
  searchWrd: string;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const vacations = initialVacations || [];

  // filtering (if searchParams apply)
  const filteredVacations = vacations.filter(v => {
    if (status && v.confmAt !== status) return false;
    return true;
  });

  const chartData = [
    { name: '승인', count: vacations.filter(v => v.confmAt === 'Y').length },
    { name: '대기', count: vacations.filter(v => v.confmAt === 'R').length },
    { name: '반려', count: vacations.filter(v => v.confmAt === 'N').length },
  ];

  const handleApprove = async (item: Vacation, confmAt: 'Y' | 'N') => {
    const actionNm = confmAt === 'Y' ? 'PROTOCOL_APPROVE' : 'PROTOCOL_REJECT';
    const isConfirmed = await confirm({
      title: `휴가 ${confmAt === 'Y' ? '승인' : '반려'} 프로토콜 실행`,
      message: `[${item.applcntId}] 임직원의 휴가 신청을 ${confmAt === 'Y' ? '승인' : '반려'} 처리하시겠습니까? 관련 출전 및 업무 공백 리스크를 확인하십시오.`,
      variant: confmAt === 'N' ? 'destructive' : 'default',
      confirmText: actionNm
    });

    if (!isConfirmed) return;

    try {
      await vacationAdminService.approveVacation({
        applcntId: item.applcntId,
        vcatnSe: item.vcatnSe,
        bgnde: item.bgnde,
        confmAt
      });
      toast(`휴가가 성공적으로 ${confmAt === 'Y' ? '승인' : '반려'}되었습니다.`, 'success');
      router.refresh();
    } catch (error) {
      toast('처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns: ColumnDef<Vacation>[] = [
    {
      id: 'vcatnSe',
      header: 'Sector',
      width: 120,
      accessor: (item: Vacation) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg",
            item.vcatnSe === '01' ? "bg-slate-900 text-white" :
              item.vcatnSe === '02' ? "bg-primary text-white" :
                "bg-rose-100 text-rose-600"
          )}>
            {item.vcatnSe === '01' ? <Briefcase size={18} /> :
              item.vcatnSe === '02' ? <Timer size={18} /> :
                <HeartPulse size={18} />}
          </div>
          <span className="text-[10px] font-black uppercase italic tracking-widest text-slate-500">
            {item.vcatnSe === '01' ? 'Annual' : item.vcatnSe === '02' ? 'Half-Day' : 'Medical'}
          </span>
        </div>
      )
    },
    {
      id: 'applcntId',
      header: 'Human Asset Identity',
      width: 200,
      accessor: (item: Vacation) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">{item.applcntId}</span>
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest opacity-40 italic">CORE_STAFF_NODE</span>
        </div>
      )
    },
    {
      id: 'period',
      header: 'Activation Window',
      width: 280,
      accessor: (item: Vacation) => (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl shadow-inner">
          <Calendar size={14} className="text-slate-300" />
          <span className="text-xs font-mono font-black text-slate-600 truncate">{item.bgnde} <span className="text-slate-300 mx-1">~</span> {item.endde}</span>
        </div>
      )
    },
    {
      id: 'confmAt',
      header: 'Authorization Logic',
      width: 150,
      accessor: (item: Vacation) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={item.confmAt} />
          <span className="text-[9px] font-black uppercase tracking-widest italic opacity-40">STANCE</span>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'DOMAIN OVERRIDE',
      className: 'text-right',
      accessor: (item: Vacation) => (
        item.confmAt === 'R' || (item.confmAt as string) === 'A' ? (
          <div className="flex justify-end gap-3 pr-4">
            <button
              onClick={() => handleApprove(item, 'Y')}
              className="h-11 px-6 bg-slate-900 text-white rounded-[1.25rem] text-[10px] font-black uppercase italic tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10 flex items-center gap-2"
              title="승인"
            >
              <Check size={16} strokeWidth={3} /> Approve
            </button>
            <button
              onClick={() => handleApprove(item, 'N')}
              className="h-11 w-11 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-[1.25rem] transition-all active:scale-95 flex items-center justify-center border border-transparent hover:border-rose-200"
              title="반려"
            >
              <X size={18} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <div className="flex justify-end items-center gap-3 pr-8 opacity-30 italic">
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Lifecycle Terminated</span>
            <ShieldCheck size={14} className="text-slate-400" />
          </div>
        )
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="엔터프라이즈 휴가 거버넌스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '휴가관리' }]}
        actions={
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end gap-1">
              <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">Operational Year</span>
              <span className="text-xl font-black italic tracking-tighter tabular-nums px-3 py-1 bg-slate-900 text-white rounded-xl shadow-2xl">2026 ARCH</span>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Left: Intelligence Analytics */}
        <div className="lg:col-span-1 space-y-10">
          <div className="p-8 rounded-[3.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 space-y-8">
              <div className="w-16 h-16 rounded-[1.5rem] bg-white text-slate-900 flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform duration-700">
                <BarChart3 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black italic tracking-tighter uppercase mb-2">Demand Analysis</h3>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">신청 상태별 전사적 휴가 리소스를 분석하고 예측하십시오.</p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <StandardChartWrapper
                  title=""
                  type="bar"
                  data={chartData}
                  dataKeys={['count']}
                  className="bg-transparent border-none p-0 shadow-none min-h-[300px]"
                />
              </div>
            </div>
            <Activity size={200} className="absolute right-[-40px] top-[-40px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000" />
          </div>

          <div className="p-8 rounded-[3rem] bg-white border border-slate-100 shadow-xl flex flex-col items-center text-center group">
            <div className="w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors border border-slate-50 mb-6">
              <History size={36} />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest italic text-slate-900 mb-2">Archived Protocols</h4>
            <p className="text-[11px] text-slate-400 font-bold leading-relaxed mb-6">처리 완료된 모든 내역은 시스템 로그 저장소에 영구히 아카이브됩니다.</p>
            <Button variant="outline" className="w-full rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest border-2">Access Vault</Button>
          </div>
        </div>

        {/* Right: Operations Matrix */}
        <div className="lg:col-span-3 space-y-10">
          <div className="p-10 bg-white rounded-[4rem] border border-slate-100 shadow-2xl ring-1 ring-slate-50 relative overflow-hidden group/info">
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner group-hover/info:scale-105 transition-transform">
                <ShieldCheck size={40} className="text-slate-400" />
              </div>
              <div className="space-y-4 flex-1 text-center md:text-left">
                <h4 className="text-3xl font-black italic tracking-tighter uppercase tabular-nums">Structural Compliance Guard</h4>
                <p className="text-base text-slate-500 font-bold leading-relaxed max-w-2xl italic">
                  모든 휴가 승인 프로세스는 노동법 규정 및 내부 거버넌스 프로토콜을 준수해야 합니다.
                  <span className="text-primary font-black ml-1">Critical Approval</span> 시 업무 공백에 따른 프로젝트 리스크를 사전에 평가하십시오.
                </p>
              </div>
              <ArrowRightCircle size={150} className="absolute right-[-40px] top-[-40px] opacity-[0.02] -rotate-12 group-hover/info:rotate-0 transition-transform duration-1000" />
            </div>
          </div>

          <div className="p-10 rounded-[4rem] bg-slate-50 border border-slate-100 shadow-inner group relative overflow-hidden">
            <SmartSearchPanel
              fields={[
                { name: 'searchWrd', label: 'Asset Identity (UID)', type: 'text', placeholder: 'Enter node ID or alias...' },
                {
                  name: 'status', label: 'Protocol State', type: 'select', options: [
                    { label: '--- ALL VECTORS ---', value: '' },
                    { label: 'PENDING / WAIT', value: 'R' },
                    { label: 'AUTHORIZED', value: 'Y' },
                    { label: 'REJECTED', value: 'N' }
                  ]
                }
              ]}
              onSearch={(v: any) => {
                router.push(`/admin/system/vacation?searchWrd=${v.searchWrd || ''}&status=${v.status || ''}`);
              }}
              onReset={() => router.push('/admin/system/vacation')}
            />
            <Info size={150} className="absolute right-[-30px] bottom-[-30px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
          </div>

          <div className="bg-white rounded-[5rem] p-6 shadow-[0_60px_100px_rgba(0,0,0,0.08)] border border-slate-100 relative group/matrix">
            <UltimateDataGrid
              title="VACATION AUTHORIZATION MATRIX"
              columns={columns}
              data={filteredVacations}
              emptyMessage="감지된 휴가 신청 데이터 포인트가 존재하지 않습니다."
              className="bg-slate-50/50 p-10 rounded-[4rem] border border-dashed border-slate-200"
              keyField="applcntId"
            />
            <div className="flex justify-center items-center gap-8 mt-10 opacity-30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] italic text-slate-400">Governance Active</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] italic text-slate-400">Middleware Synchronized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
