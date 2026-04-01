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
      pageÎ≤àÌò∏: page,
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
              <span>?ôÍ∏∞???ïÏù∏??/span>
            </>
          ) : (
            <>
              <RefreshCcw size={12} className="animate-spin-slow" />
              <span>?ÄÍ∏?Ï§?/span>
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
        title="?ÅÌõà Î∞??¨ÏÉÅ Í¥ÄÎ¶?Ï≤¥Í≥Ñ"
        breadcrumbs={[{ label: '?¥ÏòÅÏßÄ?? }, { label: '?ÅÌõàÍ¥ÄÎ¶? }, { label: '?¨ÏÉÅÍ¥ÄÎ¶? }]}
      />

      <HubHeader
        title="Reward &"
        highlight="Honor"
        subtitle="Ï°∞ÏßÅ ???∞Ïàò???±Í≥º Î∞?Í≥µÌóå???Ä???¨ÏÉÅ Í∏∞Î°ù???ïÎ??òÍ≤å ?∏Îûò?πÌïòÍ≥??πÏù∏ ?ÑÎ°ú?∏Ïä§Î•?Í¥ÄÎ¶¨Ìïò???µÏ†ú?§ÏûÖ?àÎã§."
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
              <Plus size={20} /> ?¨ÏÉÅ Í∏∞Î°ù ?†Í∑ú ?§Ïû•
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?¨ÏÉÅ ?ÑÌô©" value={totalItems} icon={Layers} color="amber" />
        <HubMetricCard title="?ôÍ∏∞???ÅÌÉú" value="?ïÏù∏?? icon={Zap} color="emerald" status="?ôÍ∏∞?îÎê®" />
        <HubMetricCard title="?úÏÑ± ?àÏΩî?? value={rewards.length} icon={Activity} color="primary" />
        <HubMetricCard title="Í∞êÏãú ?ÑÎ°úÎ∏? value="?àÏ†Ñ?? icon={Filter} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title="?¨ÏÉÅ ?ÑÏπ¥?¥Î∏å Îß§Ìä∏Î¶?ä§"
        description="?ÑÏÇ¨?ÅÏúºÎ°?Í¥ÄÎ¶¨Îêò???ÅÌõà Î∞??¨ÏÉÅ ?∞Ïù¥???†Îãõ???§ÏãúÍ∞??§Ìä∏Î¶?Î∞??ÅÏÑ∏ ?ÅÏÑ∏ Î™ÖÏÑ∏?ÖÎãà??"
        icon={Trophy}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-10 mb-8">
            <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
              <Input
                placeholder="?¨ÏÉÅ Î™ÖÏπ≠ ?êÎäî ?Ä?ÅÏûê ?ùÎ≥Ñ?êÎ°ú Î∂ÑÏÑù..."
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
              emptyMessage="?ùÎ≥Ñ???¨ÏÉÅ ?ÑÎûç ?àÏΩî?úÍ? Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§."
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
