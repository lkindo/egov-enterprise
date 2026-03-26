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
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
import { 
    Search, 
    Terminal, 
    Activity, 
    Clock, 
    Database, 
    Zap, 
    Server,
    ShieldAlert,
    Network,
    SearchCode,
    Fingerprint
} from "lucide-react";

export default function SystemLogPage() {
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-logs-system', params],
        queryFn: () => systemLogAdminService.getSystemLogs(params),
    });

    const logs = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const columns = [
        {
            header: '?붿껌 ID / ?앸퀎??,
            accessor: (item: any) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Fingerprint size={18} />
                    </div>
                    <div>
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item.requstId}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">?쒖뒪??濡쒓렇 UUID</span>
                    </div>
                </div>
            )
        },
        {
            header: '諛쒖깮 ??꾩뒪?ы봽',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
                    <Clock size={14} className="text-primary opacity-40" />
                    {item.occrrncDe}
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '?쒕퉬???몃뱶',
            accessor: (item: any) => (
                <div className="space-y-1">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight line-clamp-1" title={item.srvcNm}>{item.srvcNm}</span>
                    <div className="flex items-center gap-1.5">
                        <Server size={10} className="text-muted-foreground opacity-30" />
                        <span className="text-[8px] font-bold text-muted-foreground tracking-widest uppercase opacity-40">諛깆뿏???쒕퉬??/span>
                    </div>
                </div>
            )
        },
        {
            header: '硫붿냼???명꽣?됱뀡',
            accessor: (item: any) => (
                <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
                    <span className="text-[10px] font-black text-primary tracking-tight font-mono">{item.methodNm}</span>
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '?붿껌??IP 二쇱냼',
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
            <PageHeader title="?쒖뒪??濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '?쒖뒪??濡쒓렇' }]} />

            <HubHeader title="?쒖뒪?? highlight="濡쒓렇 愿由? subtitle="?꾩껜 ?쒖뒪?쒖쓽 ?쒕퉬???붿껌 諛?硫붿냼???ㅽ뻾 ?대젰???ㅼ떆媛꾩쑝濡?議고쉶?섍퀬 遺꾩꽍?⑸땲??" icon={Terminal} 
                actions={
                    <div className="flex gap-4 p-2 items-center">
                        <HubStatusBadge label="濡쒓렇 ?ㅽ듃由??뺤긽" variant="success" className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black tracking-widest" />
                        <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">CSV ?대낫?닿린</Button>
                    </div>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="?꾩껜 濡쒓렇 嫄댁닔" value={pagination?.totalRecordCount ?? 0} icon={Database} color="primary" />
                <HubMetricCard title="?ㅻ뒛 諛쒖깮 嫄댁닔" value={84} icon={Activity} color="emerald" status="?뺤긽 ?섏쭛 以? />
                <HubMetricCard title="?몄쬆 ?ㅻ쪟" value={12} icon={ShieldAlert} color="rose" status="?댁긽 吏뺥썑" />
                <HubMetricCard title="?됯퇏 ?묐떟 ?띾룄" value="42MS" icon={Zap} color="amber" />
            </HubMetricGrid>

            <HubSectionCard title="濡쒓렇 ?곗씠??議고쉶" description="?섏쭛???쒖뒪??濡쒓렇 ?곗씠?곕? 議곌굔蹂꾨줈 ?꾪꽣留곹븯???곸꽭 ?댁뿭???뺤씤?⑸땲??" icon={SearchCode}>
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <select
                            value={params.searchCondition}
                            onChange={(e) => setParams(prev => ({ ...prev, searchCondition: e.target.value }))}
                            className="h-14 px-6 rounded-2xl border-2 border-border bg-slate-50 font-black text-[10px] tracking-widest uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-inner"
                        >
                            <option value="1">?붿껌 ID</option>
                            <option value="2">?쒕퉬?ㅻ챸</option>
                            <option value="3">硫붿냼?쒕챸</option>
                        </select>
                        <div className="relative group/search flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
                            <Input
                                placeholder="寃?됱뼱瑜??낅젰?섏꽭??.."
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

                <StandardDataTable columns={columns} data={logs} loading={isLoading} emptyMessage="濡쒓렇 ?ㅽ듃由쇱쓣 遺꾩꽍?????놁뒿?덈떎." className="border-none bg-transparent" />

                <div className="mt-12 flex justify-center">
                    {pagination && <PagePagination pagination={pagination} onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))} />}
                </div>
            </HubSectionCard>
        </div>
    );
}
