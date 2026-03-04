'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { SmartSearchPanel } from '@/app/components/ui/standard-search-filter';
import { congratulationService, CongratulationManage } from '@/services/congratulationService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
    Heart,
    Gift,
    Calendar,
    Plus,
    Trash2,
    CheckCircle2,
    Sparkles,
    Clock,
    ArrowRightCircle,
    ShieldCheck,
    Search,
    Settings,
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { CongratulationForm } from '@/components/admin/system/CongratulationForm';
import { useRouter } from 'next/navigation';

export default function CongratulationClient({ initialData, searchUsid }: { initialData: { content: CongratulationManage[] }; searchUsid: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [selectedCtsnn, setSelectedCtsnn] = useState<CongratulationManage | undefined>(undefined);

    const ctsnnList = initialData.content || [];

    const handleOpenCreate = () => {
        setMode('create');
        setSelectedCtsnn(undefined);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: CongratulationManage) => {
        setMode('edit');
        setSelectedCtsnn(item);
        setIsModalOpen(true);
    };

    const handleSubmit = async (formData: Partial<CongratulationManage>) => {
        try {
            if (mode === 'create') {
                await congratulationService.createCtsnn(formData);
                toast('신규 경조사 프로토콜이 성공적으로 등록되었습니다.', 'success');
            } else {
                await congratulationService.updateCtsnn(selectedCtsnn!.ctsnnId, formData);
                toast('경조사 정보가 시스템 전반에 업데이트되었습니다.', 'success');
            }
            setIsModalOpen(false);
            router.refresh();
        } catch (error) {
            toast('저장 중 오류가 발생했습니다.', 'error');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const isConfirmed = await confirm({
            title: '경조사 데이터 소거 프로토콜',
            message: `[${name}] 경조사 기록을 영구히 삭제하시겠습니까? 복리후생 연동 데이터 무결성에 주의하십시오.`,
            variant: 'destructive',
            confirmText: 'Purge Archive'
        });
        if (isConfirmed) {
            try {
                await congratulationService.deleteCtsnn(id);
                toast('데이터가 성공적으로 소거되었습니다.', 'success');
                router.refresh();
            } catch (error) {
                toast('삭제 중 오류가 발생했습니다.', 'error');
            }
        }
    };

    const handleApprove = async (id: string, name: string) => {
        const isConfirmed = await confirm({
            title: '베네핏 지급 승인',
            message: `[${name}] 경조사에 대한 베네핏 지급 프로토콜을 승인하시겠습니까?`,
            confirmText: 'Authorize Payment'
        });
        if (isConfirmed) {
            try {
                await congratulationService.approveCtsnn(id);
                toast('지급 승인 처리가 완료되었습니다.', 'success');
                router.refresh();
            } catch (error) {
                toast('승인 중 오류가 발생했습니다.', 'error');
            }
        }
    };

    const columns: ColumnDef<CongratulationManage>[] = [
        {
            id: 'ctsnnCode',
            header: 'Event Category',
            width: 140,
            accessor: (item: CongratulationManage) => (
                <span className={cn(
                    "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest border-2 shadow-inner",
                    item.ctsnnCode === '1' ? "bg-pink-50/50 border-pink-100 text-pink-600" :
                        item.ctsnnCode === '2' ? "bg-slate-50/50 border-slate-100 text-slate-600" :
                            "bg-blue-50/50 border-blue-100 text-blue-600"
                )}>
                    {item.ctsnnCode === '1' ? 'Ceremony' : item.ctsnnCode === '2' ? 'Obituary' : 'Legacy'}
                </span>
            )
        },
        {
            id: 'ctsnnNm',
            header: 'Nomenclature',
            width: 250,
            accessor: (item: CongratulationManage) => (
                <div className="flex flex-col gap-1 py-1">
                    <span className="font-black italic uppercase tracking-tighter text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors">{item.ctsnnNm}</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest opacity-60 italic">Chain ID: {item.ctsnnId}</span>
                    </div>
                </div>
            )
        },
        {
            id: 'target',
            header: 'Relationship Matrix',
            width: 220,
            accessor: (item: CongratulationManage) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-300 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-inner">
                        <User size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700 italic uppercase tabular-nums">{item.trgetNm}</span>
                        <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase italic opacity-40">Rel: CODE_{item.relate}</span>
                    </div>
                </div>
            )
        },
        {
            id: 'occrrncDe',
            header: 'Temporal Point',
            width: 150,
            accessor: (item: CongratulationManage) => (
                <div className="flex items-center gap-2 text-slate-500 font-mono font-black text-xs">
                    <Calendar size={14} className="opacity-30" />
                    {item.occrrncDe}
                </div>
            )
        },
        {
            id: 'confmAt',
            header: 'Authorization Logic',
            width: 180,
            accessor: (item: CongratulationManage) => (
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        item.confmAt === 'Y' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                    )} />
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-[0.2em] italic font-mono",
                        item.confmAt === 'Y' ? "text-emerald-600" : "text-slate-400 opacity-60"
                    )}>
                        {item.confmAt === 'Y' ? 'VERIFIED_PAYMENT' : 'AWAITING_AUTH'}
                    </span>
                </div>
            )
        },
        {
            id: 'actions',
            header: 'PROTOCOL CONTROL',
            className: 'text-right',
            accessor: (item: CongratulationManage) => (
                <div className="flex justify-end gap-2 pr-4">
                    {item.confmAt !== 'Y' && (
                        <button
                            onClick={() => handleApprove(item.ctsnnId, item.ctsnnNm)}
                            className="h-11 px-6 bg-emerald-600 text-white rounded-[1.25rem] text-[10px] font-black uppercase italic tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-600/10 flex items-center gap-2"
                            title="승인"
                        >
                            <CheckCircle2 size={16} strokeWidth={3} /> Authorize
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenEdit(item)}
                        className="h-11 w-11 bg-slate-900/5 text-slate-900 hover:text-white hover:bg-slate-900 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95"
                    >
                        <Settings size={18} />
                    </button>
                    <button
                        onClick={() => handleDelete(item.ctsnnId, item.ctsnnNm)}
                        className="h-11 w-11 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-white hover:border-rose-100 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <PageHeader
                title="엔터프라이즈 경조사 인텔리전스"
                breadcrumbs={[{ label: '시스템관리' }, { label: '경조사관리' }]}
                actions={
                    <Button
                        onClick={handleOpenCreate}
                        className="h-16 px-10 rounded-[1.5rem] font-black shadow-[0_20px_40px_rgba(15,23,42,0.15)] bg-slate-900 text-white gap-3 hover:-translate-y-1 transition-all active:scale-95 italic uppercase tracking-widest text-[11px] border border-white/10"
                    >
                        <Plus size={20} strokeWidth={3} /> Deploy Event Protocol
                    </Button>
                }
            />

            {/* Stats Matrix Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-10 rounded-[3.5rem] bg-white border border-slate-100 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-pink-200 transition-all">
                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div className="w-16 h-16 rounded-[1.75rem] bg-pink-600 text-white flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
                            <Heart size={28} />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic font-mono">Current Month Vectors</div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-5xl font-black italic tracking-tighter tabular-nums mb-2">{ctsnnList.length} Events</h4>
                        <p className="text-[10px] text-pink-600/60 font-black uppercase tracking-widest">Protocol Integrity Normal</p>
                    </div>
                    <Heart size={180} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                </div>

                <div className="p-10 rounded-[3.5rem] bg-white border border-slate-100 shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:border-orange-200 transition-all">
                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div className="w-16 h-16 rounded-[1.75rem] bg-orange-600 text-white flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
                            <ShieldCheck size={28} />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic font-mono">Verification Pool</div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-5xl font-black italic tracking-tighter tabular-nums mb-2">
                            {ctsnnList.filter(i => i.confmAt === 'N').length} Unpaid
                        </h4>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Awaiting Fiscal Clearance</p>
                    </div>
                    <ShieldCheck size={180} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
                </div>

                <div className="p-10 rounded-[3.5rem] bg-slate-900 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-all">
                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div className="w-16 h-16 rounded-[1.75rem] bg-white/10 text-primary flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform backdrop-blur-xl border border-white/20">
                            <Gift size={28} className="text-primary" />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic font-mono">Historical Chain</div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-5xl font-black italic tracking-tighter mb-2 tabular-nums">{ctsnnList.length} Nodes</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Benefit Dispersals</p>
                    </div>
                    <Gift size={200} className="absolute right-[-40px] bottom-[-40px] opacity-[0.05] -rotate-6 group-hover:rotate-0 transition-transform duration-1000" />
                </div>
            </div>

            {/* Enterprise Info Domain */}
            <div className="p-10 bg-white rounded-[4rem] border border-slate-100 shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group/info ring-1 ring-slate-50">
                <div className="w-24 h-24 bg-slate-50 rounded-[2.25rem] flex items-center justify-center shadow-inner group-hover/info:scale-105 transition-transform">
                    <Sparkles size={40} className="text-primary" />
                </div>
                <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
                    <h4 className="text-3xl font-black italic tracking-tighter uppercase tabular-nums">Corporate Social Support Shield</h4>
                    <p className="text-base text-slate-500 font-bold leading-relaxed max-w-3xl italic">
                        임직원의 주요 생애 이벤트를 트래킹하고 기업 차원의 복리후생 지원을 자동화하십시오. 모든 승인 내역은 <span className="text-primary font-black italic">Next-ERP</span> 환경에서 투명하게 관리되며, 부서별 경조사 동향을 실시간으로 분석할 수 있습니다.
                    </p>
                </div>
                <ArrowRightCircle size={150} className="absolute right-[-40px] top-[-40px] opacity-[0.02] -rotate-12 group-hover/info:rotate-0 transition-transform duration-1000" />
            </div>

            {/* Global Search Panel */}
            <div className="p-10 rounded-[4rem] bg-slate-50 border border-slate-100 shadow-inner group relative overflow-hidden">
                <SmartSearchPanel
                    fields={[
                        { name: 'usid', label: 'Asset Identity (UID)', type: 'text', placeholder: 'Enter node identifier or employee ID...' }
                    ]}
                    onSearch={(v: any) => {
                        router.push(`/admin/system/congratulations?usid=${v.usid || ''}`);
                    }}
                    onReset={() => router.push('/admin/system/congratulations')}
                />
                <Search size={150} className="absolute right-[-30px] bottom-[-30px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none" />
            </div>

            {/* Main Matrix Hub */}
            <div className="bg-white rounded-[5rem] p-6 shadow-[0_60px_100px_rgba(0,0,0,0.08)] border border-slate-100 relative group/matrix ring-1 ring-slate-200/50">
                <UltimateDataGrid
                    title="EVENT PROTOCOL AUTHORIZATION MATRIX"
                    columns={columns}
                    data={ctsnnList}
                    emptyMessage="관측된 경조사 데이터 포인트가 존재하지 않습니다."
                    className="bg-slate-50/50 p-10 rounded-[4rem] border border-dashed border-slate-200"
                    keyField="ctsnnId"
                />
                <div className="flex justify-center items-center gap-12 mt-12 text-[10px] font-black italic text-slate-300 tracking-[0.4em] uppercase opacity-40">
                    <div className="flex items-center gap-3">
                        <Clock size={12} className="animate-pulse" />
                        PROTOCOL SYNC: NOMINAL
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    <div className="flex items-center gap-3">
                        <ShieldCheck size={12} />
                        FISCAL GOVERNANCE: SECURED
                    </div>
                </div>
            </div>

            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={mode === 'create' ? 'Broadcast New Event Protocol' : 'Refine Event Matrix Blueprint'}
                maxWidth="lg"
            >
                <div className="p-4">
                    <CongratulationForm
                        initialData={selectedCtsnn}
                        onSubmit={handleSubmit}
                        onCancel={() => setIsModalOpen(false)}
                    />
                </div>
            </StandardModal>
        </div>
    );
}