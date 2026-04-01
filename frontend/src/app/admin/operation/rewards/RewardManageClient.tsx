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

  // --- Data Fetching ---
  const { data, isLoading } = useQuery({
    queryKey: ['admin-rewards', searchKeyword, page],
    queryFn: () => operationAdminService.getRewardList({
      searchKeyword,
      page踰덊샇: page,
      pageSize: size
    }),
    initialData: { list: initialData, total: initialData.length, totalPage: Math.ceil(initialData.length / size), page: 1, size },
  });

  const rewards = data?.list || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPage || Math.ceil(totalItems / size);

  const columns: Column<any>[] = [
    {
      header: 'REWARD_UNIT',
      accessor: (item) => (
        <div className="flex items-center gap-6 py-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-all">
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
      header: 'WINNER_ID',
      accessor: 'rwardwnrId',
      className: 'w-32 font-mono text-xs font-black text-slate-400 tracking-tighter'
    },
    {
      header: 'DATE_STAMP',
      accessor: (item) => (
        <div className="flex items-center gap-2.5 text-slate-500 font-bold text-[11px]">
          <Calendar size={12} className="opacity-40" />
          <span className="tabular-nums">{item.rwardDe}</span>
        </div>
      )
    },
    {
      header: 'CONFIRMATION',
      accessor: (item) => (
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all ${item.confmAt === 'Y'
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
          : 'bg-slate-50 text-slate-400 border border-slate-100'
          }`}>
          {item.confmAt === 'Y' ? (
            <>
              <CheckCircle2 size={12} className="animate-pulse" />
              <span>?숆린님?뺤씤님/span>
            </>
          ) : (
            <>
              <RefreshCcw size={12} className="animate-spin-slow" />
              <span>?湲?以?/span>
            </>
          )}
        </div>
      ),
      className: 'w-36 text-center'
    },
    {
      header: 'AUDIT_TRAIL',
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
        title="?곹썕 諛님ъ긽 愿由?泥닿퀎"
        breadcrumbs={[{ label: '?댁쁺吏님 }, { label: '?곹썕愿由? }, { label: '?ъ긽愿由? }]}
      />

      <HubHeader
        title="Reward &"
        highlight="Honor"
        subtitle="議곗쭅 님?곗닔님?깃낵 諛?怨듯뿄님?님?ъ긽 湲곕줉님?뺣님섍쾶 ?몃옒?뱁븯怨님뱀씤 ?꾨줈?몄뒪瑜?愿由ы븯님?듭젣?ㅼ엯?덈떎."
        icon={Trophy}
        actions={
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries()}
              className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-lg active:scale-95"
            >
              <RefreshCcw size={22} className="hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black tracking-widest text-[11px] uppercase hover:bg-primary transition-all hover:-translate-y-1 gap-3 shadow-2xl">
              <Plus size={20} /> ?ъ긽 湲곕줉 신규 ?ㅼ옣
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?ъ긽 현황" value={totalItems} icon={Layers} color="amber" />
        <HubMetricCard title="?숆린님?곹깭" value="?뺤씤님 icon={Zap} color="emerald" status="?숆린?붾맖" />
        <HubMetricCard title="활성 ?덉퐫님 value={rewards.length} icon={Activity} color="primary" />
        <HubMetricCard title="媛먯떆 ?꾨줈釉? value="?덉쟾님 icon={Filter} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title="?ъ긽 ?꾩뭅?대툕 留ㅽ듃由?뒪"
        description="?꾩궗?곸쑝濡?愿由щ릺님?곹썕 諛님ъ긽 ?곗씠님?좊떅님?ㅼ떆媛님ㅽ듃由?諛님곸꽭 ?곸꽭 紐낆꽭?낅땲님"
        icon={Trophy}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-10 mb-8">
            <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
              <Input
                placeholder="?ъ긽 紐낆묶 ?먮뒗 ??곸옄 ?앸퀎?먮줈 분석..."
                className="h-16 pl-16 rounded-2xl border-2 bg-slate-50/50 text-sm font-black tracking-tight shadow-inner"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
              <Button type="submit" className="h-16 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1">ANALYZE</Button>
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
              emptyMessage="?앸퀎님?ъ긽 ?꾨엻 ?덉퐫?쒓? 議댁옱?섏? ?딆뒿?덈떎."
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

