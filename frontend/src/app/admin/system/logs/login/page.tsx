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
    LogIn, 
    Activity, 
    Clock, 
    Database, 
    ShieldCheck, 
    UserCheck,
    Key,
    Lock,
    SearchCode,
    Fingerprint,
    LayoutGrid
} from "lucide-react";

export default function LoginLogPage() {
    const [params, setParams] = useState<SearchParams>({
        pageIndex: 1,
        searchCondition: '1',
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-logs-login', params],
        queryFn: () => systemLogAdminService.getLoginLogs(params),
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
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item.loginNm}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">{item.loginId}</span>
                    </div>
                </div>
            )
        },
        {
            header: '?묒냽 ?쒖젏',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
                    <Clock size={14} className="text-secondary opacity-40" />
                    {item.loginDt}
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '?몄쬆 諛⑹떇',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
                    <Key size={12} className="text-muted-foreground opacity-40" />
                    <span className="text-[10px] font-black text-foreground tracking-tight uppercase">{item.loginMthd}</span>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '?몄쬆 ?곹깭',
            accessor: (item: any) => (
                <HubStatusBadge label="?몄쬆 ?꾨즺" variant="success" className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 text-[9px] font-black tracking-widest" />
            ),
            className: 'w-24 text-center'
        },
        {
            header: '?묒냽 IP (ADDR)',
            accessor: (item: any) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <LogIn size={12} className="opacity-30" />
                    {item.loginIp}
                </div>
            ),
            className: 'w-40'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="濡쒓렇??濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '濡쒓렇??濡쒓렇' }]} />

            <HubHeader title="?묒냽 蹂댁븞" highlight="濡쒓렇??濡쒓렇" subtitle="?쒖뒪??蹂댁븞 媛뺥솕瑜??꾪븳 ?ъ슜?먮퀎 ?묒냽 ?대젰 諛??몄쬆 ?곹깭瑜??ㅼ떆媛꾩쑝濡?紐⑤땲?곕쭅?⑸땲??" icon={Lock} 
                actions={
                    <div className="flex gap-4 p-2 items-center">
                        <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">CSV ?대낫?닿린</Button>
                    </div>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="?꾩껜 ?묒냽 嫄댁닔" value={pagination?.totalRecordCount ?? 0} icon={Database} color="primary" />
                <HubMetricCard title="?꾩옱 ?묒냽?? value={42} icon={UserCheck} color="emerald" status="?덉쟾" />
                <HubMetricCard title="鍮꾩젙???쒕룄" value={3} icon={Lock} color="rose" status="二쇱쓽 ?붾쭩" />
                <HubMetricCard title="?몄쬆 ?깃났瑜? value="99.4%" icon={ShieldCheck} color="indigo" />
            </HubMetricGrid>

            <HubSectionCard title="?묒냽 ?대젰 議고쉶" description="?섏쭛??濡쒓렇???대젰??議곌굔蹂꾨줈 ?꾪꽣留곹븯???ъ슜???묒냽 寃쎈줈瑜??뺤씤?⑸땲??" icon={SearchCode}>
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        <select
                            value={params.searchCondition}
                            onChange={(e) => setParams(prev => ({ ...prev, searchCondition: e.target.value }))}
                            className="h-14 px-6 rounded-2xl border-2 border-border bg-slate-50 font-black text-[10px] tracking-widest uppercase outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer shadow-inner"
                        >
                            <option value="1">?ъ슜?먮챸</option>
                            <option value="2">?ъ슜??ID</option>
                            <option value="3">?묒냽 IP</option>
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

                <StandardDataTable columns={columns} data={logs} loading={isLoading} emptyMessage="議고쉶??濡쒓렇???대젰???놁뒿?덈떎." className="border-none bg-transparent" />

                <div className="mt-12 flex justify-center">
                    {pagination && <PagePagination pagination={pagination} onPageChange={(page) => setParams(prev => ({ ...prev, pageIndex: page }))} />}
                </div>
            </HubSectionCard>
        </div>
    );
}
