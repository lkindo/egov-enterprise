'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { operationAdminService } from '@/services/foundation/operation/OperationAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Plus,  Search,  Users,  ShieldCheck,  Zap,  RefreshCcw,  Layers } from 'lucide-react';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ExternalHrClient({ initialData }: { initialData: any[] }) {
    const [data, setData] = useState(initialData || []);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const { toast } = useToast();

    const loadData = async (name: string = searchKeyword) => {
        try {
            setLoading(true);
            const res = await operationAdminService.getExternalHrList({ name });
            setData(res.list || []);
        } catch (error) {
            toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const columns: Column<any>[] = [
        { 
            header: '번호', 
            accessor: (_, index) => (
                <span className="font-mono text-xs font-bold text-slate-400">
                    {(index !== undefined ? index + 1 : 0).toString().padStart(2, '0')}
                </span>
            ),
            className: 'w-20 text-center'
        },
        { 
            header: '성명', 
            accessor: (item: any) => (
                <span className="font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">{item.extrlHrNm}</span>
            )
        },
        { 
            header: '소속기관', 
            accessor: (item: any) => (
                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.psitnInsttNm}</span>
            )
        },
        { 
            header: '연락처', 
            accessor: (item: any) => (
                <span className="text-xs font-bold text-slate-400 tabular-nums tracking-tighter">
                    {`${item.areaNo}-${item.middleTelno}-${item.endTelno}`}
                </span>
            ),
            className: 'w-40'
        },
        { 
            header: '이메일', 
            accessor: (item: any) => (
                <span className="text-xs font-bold text-slate-400 tracking-tight">{item.emailAdres}</span>
            )
        },
        { 
            header: '생년월일', 
            accessor: (item: any) => (
                <span className="text-xs font-bold text-slate-300 tabular-nums tracking-widest">{item.brthdy}</span>
            ),
            className: 'w-32 text-right pr-8'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader
                title="외부 인사 인벤토리"
                breadcrumbs={[{ label: '운영지원' }, { label: '행사관리' }, { label: '외부인사정보' }]}
            />

            <HubHeader
                title="External"
                highlight="Personnel"
                subtitle="조직과 협력하는 외부 전문가 및 인사 정보를 통합 관리합니다."
                icon={Users}
                actions={
                    <div className="flex gap-4">
                        <Button
                            variant="outline"
                            onClick={() => loadData()}
                            className="h-11 w-14 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm"
                        >
                            <RefreshCcw size={20} />
                        </Button>
                        <Button className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
                            <Plus size={20} /> 인사 등록
                        </Button>
                    </div>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="전체 인사" value={data.length} icon={Layers} color="primary" />
                <HubMetricCard title="보안 검증" value="PASS" icon={ShieldCheck} color="emerald" status="안전함" />
                <HubMetricCard title="활성 노드" value={data.filter(i => i.emailAdres).length} icon={Zap} color="amber" />
                <HubMetricCard title="데이터 상태" value="정상" icon={RefreshCcw} color="indigo" />
            </HubMetricGrid>

            <HubSectionCard
                title="인사 정보 매트릭스"
                description="협력 관계에 있는 외부 인사들의 핵심 메타데이터 스트림입니다."
                icon={Users}
                className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
            >
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
                        <form onSubmit={(e) => { e.preventDefault(); loadData(); }} className="flex items-center gap-4 relative group/search max-w-xl w-full">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
                            <Input
                                placeholder="인사 성명으로 검색..."
                                className="h-11 pl-16 rounded-xl border-none bg-slate-50/50 text-sm font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                            />
                            <Button type="submit" className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">SEARCH</Button>
                        </form>
                    </div>

                    <div className="min-h-[500px]">
                        <StandardDataTable
                            columns={columns}
                            data={data}
                            loading={loading}
                            emptyMessage="등록된 외부인사 정보가 없습니다."
                            isPremium={true}
                            className="border-none bg-transparent shadow-none"
                        />
                    </div>
                </div>
            </HubSectionCard>
        </div>
    );
}
