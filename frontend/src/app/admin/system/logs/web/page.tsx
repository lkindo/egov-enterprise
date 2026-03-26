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
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
import { cn } from '@/lib/utils';
import { 
    Search, 
    Globe, 
    Activity, 
    Clock, 
    Database, 
    Zap, 
    Server,
    ShieldCheck,
    Network,
    SearchCode,
    Fingerprint,
    Timer,
    Terminal
} from "lucide-react";

export default function WebLogPage() {
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-logs-web', params],
        queryFn: () => systemLogAdminService.getWebLogs(params),
    });

    const logs = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const columns = [
        {
            header: '?붿껌 ?앸퀎??,
            accessor: (item: any) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Terminal size={18} />
                    </div>
                    <div>
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item.requstId}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">WEB_REQ_UUID</span>
                    </div>
                </div>
            )
        },
        {
            header: '諛쒖깮 ?쒖젏',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
                    <Clock size={14} className="text-primary opacity-40" />
                    {item.occrrncDe}
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '?붿껌 硫붿냼??,
            accessor: (item: any) => {
                const methodColors: any = {
                    'GET': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                    'POST': 'bg-primary/10 text-primary border-primary/20',
                    'PUT': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                    'DELETE': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                };
                return (
                    <div className={cn("px-3 py-1 rounded-lg border w-fit font-black text-[10px] tracking-widest uppercase", methodColors[item.method] || 'bg-slate-100 text-slate-500 border-border/50')}>
                        {item.method}
                    </div>
                );
            },
            className: 'w-24 text-center'
        },
        {
            header: '?꾨줈?몄떛 ?곗씠??,
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-foreground tabular-nums italic">
                    <Timer size={14} className="text-amber-500 opacity-40" />
                    {item.processTime}MS
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '?붿껌??IP (ADDR)',
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
            <PageHeader title="??濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '??濡쒓렇' }]} />

            <HubHeader title="??濡쒓렇" highlight="?곗씠??遺꾩꽍" subtitle="HTTP ?붿껌/?묐떟 諛????쒕퉬???덉씠?댁뿉??諛쒖깮?섎뒗 紐⑤뱺 ?섎컻??湲곕줉??遺꾩꽍?⑸땲??" icon={Globe} 
                actions={
                    <div className="flex gap-4 p-2 items-center">
                        <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">CSV ?대낫?닿린</Button>
                    </div>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="?꾩껜 濡쒓렇 嫄댁닔" value={pagination?.totalRecordCount ?? 0} icon={Database} color="primary" />
                <HubMetricCard title="?됯퇏 ?묐떟 ?띾룄" value="28.4ms" icon={Zap} color="emerald" status="?덉젙?? />
                <HubMetricCard title="蹂댁븞 ?꾪삊" value={0} icon={ShieldCheck} color="indigo" status="?뺤긽" />
                <HubMetricCard title="?쒓컙???붿껌" value="1.2k" icon={Activity} color="amber" />
            </HubMetricGrid>

            <HubSectionCard title="??濡쒓렇 ?곸꽭 議고쉶" description="?섏쭛?????쒕퉬??濡쒓렇瑜?議곌굔蹂꾨줈 ?꾪꽣留곹븯??遺꾩꽍?⑸땲??" icon={SearchCode}>
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <select
                            value={params.searchCondition}
                            onChange={(e) => setParams(prev => ({ ...prev, searchCondition: e.target.value }))}
                            className="h-14 px-6 rounded-2xl border-2 border-border bg-slate-50 font-black text-[10px] tracking-widest uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-inner"
                        >
                            <option value="1">?붿껌 ID</option>
                            <option value="2">?붿껌 IP</option>
                            <option value="3">硫붿냼?쒕챸</option>
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

                <StandardDataTable columns={columns} data={logs} loading={isLoading} emptyMessage="議고쉶????濡쒓렇 ?곗씠?곌? ?놁뒿?덈떎." className="border-none bg-transparent" />

                <div className="mt-12 flex justify-center">
                    {pagination && <PagePagination pagination={pagination} onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))} />}
                </div>
            </HubSectionCard>
        </div>
    );
}
