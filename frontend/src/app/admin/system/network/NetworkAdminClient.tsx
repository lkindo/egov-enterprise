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
            title: '인프라 노드 영구 삭제',
            message: '선택한 네트워크 노드를 시스템에서 제거하시겠습니까? 이 작업은 되돌릴 수 없으며 관련 연결이 즉시 차단됩니다.',
            variant: 'destructive',
            confirmText: '자산 삭제'
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
                toast('삭제 중 시스템 오류가 발생했습니다.', 'error');
            }
        }
    };


    const columns = [
        {
            header: '인프라 노드 ID',
            accessor: (item: Network) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Cpu size={18} />
                    </div>
                    <div className="text-left">
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item?.ntwrkId}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">INFRA_NODE_UUID</span>
                    </div>
                </div>
            )
        },
        {
            header: '네트워크 자산 정보',
            accessor: (item: Network) => (
                <div className="space-y-1 text-left">
                    <span className="text-sm font-black text-foreground uppercase tracking-tight">{item?.manageIem}</span>
                    <div className="flex items-center gap-2">
                        <Globe size={10} className="text-primary opacity-40" />
                        <span className="text-[10px] font-bold text-muted-foreground/60 tabular-nums lowercase">{item?.ntwrkIp}</span>
                    </div>
                </div>
            )
        },
        {
            header: '운영 상태',
            accessor: (item: Network) => (
                <HubStatusBadge 
                    label={item.useAt === 'Y' ? '정상 운영' : '운영 중지'} 
                    variant={item.useAt === 'Y' ? 'success' : 'secondary'} 
                />
            ),
            className: 'w-32'
        },
        {
            header: '관리 조정',
            className: 'text-right w-32',
            accessor: (item: Network) => (
                <div className="flex justify-end gap-2 pr-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all font-black" onClick={() => handleEdit(item)}>
                        <Settings size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all" onClick={() => handleDelete(item.ntwrkId)}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader 
                title="네트워크 토폴로지 관리" 
                breadcrumbs={[{ label: '시스템관리' }, { label: '네트워크 관리' }]} 
            />

            <HubHeader
                title="인프라"
                highlight="네트워크 노드 관리"
                subtitle="전사 서비스 노드의 IP 할당 정책, 게이트웨이 및 서브넷 구성을 물리적으로 매핑하여 관리합니다."
                icon={NetworkIcon}
                actions={
                    <Button onClick={handleCreate} size="lg" className="h-14 px-10 rounded-xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-2">
                        <Plus size={18} /> 신규 노드 등록
                    </Button>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="관리 대상 노드" value={(initialNetworks || []).filter(Boolean).length} icon={Server} color="primary" />
                <HubMetricCard title="할당 고정 IP" value={(initialNetworks || []).filter(n => n?.ntwrkIp).length} icon={Database} color="emerald" status="안전" />
                <HubMetricCard title="네트워크 가용성" value="99.9%" icon={Activity} color="amber" />
                <HubMetricCard title="평균 응답 속도" value="4ms" icon={Zap} color="indigo" />
            </HubMetricGrid>

            <HubSectionCard 
                title="인프라 노드 검색기" 
                description="시스템에 등록된 모든 가상 및 물리 네트워크 엔드포인트의 중앙 집중 관리 목록입니다." 
                icon={Database}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
                    <div className="flex flex-col md:flex-row gap-4 flex-1 text-left">
                        <div className="relative group/search flex-1">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                            <Input
                                placeholder="노드 명칭 또는 ID 기반 지형 검색.."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-16 pl-16 pr-8 rounded-xl bg-slate-50 border-2 border-slate-100 font-black text-md tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <StandardDataTable 
                    columns={columns} 
                    data={filteredNodes} 
                    emptyMessage="조회된 네트워크 자산이 없습니다." 
                    className="border-none bg-transparent" 
                />
            </HubSectionCard>

            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsOpen(false)}
                title={editingNode ? '인프라 노드 구성 편집' : '신규 네트워크 노드 프로비저닝'}
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
                                toast('데이터 유효성 검증 및 반영에 실패했습니다.', 'error');
                            }
                        }}
                    />
                </div>
            </StandardModal>
        </div>
    );
}
