'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NetworkForm } from '@/components/admin/system/NetworkForm';
import {
    Plus,
    Network as NetworkIcon,
    Server,
    Activity,
    Shield,
    Cpu,
    Settings,
    Trash2,
    Search,
    Zap,
    Globe,
    Database,
} from 'lucide-react';
import type { Network } from '@/services/foundation/system/NetworkAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
    saveNetworkAction as saveNetworkNodeAction,
    deleteNetworkAction as deleteNetworkNodeAction
} from '@/app/actions/networkActions';

interface NetworkAdminClientProps {
    initialNetworks: Network[];
}

export default function NetworkAdminClient({ initialNetworks }: NetworkAdminClientProps) {
    const { toast } = useToast();
    const confirm = useConfirm();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<Network | null>(null);

    const filteredNodes = (initialNetworks || []).filter(node => node && (
        String(node.manageIem || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(node.ntwrkId || '').toLowerCase().includes(searchTerm.toLowerCase())
    ));

    const handleCreate = () => {
        setEditingNode(null);
        setIsOpen(true);
    };

    const handleEdit = (node: Network) => {
        setEditingNode(node);
        setIsOpen(true);
    };

    const handleDelete = async (id: string) => {
        const ok = await confirm({
            title: '?�프???�드 ?�구 ??��',
            message: '?�택???�트?�크 ?�드�??�스?�에???�거?�시겠습?�까? ???�업?� ?�돌�????�으�?관???�결??즉시 차단?�니??',
            variant: 'destructive',
            confirmText: '?�산 ??��'
        });

        if (ok) {
            try {
                const res = await deleteNetworkNodeAction(id);
                if (res.success) {
                    toast(res.message, 'success');
                } else {
                    toast(res.message, 'error');
                }
            } catch (error) {
                toast('??�� �??�스???�류가 발생?�습?�다.', 'error');
            }
        }
    };


    const columns = [
        {
            header: '?�프???�드 ID',
            accessor: (item: Network) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Cpu size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-bold tracking-tight text-foreground block text-sm uppercase leading-none">{item?.ntwrkId}</span>
                        <span className="text-xs font-bold text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">INFRA_NODE_UUID</span>
                    </div>
                </div>
            )
        },
        {
            header: '?�트?�크 ?�산 ?�보',
            accessor: (item: Network) => (
                <div className="space-y-1 text-left">
                    <span className="text-sm font-bold text-foreground uppercase tracking-tight">{item?.manageIem}</span>
                    <div className="flex items-center gap-2">
                        <Globe size={10} className="text-primary opacity-40" />
                        <span className="text-xs font-bold text-muted-foreground/60 tabular-nums lowercase">{item?.ntwrkIp}</span>
                    </div>
                </div>
            )
        },
        {
            header: '?�영 ?�태',
            accessor: (item: Network) => (
                <HubStatusBadge 
                    label={item.useAt === 'Y' ? '?�상 ?�영' : '?�영 중�?'} 
                    variant={item.useAt === 'Y' ? 'success' : 'secondary'} 
                />
            ),
            className: 'w-32'
        },
        {
            header: '관�?조정',
            className: 'text-right w-32',
            accessor: (item: Network) => (
                <div className="flex justify-end gap-2 pr-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg border border-slate-200 transition-all font-bold" onClick={() => handleEdit(item)}>
                        <Settings size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-lg transition-all" onClick={() => handleDelete(item.ntwrkId)}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader 
                title="?�트?�크 ?�폴로�? 관�? 
                breadcrumbs={[{ label: '?�스?��?�? }, { label: '?�트?�크 관�? }]} 
            />

            <HubHeader
                title="?�프??
                highlight="?�트?�크 ?�드 관�?
                subtitle="?�사 ?�비???�드??IP ?�당 ?�책, 게이?�웨??�??�브??구성??물리?�으�?매핑?�여 관리합?�다."
                icon={NetworkIcon}
                actions={
                    <Button onClick={handleCreate} size="lg" className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-2">
                        <Plus size={18} /> ?�규 ?�드 ?�록
                    </Button>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="관�??�???�드" value={(initialNetworks || []).filter(Boolean).length} icon={Server} color="primary" />
                <HubMetricCard title="?�당 고정 IP" value={(initialNetworks || []).filter(n => n?.ntwrkIp).length} icon={Database} color="emerald" status="?�전" />
                <HubMetricCard title="?�트?�크 가?�성" value="99.9%" icon={Activity} color="amber" />
                <HubMetricCard title="?�균 ?�답 ?�도" value="4ms" icon={Zap} color="indigo" />
            </HubMetricGrid>

            <HubSectionCard 
                title="?�프???�드 검?�기" 
                description="?�스?�에 ?�록??모든 가??�?물리 ?�트?�크 ?�드?�인?�의 중앙 집중 관�?목록?�니??" 
                icon={Database}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1 text-left">
                        <div className="relative group/search flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                            <Input
                                placeholder="?�드 명칭 ?�는 ID 기반 지??검??."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-12 pl-16 pr-8 rounded-lg bg-slate-50 border-2 border-slate-100 font-bold text-md tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <StandardDataTable 
                    columns={columns} 
                    data={filteredNodes} 
                    emptyMessage="조회???�트?�크 ?�산???�습?�다." 
                    className="border-none bg-transparent" 
                />
            </HubSectionCard>

            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsOpen(false)}
                title={editingNode ? '?�프???�드 구성 ?�집' : '?�규 ?�트?�크 ?�드 ?�로비�???}
                maxWidth="3xl"
            >
                <div className="pt-4 text-left">
                    <NetworkForm 
                        initialData={editingNode || {}} 
                        onCancel={() => setIsOpen(false)}
                        onSubmit={async (values) => {
                            try {
                                const formData = new FormData();
                                Object.entries(values).forEach(([key, value]) => {
                                    if (value !== undefined) formData.append(key, String(value));
                                });
                                
                                const res = await saveNetworkNodeAction(null, formData);
                                if (res.success) {
                                    toast(res.message, 'success');
                                    setIsOpen(false);
                                    // Note: In a real app, we might need to refresh data or use optimistic updates
                                    // Here we assume Server Action triggers revalidation or we refresh manually
                                    window.location.reload(); 
                                } else {
                                    toast(res.message, 'error');
                                }
                            } catch (error) {
                                toast('?�이???�효??검�?�?반영???�패?�습?�다.', 'error');
                            }
                        }}
                    />
                </div>
            </StandardModal>
        </div>
    );
}
