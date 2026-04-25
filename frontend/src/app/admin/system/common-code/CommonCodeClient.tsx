'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
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
    Tag,
    Cpu,
    Layers,
    Box,
    Hash,
    Maximize2,
    ChevronRight,
    SearchSlash,
    RefreshCcw
} from 'lucide-react';
import { DomainCluster, GroupCode, CodeDetail } from '@/types/foundation/code';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { cn } from '@/lib/utils';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import {
    saveCmmnCode as saveGroupCodeAction,
    deleteCmmnCode as deleteGroupCodeAction,
    saveCodeDetail as saveCodeDetailAction,
    deleteCodeDetail as deleteCodeDetailAction
} from '@/app/actions/codeActions';
import { CmmnClCode, CmmnCode } from '@/types/foundation/system';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
    Form,
    FormControl,
    FormField as ShadcnFormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';

const codeDetailSchema = z.object({
    code: z.string().min(1, '코드는 필수 입력 사항입니다.'),
    codeNm: z.string().min(1, '코드 명칭은 필수 입력 사항입니다.'),
    useAt: z.enum(['Y', 'N']),
    codeDc: z.string().optional()
});

type CodeDetailFormValues = z.infer<typeof codeDetailSchema>;

interface CommonCodeClientProps {
    clCodes: CmmnClCode[];
    groups: CmmnCode[];
    details: CodeDetail[];
    selectedGroupId: string | null;
}

export default function CommonCodeClient({
    clCodes,
    groups,
    details,
    selectedGroupId
}: CommonCodeClientProps) {
    const router = useRouter();
    const { toast } = useToast();
    const confirm = useConfirm();

    // --- State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsOpen] = useState(false);
    const [editingDetail, setEditingDetail] = useState<CodeDetail | null>(null);

    const form = useAppForm(codeDetailSchema, {
        defaultValues: {
            code: '',
            codeNm: '',
            useAt: 'Y',
            codeDc: ''
        }
    });

    useEffect(() => {
        if (isModalOpen) {
            if (editingDetail) {
                form.reset({
                    code: editingDetail.code,
                    codeNm: editingDetail.codeNm,
                    useAt: (editingDetail.useAt as 'Y' | 'N') || 'Y',
                    codeDc: editingDetail.codeDc || ''
                });
            } else {
                form.reset({
                    code: '',
                    codeNm: '',
                    useAt: 'Y',
                    codeDc: ''
                });
            }
        }
    }, [isModalOpen, editingDetail, form]);

    const initialClusters: DomainCluster[] = React.useMemo(() => {
        const safeClCodes = Array.isArray(clCodes) ? clCodes.filter(Boolean) : [];
        const safeGroups = Array.isArray(groups) ? groups.filter(Boolean) : [];
        const safeDetails = Array.isArray(details) ? details.filter(Boolean) : [];

        return safeClCodes.map(cl => ({
            ...(cl as CmmnClCode),
            id: cl.clCode,
            name: cl.clCodeNm,
            icon: Layers,
            groups: safeGroups
                .filter(g => g.clCode === cl.clCode)
                .map(g => ({
                    ...(g as CmmnCode),
                    id: g.codeId,
                    codeId: g.codeId,
                    name: g.codeIdNm,
                    icon: LayoutGrid,
                    description: g.codeIdDc,
                    details: g.codeId === selectedGroupId ? safeDetails : []
                }))
        }));
    }, [clCodes, groups, details, selectedGroupId]);

    const [selectedCluster, setSelectedCluster] = useState<DomainCluster>(
        initialClusters[0] || {
            id: '', name: '전체', groups: [],
            clCode: '', clCodeNm: '', clCodeDc: '', useAt: 'N'
        }
    );
    const [selectedGroup, setSelectedGroup] = useState<GroupCode | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Fetch Details on the client side to avoid full page reloads
    const loadGroupDetails = async (group: GroupCode) => {
        try {
            setDetailsLoading(true);

            // 1. Fetch details from API with robust filtering parameters
            const res = await codeAdminService.getDetailCodeList({
                codeId: group.codeId,
                searchKeyword: group.codeId,
                searchCondition: '1',
                pageUnit: 999
            });

            // Failsafe: Filter details on client side just in case backend returns all items
            const fetchedDetails = (res.list || []).filter(item =>
                item && (item as CodeDetail).codeId === group.codeId
            );

            // 2. Update state directly
            setSelectedGroup({
                ...group,
                details: fetchedDetails as CodeDetail[]
            });
        } catch (error) {
            toast('상세 코드를 불러오는 중 오류가 발생했습니다.', 'error');
        } finally {
            setDetailsLoading(false);
        }
    };

    // Synchronize initial state from props
    useEffect(() => {
        if (selectedGroupId && (initialClusters || []).length > 0) {
            if (!selectedGroup || selectedGroup.codeId !== selectedGroupId) {
                const cluster = initialClusters.find(c => (c.groups || []).some(g => g?.codeId === selectedGroupId));
                if (cluster) {
                    const group = (cluster.groups || []).find(g => g?.codeId === selectedGroupId);
                    if (group) {
                        setSelectedCluster(cluster);
                        setSelectedGroup({ ...group, details: (details || []) as CodeDetail[] });
                    }
                }
            }
        }
    }, [selectedGroupId, details, initialClusters, selectedGroup]);

    // Filtered Tree Data
    const filteredClusters = React.useMemo(() => {
        if (!searchQuery) return initialClusters || [];
        const lowerQuery = searchQuery.toLowerCase();
        return (initialClusters || []).map(c => ({
            ...c,
            groups: (c.groups || []).filter(g =>
                String(g?.codeIdNm || '').toLowerCase().includes(lowerQuery) ||
                String(g?.codeId || '').toLowerCase().includes(lowerQuery)
            )
        })).filter(c =>
            String(c?.name || '').toLowerCase().includes(lowerQuery) ||
            (c.groups || []).length > 0
        );
    }, [initialClusters, searchQuery]);

    const handleEditDetail = (detail: CodeDetail) => {
        setEditingDetail(detail);
        setIsOpen(true);
    };

    const handleDeleteDetail = async (code: string) => {
        if (!selectedGroup) return;

        const ok = await confirm({
            title: '상세 코드 명세 삭제',
            message: '해당 코드 정보를 데이터베이스에서 영구히 삭제하시겠습니까?',
            variant: 'destructive',
            confirmText: '삭제'
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
                toast('네트워크 오류가 발생했습니다.', 'error');
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

    const onSubmit = async (values: any) => {
        try {
            const res = await saveCodeDetailAction(null, {
                ...values,
                useAt: values.useAt as 'Y' | 'N',
                codeId: selectedGroup?.codeId || '',
                isNew: !editingDetail
            });

            if (res.success) {
                toast(res.message, 'success');
                setIsOpen(false);
            } else {
                toast(res.message, 'error');
            }
        } catch (error) {
            toast('서버 통신 중 오류가 발생했습니다.', 'error');
        }
    };

    const columns: Column<CodeDetail>[] = [
        {
            header: '코드',
            accessor: (item: CodeDetail) => <span className="font-mono font-bold text-slate-700">{item.code}</span>,
            className: 'w-24'
        },
        {
            header: '코드 명칭',
            accessor: (item: CodeDetail) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">{item.codeNm}</span>
                    <span className="text-[11px] text-slate-600 line-clamp-1">{item.codeDc}</span>
                </div>
            )
        },
        {
            header: '사용 여부',
            accessor: (item: CodeDetail) => <HubStatusBadge status={item.useAt === 'Y' ? '사용 중' : '미사용'} />,
            className: 'w-24'
        },
        {
            header: '관리',
            className: 'text-right w-28',
            accessor: (item: CodeDetail) => (
                <div className="flex justify-end gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${item.codeNm} 수정`}
                        className="h-8 w-8 hover:bg-slate-100 rounded-lg"
                        onClick={(e) => { e.preventDefault(); handleEditDetail(item); }}
                    >
                        <Settings size={14} />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`${item.codeNm} 삭제`}
                        className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg"
                        onClick={(e) => { e.preventDefault(); handleDeleteDetail(item.code); }}
                    >
                        <Trash2 size={14} />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-8 min-h-[700px]">
                {/* --- Left Sidebar: Code Tree --- */}
                <aside className="w-full lg:w-96 flex flex-col gap-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-slate-200/50 shadow-sm overflow-hidden flex flex-col h-full ring-1 ring-slate-100/50">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black tracking-widest text-slate-900 flex items-center gap-2">
                                    <Database size={14} className="text-primary" />
                                    CODE EXPLORER
                                </h3>
                                <span className="text-[10px] font-bold text-slate-700">{filteredClusters.length} Domains</span>
                            </div>
                            <div className="relative group">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-primary transition-colors" aria-hidden="true" />
                                <Input
                                    placeholder="그룹/이름 검색.."
                                    aria-label="코드 그룹 및 이름 검색"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-10 pl-10 bg-white border-transparent rounded-xl text-xs font-bold shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar max-h-[600px]">
                            {filteredClusters.length === 0 ? (
                                <div className="p-8 text-center space-y-4">
                                     <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                                        <SearchSlash size={24} />
                                    </div>
                                    <p className="text-[10px] font-black tracking-widest uppercase">결과 없음</p>
                                </div>
                            ) : (
                                filteredClusters.map((cluster) => (
                                    <div key={cluster.id} className="mb-2">
                                        <div className="px-3 py-2 text-[10px] font-black text-slate-600 tracking-widest uppercase flex items-center justify-between group">
                                            <span>{cluster.name}</span>
                                        </div>
                                        <div className="space-y-0.5 mt-1">
                                            {cluster.groups.map(group => (
                                                <button
                                                    key={group.codeId}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedCluster(cluster);
                                                        loadGroupDetails(group);
                                                    }}
                                                    className={cn(
                                                        'w-full flex items-center justify-between p-3 rounded-xl transition-all group/item',
                                                        selectedGroup?.codeId === group.codeId
                                                            ? 'bg-slate-900 text-white shadow-lg scale-[1.02]'
                                                            : 'hover:bg-slate-50 text-slate-600'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 truncate">
                                                        <div className={cn(
                                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                                                            selectedGroup?.codeId === group.codeId ? "bg-primary/20 text-primary" : "bg-white text-slate-500 group-hover/item:text-primary shadow-sm"
                                                        )}>
                                                            <Tag size={12} />
                                                        </div>
                                                        <div className="flex flex-col truncate items-start">
                                                            <span className="text-[11px] font-bold truncate leading-tight">{group.codeIdNm}</span>
                                                            <span className={cn(
                                                                'text-[9px] font-mono font-bold tracking-tighter',
                                                                selectedGroup?.codeId === group.codeId ? "text-white" : 'text-slate-600'
                                                            )}>{group.codeId}</span>
                                                        </div>
                                                    </div>
                                                    {selectedGroup?.codeId === group.codeId && (
                                                        <ChevronRight size={14} className="text-primary/50" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>

                {/* --- Right Content Area --- */}
                <main className="flex-1 space-y-6">
                    {selectedGroup ? (
                        <div className="space-y-6">
                            <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ring-1 ring-slate-100">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                                        <Fingerprint size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                                                {selectedGroup.codeIdNm}
                                            </h2>
                                            <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-mono font-black text-slate-600">
                                                {selectedGroup.codeId}
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-slate-700 italic">
                                            {selectedGroup.codeIdDc || '정의된 명세가 없습니다.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button onClick={handleCreateDetail} size="lg" className="h-12 px-6 rounded-xl bg-primary text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:-translate-y-0.5 transition-all gap-2">
                                        <Plus size={16} /> 신규 등록
                                    </Button>
                                </div>
                            </div>

                            <div className={cn(
                                "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100 transition-all",
                                detailsLoading ? "opacity-30 pointer-events-none scale-[0.99] grayscale" : "opacity-100"
                            )}>
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-primary shadow-sm">
                                            {detailsLoading ? <RefreshCcw size={18} className="animate-spin" /> : <Layers size={18} />}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase leading-none mb-1.5">시스템 구성 명세</h3>
                                            <p className="text-[10px] font-bold text-slate-700 leading-none">
                                                {detailsLoading ? '서버로부터 명세를 읽어오는 중..' : `총 ${selectedGroup.details?.length || 0}개의 파라미터가 정의됨`}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex flex-col items-end pr-4 text-right">
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] leading-none mb-1.5">무결성</span>
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-black text-emerald-500 font-mono">99.9%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <StandardDataTable<CodeDetail>
                                        columns={columns}
                                        data={selectedGroup.details || []}
                                        emptyMessage="선택된 그룹에 상세 코드가 존재하지 않습니다."
                                        className="border-none"
                                        isPremium={false}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 rounded-xl bg-white border border-slate-200 shadow-sm ring-1 ring-slate-100 min-h-[500px]">
                            <div className="w-24 h-24 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 mb-8 border border-slate-100 shadow-inner">
                                <Database size={40} className="animate-pulse" />
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase mb-4">마스터 데이터 저장소</h3>
                            <p className="text-xs font-bold text-slate-700 text-center max-w-sm leading-relaxed mb-10">
                                왼쪽 코드 익스플로러에서 관리 대상을 선택하십시오.<br />
                                도메인 계층별 모든 마스터 데이터가 이곳에 노출됩니다.
                            </p>
                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                                <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2 items-start">
                                    <span className="text-[10px] font-black text-slate-600 tracking-widest uppercase">도메인 클러스터</span>
                                    <span className="text-2xl font-black text-slate-900 font-mono italic">{initialClusters.length}</span>
                                </div>
                                <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 flex flex-col gap-2 items-start">
                                    <span className="text-[10px] font-black text-slate-600 tracking-widest uppercase">활성 그룹 수</span>
                                    <span className="text-2xl font-black text-slate-900 font-mono italic">{groups.length}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Standard Modal for CRUD */}
            <StandardModal
                isOpen={isModalOpen}
                onClose={() => setIsOpen(false)}
                title={editingDetail ? '아키텍처 명세 수정' : '신규 명세 등록'}
                maxWidth="3xl"
                footer={
                    <div className="flex w-full gap-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-xl font-black text-[10px] tracking-widest border-2 border-slate-100 shadow-sm">취소</Button>
                        <Button
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={form.formState.isSubmitting}
                            className="flex-[2] h-14 rounded-xl bg-primary border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:brightness-110 transition-all hover:-translate-y-1 group"
                        >
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 저장
                        </Button>
                    </div>
                }
            >
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-8">
                                <div className="space-y-1.5 p-0.5">
                                    <label className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                                        상위 그룹 식별자
                                    </label>
                                    <div className="h-14 flex items-center px-6 rounded-xl bg-slate-100 border-none font-mono text-xs font-black shadow-inner text-slate-600">
                                        {selectedGroup?.codeId}
                                    </div>
                                </div>

                                <ShadcnFormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5 p-0.5">
                                            <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                                                코드 식별자 (Unique ID) <span className="text-rose-500 font-extrabold text-[10px]">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    readOnly={!!editingDetail}
                                                    className="h-14 rounded-xl font-mono text-xs font-black shadow-inner border-none bg-slate-50 focus:bg-white transition-all text-left"
                                                    placeholder="Unique code indicator"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-bold text-rose-600 px-1 mt-1" />
                                        </FormItem>
                                    )}
                                />

                                <ShadcnFormField
                                    control={form.control}
                                    name="codeNm"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5 p-0.5">
                                            <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                                                표기 레이블 (Label) <span className="text-rose-500 font-extrabold text-[10px]">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    className="h-14 rounded-xl text-sm font-black tracking-tight shadow-inner border-none bg-slate-50 focus:bg-white transition-all text-left"
                                                    placeholder="레이블 명칭 입력"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-bold text-rose-600 px-1 mt-1" />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="space-y-8">
                                <ShadcnFormField
                                    control={form.control}
                                    name="useAt"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5 p-0.5">
                                            <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                                                활성 상태 프로토콜
                                            </FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                value={field.value}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="h-14 rounded-xl border-none bg-slate-50 font-black text-[10px] tracking-widest uppercase shadow-inner">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl shadow-xl z-[9999]">
                                                    <SelectItem value="Y" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-emerald-500">
                                                        --- 사용 중 (ACTIVE) ---
                                                    </SelectItem>
                                                    <SelectItem value="N" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-rose-500">
                                                        --- 미사용 (INACTIVE) ---
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[10px] font-bold text-rose-600 px-1 mt-1" />
                                        </FormItem>
                                    )}
                                />

                                <ShadcnFormField
                                    control={form.control}
                                    name="codeDc"
                                    render={({ field }) => (
                                        <FormItem className="space-y-1.5 p-0.5">
                                            <FormLabel className="text-[11px] font-black text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
                                                메타데이터 컨텍스트 설명
                                            </FormLabel>
                                            <FormControl>
                                                <textarea
                                                    {...field}
                                                    className="w-full min-h-[160px] p-6 rounded-xl border-none bg-slate-50 text-[11px] font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none shadow-inner text-left"
                                                    placeholder="코드 사용처 및 시스템 제약 조건 설명..."
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[10px] font-bold text-rose-600 px-1 mt-1" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                    </form>
                </Form>
            </StandardModal>
        </div>
    );
}
