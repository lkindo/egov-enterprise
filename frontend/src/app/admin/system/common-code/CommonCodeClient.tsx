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
import { FormField } from '@/app/components/ui/standard-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Plus, 
    Settings, 
    Trash2, 
    Search, 
    Database, 
    LayoutGrid, 
    Fingerprint, 
    Key, 
    Tag, 
    FileJson, 
    Cpu, 
    Layers, 
    Activity, 
    Zap,
    Box,
    Hash,
    Maximize2
} from 'lucide-react';
import { DomainCluster, GroupCode, CodeDetail } from '@/types/common-code';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { cn } from '@/lib/utils';
import {
    saveCmmnCode as saveGroupCodeAction,
    deleteCmmnCode as deleteGroupCodeAction,
    saveCodeDetail as saveCodeDetailAction,
    deleteCodeDetail as deleteCodeDetailAction
} from '@/app/actions/codeActions';

interface CommonCodeClientProps {
    initialClusters: DomainCluster[];
}

export default function CommonCodeClient({ initialClusters }: CommonCodeClientProps) {
    const { toast } = useToast();
    const confirm = useConfirm();
    const [selectedCluster, setSelectedCluster] = useState<DomainCluster>(initialClusters[0]);
    const [selectedGroup, setSelectedGroup] = useState<GroupCode | null>(null);
    const [isModalOpen, setIsOpen] = useState(false);
    const [editingDetail, setEditingDetail] = useState<CodeDetail | null>(null);

    const handleEditDetail = (detail: CodeDetail) => {
        setEditingDetail(detail);
        setIsOpen(true);
    };

    const handleDeleteDetail = async (code: string) => {
        if (!selectedGroup) return;
        
        const ok = await confirm({
            title: '상세 코드 명세 삭제',
            message: '이 코드 정보를 데이터베이스에서 영구히 삭제하시겠습니까? 시스템 운영에 직접적인 영향을 줄 수 있습니다.',
            variant: 'destructive',
            confirmText: '영구 삭제 승인'
        });

        if (ok) {
            try {
                const res = await deleteCodeDetailAction(null, { codeId: selectedGroup.codeId, code });
                if (res.success) {
                    toast(res.message, 'success');
                } else {
                    toast(res.message, 'error');
                }
            } catch (error) {
                toast('데이터베이스 프로세싱 중 네트워크 오류가 발생했습니다.', 'error');
            }
        }
    };

    const handleCreateDetail = () => {
        if (!selectedGroup) {
            toast('코드 명세를 등록할 그룹 코드를 먼저 선택하십시오.', 'info');
            return;
        }
        setEditingDetail(null);
        setIsOpen(true);
    };

    const handleSubmitDetail = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        try {
            const res = await saveCodeDetailAction(null, {
                ...data,
                codeId: selectedGroup?.codeId,
                isNew: !editingDetail
            } as any);

            if (res.success) {
                toast(res.message, 'success');
                setIsOpen(false);
            } else {
                toast(res.message, 'error');
            }
        } catch (error) {
            toast('데이터 정합성 검증에 실패했습니다.', 'error');
        }
    };

    const columns = [
        {
            header: '코드 식별자',
            accessor: (item: CodeDetail) => (
                <div className="flex items-center gap-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Hash size={18} />
                    </div>
                    <div>
                        <span className="font-black tracking-tighter text-foreground block text-sm uppercase leading-none">{item.code}</span>
                        <span className="text-[8px] font-black text-muted-foreground tracking-[0.3em] mt-1.5 uppercase opacity-40">시스템 식별자</span>
                    </div>
                </div>
            )
        },
        {
            header: '논리 명칭',
            accessor: (item: CodeDetail) => (
                <div className="flex flex-col gap-1 py-1">
                    <span className="text-sm font-black text-foreground uppercase tracking-tight">{item.codeNm}</span>
                    <span className="text-[10px] font-bold text-muted-foreground/50 tracking-wide line-clamp-1">{item.codeDc}</span>
                </div>
            )
        },
        {
            header: '운영 상태',
            accessor: (item: CodeDetail) => <HubStatusBadge status={item.useAt === 'Y' ? '사용중' : '미사용'} />,
            className: 'w-32'
        },
        {
            header: '편집 콘솔',
            className: 'text-right w-32',
            accessor: (item: CodeDetail) => (
                <div className="flex justify-end gap-2 pr-4">
                    <Button variant="ghost" size="icon" className="h-10 w-10 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all font-black" onClick={() => handleEditDetail(item)}>
                        <Settings size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all" onClick={() => handleDeleteDetail(item.code)}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="엔터프라이즈 코드 거버넌스" breadcrumbs={[{ label: '시스템관리' }, { label: '공통코드 관리' }]} />

            <HubHeader 
                title="데이터" 
                highlight="공통 코드 관리" 
                subtitle="전사 도메인에서 공유되는 핵심 파라미터 및 코드북 데이터 레이어를 중앙 제축 관리합니다." 
                icon={Database} 
                actions={
                    <Button onClick={handleCreateDetail} size="lg" className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-2">
                        <Plus size={18} /> 코드 명세 등록
                    </Button>
                }
            />

            <HubMetricGrid>
                <HubMetricCard title="도메인 클러스터" value={initialClusters.length} icon={Layers} color="primary" />
                <HubMetricCard title="그룹 시퀀스" value={initialClusters.reduce((acc, c) => acc + c.groups.length, 0)} icon={LayoutGrid} color="emerald" status="활성" />
                <HubMetricCard title="전체 엔트리" value={2842} icon={FileJson} color="indigo" />
                <HubMetricCard title="시스템 정합성" value="99.9%" icon={Zap} color="amber" />
            </HubMetricGrid>

            <div className="grid grid-cols-12 gap-12">
                {/* Cluster Navigation */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-xl p-8 space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-lg font-black tracking-tighter uppercase flex items-center gap-3">
                                <Box className="text-primary" size={20} />
                                도메인 클러스터
                            </h3>
                            <span className="text-[10px] font-black tracking-widest text-slate-300 uppercase">아카이브 v2.0</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                            {initialClusters.map((cluster) => (
                                <button
                                    key={cluster.id}
                                    onClick={() => {
                                        setSelectedCluster(cluster);
                                        setSelectedGroup(null);
                                    }}
                                    className={cn(
                                        "group w-full p-6 h-28 rounded-[2rem] border-2 transition-all flex items-center gap-6 relative overflow-hidden",
                                        selectedCluster.id === cluster.id 
                                            ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]" 
                                            : "bg-slate-50 border-slate-50 hover:bg-white hover:border-slate-200 text-slate-400 hover:text-slate-900"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                                        selectedCluster.id === cluster.id ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
                                    )}>
                                        <Layers size={22} />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className={cn(
                                            "text-[9px] font-black tracking-widest uppercase mb-1",
                                            selectedCluster.id === cluster.id ? "text-white/40" : "text-slate-300"
                                        )}>도메인 스택</span>
                                        <span className="text-md font-black tracking-tighter uppercase leading-tight">{cluster.name}</span>
                                    </div>
                                    <div className={cn(
                                        "absolute right-8 top-1/2 -translate-y-1/2 flex flex-col items-end",
                                        selectedCluster.id === cluster.id ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                                    )}>
                                        <span className="text-xs font-black font-mono tracking-widest">{cluster.groups.length}</span>
                                        <span className="text-[7px] font-bold uppercase tracking-widest opacity-40">그룹</span>
                                    </div>
                                    {selectedCluster.id === cluster.id && (
                                        <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[3.5rem] bg-slate-900 p-10 text-white relative overflow-hidden shadow-2xl group">
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center gap-3">
                                <Cpu size={20} className="text-primary animate-pulse" />
                                <span className="text-[10px] font-black tracking-widest uppercase text-white/40">데이터 패브릭 분석</span>
                            </div>
                            <h4 className="text-2xl font-black tracking-tighter uppercase leading-none italic">코덱스 엔진</h4>
                            <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase opacity-60">
                                모든 정보 시스템의 메타데이터 및 유효성 검증 프로토콜을 관장하는 데이터 전송 시퀀스 엔진입니다.
                            </p>
                            <div className="pt-4 flex items-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-white/30 tracking-widest uppercase">지연 시간</span>
                                    <span className="text-lg font-black font-mono">2.4ms</span>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-white/30 tracking-widest uppercase">처리량</span>
                                    <span className="text-lg font-black font-mono text-emerald-400">92k/s</span>
                                </div>
                            </div>
                        </div>
                        <div className="absolute right-0 bottom-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-16 -mb-16 group-hover:scale-150 transition-transform duration-1000" />
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-12">
                    {/* Group Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {selectedCluster.groups.map((group) => (
                            <button
                                key={group.codeId}
                                onClick={() => setSelectedGroup(group)}
                                className={cn(
                                    "p-8 rounded-[2.5rem] border-2 transition-all flex items-center justify-between relative group/item overflow-hidden",
                                    selectedGroup?.codeId === group.codeId 
                                        ? "bg-white border-primary shadow-2xl ring-4 ring-primary/5" 
                                        : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-100"
                                )}
                            >
                                <div className="flex items-center gap-6 relative z-10">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-white shadow-inner border-2",
                                        selectedGroup?.codeId === group.codeId ? "border-primary/20 text-primary shadow-primary/5" : "border-slate-100 text-slate-300 group-hover/item:border-slate-200 group-hover/item:text-slate-900"
                                    )}>
                                        <Tag size={20} />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-black tracking-tight text-slate-900 uppercase">{group.codeIdNm}</span>
                                        <span className="text-[9px] font-mono font-black text-slate-400 tracking-widest uppercase">식별자: {group.codeId}</span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                                    selectedGroup?.codeId === group.codeId ? "bg-primary text-white scale-110 shadow-lg" : "bg-slate-100 text-slate-300 opacity-0 group-hover/item:opacity-100"
                                )}>
                                    <Maximize2 size={16} />
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Code Detail Table */}
                    {selectedGroup && (
                        <HubSectionCard title="도메인 코드 명세" description={`[${selectedGroup.codeIdNm}] 그룹에 속한 시스템 파라미터 상세 구성 내역입니다.`} icon={Fingerprint}>
                            <StandardDataTable columns={columns} data={selectedGroup.details} emptyMessage="정의된 코드 상세 내역이 데이터베이스에 존재하지 않습니다." className="border-none bg-transparent" />
                        </HubSectionCard>
                    )}
                </div>
            </div>

            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsOpen(false)}
                title={editingDetail ? '코드 아키텍처 편집' : '신규 명세 등록'}
                maxWidth="3xl"
                footer={
                    <div className="flex w-full gap-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
                        <Button form="code-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 group">
                            <Zap size={18} className="group-hover:animate-pulse" /> {editingDetail ? '명세 변경 사항 저장' : '데이터 레이어 배포'}
                        </Button>
                    </div>
                }
            >
                <form id="code-form" onSubmit={handleSubmitDetail} className="space-y-10 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            <FormField label="상위 그룹 코드 (그룹 ID)">
                                <Input value={selectedGroup?.codeId} disabled className="h-14 rounded-2xl bg-slate-100 border-none font-mono text-sm font-black shadow-inner" />
                            </FormField>
                            <FormField label="코드 식별자 (키)" required description="그룹 내에서 고유한 식별 대상을 지정하십시오.">
                                <div className="relative group/id">
                                    <Key size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/id:opacity-100 transition-opacity" />
                                    <Input 
                                        name="code" 
                                        defaultValue={editingDetail?.code} 
                                        required 
                                        readOnly={!!editingDetail}
                                        className="h-14 pl-16 rounded-2xl font-mono text-xs font-black shadow-inner"
                                        placeholder="고유 식별자 입력"
                                    />
                                </div>
                            </FormField>
                            <FormField label="논리 명칭 (레이블)" required>
                                <Input name="codeNm" defaultValue={editingDetail?.codeNm} required className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner" placeholder="코드 이름 입력" />
                            </FormField>
                        </div>
                        
                        <div className="space-y-8">
                            <FormField label="운영 상태 프로토콜">
                                <Select name="useAt" defaultValue={editingDetail?.useAt || 'Y'}>
                                    <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-[10px] tracking-widest uppercase shadow-inner">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl shadow-xl">
                                        <SelectItem value="Y" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase italic">--- 활성 ---</SelectItem>
                                        <SelectItem value="N" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-rose-500 italic">--- 비활성 ---</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label="상세 메타데이터 설명">
                                <textarea name="codeDc" defaultValue={editingDetail?.codeDc} className="w-full min-h-[160px] p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner" placeholder="코드의 용도 및 정의 설명..." />
                            </FormField>
                        </div>
                    </div>
                </form>
            </StandardModal>
        </div>
    );
}
