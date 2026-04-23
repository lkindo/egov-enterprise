'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy, Calendar, CheckCircle2, XCircle, Search, Plus, Filter, Activity, Zap, Layers, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RewardManageClient({ initialData }: { initialData: any[] }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const size = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-rewards', searchKeyword, page],
    queryFn: () => operationAdminService.getRewardList({
      searchKeyword,
      pageNo: page,
      pageSize: size
    }),
    initialData: { list: initialData, total: initialData.length, totalPage: Math.ceil(initialData.length / size), page: 1, size },
  });

  const rewards = data?.list || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPage || Math.ceil(totalItems / size);

  const columns: Column<any>[] = [
    {
      header: '포상 명칭',
      accessor: (item) => (
        <div className="flex items-center gap-6 py-2">
          <div className="w-12 h-12 rounded-[0.1rem] bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner group-hover:bg-amber-500 group-hover:text-white transition">
            <Trophy size={20} />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-black text-slate-900 leading-tight tracking-tight group-hover:text-primary transition-colors">{item.rwardNm}</span>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-amber-600 border border-amber-100 px-1.5 py-0.5 rounded-md leading-none bg-amber-50/50 uppercase tracking-widest">{item.rwardCode}</span>
              <span className="text-[10px] text-slate-400 font-bold truncate italic leading-none">{item.rwardLevel || 'STANDARD'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      header: '수상자 ID',
      accessor: 'rwardwnrId',
      className: 'w-32 font-mono text-xs font-black text-slate-400 tracking-tighter'
    },
    {
      header: '포상일자',
      accessor: (item) => (
        <div className="flex items-center gap-2.5 text-slate-500 font-bold text-[11px]">
          <Calendar size={12} className="opacity-40" />
          <span className="tabular-nums">{item.rwardDe}</span>
        </div>
      )
    },
    {
      header: '승인상태',
      accessor: (item) => (
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase transition ${item.confmAt === 'Y'
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          : 'bg-slate-50 text-slate-400 border border-slate-100'
          }`}>
          {item.confmAt === 'Y' ? (
            <>
              <CheckCircle2 size={12} className="animate-pulse" />
              <span>동기화승인</span>
            </>
          ) : (
            <>
              <RefreshCcw size={12} className="animate-spin-slow" />
              <span>대기중</span>
            </>
          )}
        </div>
      ),
      className: 'w-36 text-center'
    },
    {
      header: '승인일시',
      accessor: 'sanctnDt',
      className: 'w-48 text-slate-300 text-[10px] tabular-nums font-mono italic pr-8 text-right'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
                title="상훈 및 포상 관리 체계"
                breadcrumbs={[{ label: '운영지원' }, { label: '상훈관리' }, { label: '포상관리' }]}
      />

      <HubHeader
        title="Reward &"
        highlight="Honor"
                subtitle="조직 내 우수한 성과 및 공헌에 대한 포상 기록을 투명하게 트래킹하고 승인 프로세스를 관리하는 통제실입니다."
        icon={Trophy}
        actions={
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries()}
              className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition shadow-lg active:scale-95"
            >
              <RefreshCcw size={22} className="hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button className="h-14 px-10 rounded-[0.1rem] bg-slate-900 text-white font-black tracking-widest text-[11px] uppercase hover:bg-primary transition hover:-translate-y-1 gap-3 shadow-2xl">
                            <Plus size={20} /> 포상 기록 신규 저장
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
                <HubMetricCard title="포상 현황" value={totalItems} icon={Layers} color="amber" />
                <HubMetricCard title="동기화상태" value="확인됨" icon={Zap} color="emerald" status="동기화됨" />
                <HubMetricCard title="활성 레코드" value={rewards.length} icon={Activity} color="primary" />
                <HubMetricCard title="감시 프로브" value="안전함" icon={Filter} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
                title="포상 아카이브 매트릭스"
                description="전사적으로 관리되는 상훈 및 포상 데이터 유닛의 실시간 스트림 및 상세 명세입니다."
        icon={Trophy}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-10 mb-8">
            <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
              <Input
                                placeholder="포상 명칭 또는 대상자 식별자로 분석..."
                className="h-16 pl-16 rounded-[0.1rem] border-2 bg-slate-50/50 text-sm font-black tracking-tight shadow-inner"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <Button type="submit" className="h-16 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1">ANALYZE</Button>
            </form>
            <div>
              <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic tabular-nums">DATA_PROBE_UPDATING...</span>
            </div>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={rewards}
              loading={isLoading}
                            emptyMessage="식별된 포상 내역 레코드가 존재하지 않습니다."
              className="border-none bg-transparent shadow-none"
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                onPageChange: (p) => setPage(p)
              }}
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}
