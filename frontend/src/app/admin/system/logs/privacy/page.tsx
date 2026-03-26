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
import { 
    Search, 
    ShieldAlert, 
    Activity, 
    Clock, 
    Database, 
    Zap, 
    UserCheck,
    Lock,
    Eye,
    Fingerprint,
    SearchCode,
    Timer,
    Terminal
} from "lucide-react";

export default function PrivacyLogPage() {
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-logs-privacy', params],
        queryFn: () => systemLogAdminService.getPrivacyLogs(params),
    });

    const logs = data?.resultList || [];
    const pagination = data?.paginationInfo;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setParams(prev => ({ ...prev, pageIndex: 1 }));
    };

    const columns = [
        {
            header: '?ъ슜???뺣낫',
            accessor: (item: any) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <UserCheck size={18} />
                    </div>
                    <div>
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item.rqsterNm}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">{item.rqesterId}</span>
                    </div>
                </div>
            )
        },
        {
            header: '?묎렐 ?쒖젏',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
                    <Clock size={14} className="text-secondary opacity-40" />
                    {item.occrrncDe}
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '???硫붾돱/湲곕뒫',
            accessor: (item: any) => (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-foreground uppercase tracking-tight">{item.trgetMenuNm}</span>
                </div>
            )
        },
        {
            header: '議고쉶 ?ъ쑀/紐⑹쟻',
            accessor: (item: any) => (
                <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
                    <span className="text-[10px] font-black text-slate-500 tracking-tight">{item.inqireCn}</span>
                </div>
            )
        },
        {
            header: '?묒냽 IP (ADDR)',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    {item.rqesterIp}
                </div>
            ),
            className: 'w-40'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="媛쒖씤?뺣낫 ?묎렐 濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '媛쒖씤?뺣낫 ?묎렐 濡쒓렇' }]} />

            <HubHeader title="蹂댁븞 嫄곕쾭?뚯뒪" highlight="媛쒖씤?뺣낫 ?묎렐 濡쒓렇" subtitle="以묒슂 媛쒖씤?뺣낫 ?곗씠?곗뿉 ????ъ슜???묎렐 諛?議고쉶 ?대젰???꾧꺽?섍쾶 愿由ы븯怨?異붿쟻?⑸땲??" icon={ShieldAlert} 
                actions={
                    <div className="flex gap-4 p-2 items-center">
                        <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">CSV ?대낫?닿린</Button>
                    </div>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="?꾩껜 ?묎렐 嫄댁닔" value={pagination?.totalRecordCount ?? 0} icon={Database} color="primary" />
                <HubMetricCard title="?ㅻ뒛 ?묎렐 ?댁긽" value={0} icon={Eye} color="emerald" status="?덉쟾" />
                <HubMetricCard title="鍮꾩씤媛 ?쒕룄" value={0} icon={Lock} color="rose" status="?뺤긽" />
                <HubMetricCard title="?됯퇏 ?덉씠?댁떆" value="22MS" icon={Zap} color="amber" />
            </HubMetricGrid>

            <HubSectionCard title="媛쒖씤?뺣낫 ?묎렐 ?대젰 議고쉶" description="?섏쭛??媛쒖씤?뺣낫 ?묎렐 濡쒓렇瑜?議곌굔蹂꾨줈 ?꾪꽣留곹븯???댁긽 吏뺥썑瑜?遺꾩꽍?⑸땲??" icon={SearchCode}>
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <select
                            value={params.searchCondition}
                            onChange={(e) => setParams(prev => ({ ...prev, searchCondition: e.target.value }))}
                            className="h-14 px-6 rounded-2xl border-2 border-border bg-slate-50 font-black text-[10px] tracking-widest uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-inner"
                        >
                            <option value="1">?ъ슜?먮챸</option>
                            <option value="2">?ъ슜??ID</option>
                            <option value="3">硫붾돱紐?/option>
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

                <StandardDataTable columns={columns} data={logs} loading={isLoading} emptyMessage="議고쉶??媛쒖씤?뺣낫 ?묎렐 濡쒓렇媛 ?놁뒿?덈떎." className="border-none bg-transparent" />

                <div className="mt-12 flex justify-center">
                    {pagination && <PagePagination pagination={pagination} onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))} />}
                </div>
            </HubSectionCard>
        </div>
    );
}
