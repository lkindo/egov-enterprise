'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { SearchParams } from '@/types/system';
import { PagePagination } from "@/components/common/PagePagination";
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
import { 
    Search, 
    ArrowRightLeft, 
    Activity, 
    Clock, 
    Database, 
    Zap, 
    Server,
    ShieldAlert,
    Network,
    SearchCode,
    Fingerprint,
    Timer,
    Terminal,
    Repeat
} from "lucide-react";

export default function TransferLogPage() {
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-logs-transfer', params],
        queryFn: () => systemLogAdminService.getTransferLogs(params),
    });

    const logs = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const columns = [
        {
            header: '濡쒓렇 ?앸퀎??,
            accessor: (item: any) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Terminal size={18} />
                    </div>
                    <div>
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item.requstId}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">TRS_UUID</span>
                    </div>
                </div>
            )
        },
        {
            header: '諛쒖깮 ?쒖젏',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
                    <Clock size={14} className="text-secondary opacity-40" />
                    {item.occrrncDe}
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '?섎컻??湲곌?/?쒖뒪??,
            accessor: (item: any) => (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">{item.trnsmitSysNm} ??{item.recptnSysNm}</span>
                </div>
            )
        },
        {
            header: '?섑뻾 ?곹깭',
            accessor: (item: any) => (
                <HubStatusBadge label="?꾩넚 ?꾨즺" variant="success" className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 text-[9px] font-black tracking-widest" />
            ),
            className: 'w-24 text-center'
        },
        {
            header: '泥섎━ IP (ADDR)',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Network size={12} className="opacity-30" />
                    {item.rqesterIp}
                </div>
            ),
            className: 'w-40'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="?≪닔??濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '?≪닔??濡쒓렇' }]} />

            <HubHeader title="?곌퀎 遺꾩꽍" highlight="?≪닔??濡쒓렇" subtitle="?쒖뒪??媛??곗씠???곌퀎 諛??섎컻??怨쇱젙?먯꽌 諛쒖깮?섎뒗 紐⑤뱺 ?몃옒???대젰???ㅼ떆媛꾩쑝濡?愿由ы빀?덈떎." icon={Repeat} 
                actions={
                    <div className="flex gap-4 p-2 items-center">
                        <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">CSV ?대낫?닿린</Button>
                    </div>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="?꾩껜 ?꾩넚 嫄댁닔" value={pagination?.totalRecordCount ?? 0} icon={Database} color="primary" />
                <HubMetricCard title="?쒖꽦 ?곌퀎 ?듬줈" value={12} icon={ArrowRightLeft} color="emerald" status="?뺤긽" />
                <HubMetricCard title="?꾩넚 吏?? value={0} icon={Timer} color="rose" status="?덉쟾" />
                <HubMetricCard title="?곗씠??泥섎━?? value="1.5GB" icon={Zap} color="amber" />
            </HubMetricGrid>

            <HubSectionCard title="?섎컻???대젰 議고쉶" description="?섏쭛???≪닔??濡쒓렇瑜?議곌굔蹂꾨줈 ?꾪꽣留곹븯???곗씠???먮쫫??遺꾩꽍?⑸땲??" icon={SearchCode}>
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <select
                            value={params.searchCondition}
                            onChange={(e) => setParams(prev => ({ ...prev, searchCondition: e.target.value }))}
                            className="h-14 px-6 rounded-2xl border-2 border-border bg-slate-50 font-black text-[10px] tracking-widest uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-inner"
                        >
                            <option value="1">湲곌?紐?/option>
                            <option value="2">?쒖뒪?쒕챸</option>
                            <option value="3">?붿껌 IP</option>
                        </select>
                        <div className="relative group/search flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
                            <Input
                                placeholder="寃?됱뼱瑜??낅젰?섏떗?쒖삤..."
                                value={params.searchKeyword || ''}
                                onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                                className="h-14 pl-12 pr-6 w-full bg-muted/30 border-none rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>
                    <Button type="submit" size="lg" className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2">
                        <Search size={18} /> 濡쒓렇 議고쉶
                    </Button>
                </form>

                <StandardDataTable columns={columns} data={logs} loading={isLoading} emptyMessage="議고쉶???≪닔??濡쒓렇 ?곗씠?곌? ?놁뒿?덈떎." className="border-none bg-transparent" />

                <div className="mt-12 flex justify-center">
                    {pagination && <PagePagination pagination={pagination} onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))} />}
                </div>
            </HubSectionCard>
        </div>
    );
}
