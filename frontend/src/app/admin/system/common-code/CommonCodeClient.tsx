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

    const initialClusters: DomainCluster[] = React.useMemo(() => {
        return clCodes.map(cl => ({
            ...(cl as CmmnClCode),
            id: cl.clCode,
            name: cl.clCodeNm,
            icon: Layers,
            groups: groups
                .filter(g => g.clCode === cl.clCode)
                .map(g => ({
                    ...(g as CmmnCode),
                    id: g.codeId,
                    codeId: g.codeId,
                    name: g.codeIdNm,
                    icon: LayoutGrid,
                    description: g.codeIdDc,
                    details: g.codeId === selectedGroupId ? details : []
                }))
        }));
    }, [clCodes, groups, details, selectedGroupId]);

    const [selectedCluster, setSelectedCluster] = useState<DomainCluster>(
        initialClusters[0] || {
            id: '', name: '?ÑÏ≤¥', groups: [],
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
            // Providing multiple common parameter names for EgovFrame compatibility
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
                details: fetchedDetails
            });
        } catch {
<<<<<<< HEAD
            toast('ÏÉÅÏÑ∏ ÏΩîÎìúÎ•º Î∂àÎü¨Ïò§Îäî Ï§ë Ïò§Î•òÍ∞Ä Î∞úÏÉùÌñàÏäµÎãàÎã§.', 'error');
=======
            toast('?ÅÏÑ∏ ÏΩîÎìúÎ•?Î∂àÎü¨?§Îäî Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
        } finally {
            setDetailsLoading(false);
        }
    };

    // Synchronize initial state from props ONLY ONCE or when selectedGroupId from server actually changes
    useEffect(() => {
        if (selectedGroupId && initialClusters.length > 0) {
            // Only sync if current selectedGroup is different or null
            if (!selectedGroup || selectedGroup.codeId !== selectedGroupId) {
                const cluster = initialClusters.find(c => c.groups.some(g => g.codeId === selectedGroupId));
                if (cluster) {
                    const group = cluster.groups.find(g => g.codeId === selectedGroupId);
                    if (group) {
                        setSelectedCluster(cluster);
                        setSelectedGroup({ ...group, details: details });
                    }
                }
            }
        }
    }, [selectedGroupId, details, initialClusters]); // Keep dependencies but guard inside

    // Filtered Tree Data
    const filteredClusters = React.useMemo(() => {
        if (!searchQuery) return initialClusters;
        const lowerQuery = searchQuery.toLowerCase();
        return initialClusters.map(c => ({
            ...c,
            groups: c.groups.filter(g =>
                g.codeIdNm.toLowerCase().includes(lowerQuery) ||
                g.codeId.toLowerCase().includes(lowerQuery)
            )
        })).filter(c =>
            c.name.toLowerCase().includes(lowerQuery) ||
            c.groups.length > 0
        );
    }, [initialClusters, searchQuery]);

    const handleEditDetail = (detail: CodeDetail) => {
        setEditingDetail(detail);
        setIsOpen(true);
    };

    const handleDeleteDetail = async (code: string) => {
        if (!selectedGroup) return;

        const ok = await confirm({
            title: '?ÅÏÑ∏ ÏΩîÎìú Î™ÖÏÑ∏ ??†ú',
            message: '??ÏΩîÎìú ?ïÎ≥¥Î•??∞Ïù¥?∞Î≤†?¥Ïä§?êÏÑú ?ÅÍµ¨????†ú?òÏãúÍ≤†Ïäµ?àÍπå?',
            variant: 'destructive',
            confirmText: '??†ú'
        });

        if (ok) {
            try {
                const res = await deleteCodeDetailAction(null, { codeId: selectedGroup.codeId, code });
                if (res.success) {
                    toast(res.message, 'success');
                } else {
                    toast(res.message, 'error');
                }
            } catch {
<<<<<<< HEAD
                toast('ÎÑ§Ìä∏ÏõåÌÅ¨ Ïò§Î•òÍ∞Ä Î∞úÏÉùÌñàÏäµÎãàÎã§.', 'error');
=======
                toast('?§Ìä∏?åÌÅ¨ ?§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
            }
        }
    };

    const handleCreateDetail = () => {
        if (!selectedGroup) {
            toast('ÏΩîÎìú Î™ÖÏÑ∏Î•??±Î°ù??Í∑∏Î£π ÏΩîÎìúÎ•?Î®ºÏ? ?†ÌÉù?òÏã≠?úÏò§.', 'info');
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
                ...(data as any),
                codeId: selectedGroup?.codeId || '',
                isNew: !editingDetail
            });

            if (res.success) {
                toast(res.message, 'success');
                setIsOpen(false);
            } else {
                toast(res.message, 'error');
            }
        } catch {
<<<<<<< HEAD
            toast('Ï†ïÌï©ÏÑ± Í≤ÄÏ¶ùÏóê Ïã§Ìå®ÌñàÏäµÎãàÎã§.', 'error');
=======
            toast('?ïÌï©??Í≤ÄÏ¶ùÏóê ?§Ìå®?àÏäµ?àÎã§.', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
        }
    };

    const columns: Column<CodeDetail>[] = [
        {
            header: 'ÏΩîÎìú',
            accessor: (item: CodeDetail) => <span className="font-mono font-bold text-slate-700">{item.code}</span>,
            className: 'w-24'
        },
        {
            header: 'ÏΩîÎìú Î™ÖÏπ≠',
            accessor: (item: CodeDetail) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">{item.codeNm}</span>
                    <span className="text-[11px] text-slate-400 line-clamp-1">{item.codeDc}</span>
                </div>
            )
        },
        {
            header: '?¨Ïö© ?¨Î?',
            accessor: (item: CodeDetail) => <HubStatusBadge status={item.useAt === 'Y' ? '?¨Ïö©Ï§? : 'ÎØ∏ÏÇ¨??} />,
            className: 'w-24'
        },
        {
            header: 'Í¥ÄÎ¶?,
            className: 'text-right w-28',
            accessor: (item: CodeDetail) => (
                <div className="flex justify-end gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-slate-100 rounded-lg"
                        onClick={(e) => { e.preventDefault(); handleEditDetail(item); }}
                    >
                        <Settings size={14} />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
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
            {/* Master-Detail Layout Wrapper */}
            <div className="flex flex-col lg:flex-row gap-8 min-h-[700px]">

                {/* --- Left Sidebar: Code Tree --- */}
                <aside className="w-full lg:w-96 flex flex-col gap-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/50 shadow-sm overflow-hidden flex flex-col h-full ring-1 ring-slate-100/50">
                        {/* Sidebar Header & Search */}
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black tracking-widest text-slate-900 flex items-center gap-2">
                                    <Database size={14} className="text-primary" />
                                    CODE EXPLORER
                                </h3>
                                <span className="text-[10px] font-bold text-slate-400">{filteredClusters.length} Domains</span>
                            </div>
                            <div className="relative group">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Í∑∏Î£π/?¥Î¶Ñ Í≤Ä??.."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-10 pl-10 pr-4 rounded-xl border-slate-200 bg-white text-xs focus:ring-4 focus:ring-primary/5 transition-all"
                                />
                            </div>
                        </div>

                        {/* Tree Area */}
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar max-h-[600px]">
                            {filteredClusters.length === 0 ? (
                                <div className="p-8 text-center space-y-4 opacity-50">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-300">
                                        <SearchSlash size={24} />
                                    </div>
                                    <p className="text-[10px] font-black tracking-widest uppercase">Í≤∞Í≥º ?ÜÏùå</p>
                                </div>
                            ) : (
                                filteredClusters.map((cluster) => (
                                    <div key={cluster.id} className="mb-2">
                                        {/* Cluster Header */}
                                        <div className="px-3 py-2 text-[10px] font-black text-slate-400 tracking-widest uppercase flex items-center justify-between group">
                                            <span>{cluster.name}</span>
                                            <div className="h-px flex-1 mx-3 bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                        {/* Group Items */}
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
                                                        "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all group/item",
                                                        selectedGroup?.codeId === group.codeId
                                                            ? "bg-primary/10 text-primary border-l-[3px] border-primary shadow-sm !rounded-l-none"
                                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3 truncate">
                                                        <div className={cn(
                                                            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors shadow-sm",
                                                            selectedGroup?.codeId === group.codeId ? "bg-primary/20 text-primary" : "bg-white text-slate-300 group-hover/item:text-primary"
                                                        )}>
                                                            <Tag size={12} />
                                                        </div>
                                                        <div className="flex flex-col truncate">
                                                            <span className="text-[11px] font-bold truncate leading-tight">{group.codeIdNm}</span>
                                                            <span className={cn(
                                                                "text-[9px] font-mono leading-none mt-0.5",
                                                                selectedGroup?.codeId === group.codeId ? "text-white/40" : "text-slate-400"
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

                            {/* Summary Header Card */}
                            <div className="p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ring-1 ring-slate-100">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
                                        <Fingerprint size={28} />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">
                                                {selectedGroup.codeIdNm}
                                            </h2>
                                            <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-[10px] font-mono font-black text-slate-500">
                                                {selectedGroup.codeId}
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400 italic">
                                            {selectedGroup.codeIdDc || '?ïÏùò???òÏßë Î™ÖÏÑ∏Í∞Ä ?ÜÏäµ?àÎã§.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button onClick={handleCreateDetail} size="lg" className="h-12 px-6 rounded-2xl bg-primary text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:-translate-y-0.5 transition-all gap-2">
                                        <Plus size={16} /> ?†Í∑ú ?±Î°ù
                                    </Button>
                                </div>
                            </div>

                            {/* Data Table Area */}
                            <div className={cn(
                                "bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100 transition-all",
                                detailsLoading ? "opacity-30 pointer-events-none scale-[0.99] grayscale" : "opacity-100"
                            )}>
                                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-primary shadow-sm">
                                            {detailsLoading ? <RefreshCcw size={18} className="animate-spin" /> : <Layers size={18} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">?úÏä§??Íµ¨ÏÑ± Î™ÖÏÑ∏</h3>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                {detailsLoading ? '?úÎ≤ÑÎ°úÎ???Î™ÖÏÑ∏Î•??ΩÏñ¥?§Îäî Ï§?..' : `Ï¥?${selectedGroup.details?.length || 0}Í∞úÏùò ?åÎùºÎØ∏ÌÑ∞Í∞Ä ?ïÏùò??}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end pr-4 text-right">
                                            <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1.5">Î¨¥Í≤∞??/span>
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
                                        emptyMessage="?†ÌÉù??Í∑∏Î£π???ÅÏÑ∏ ÏΩîÎìúÍ∞Ä Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§."
                                        className="border-none"
                                        isPremium={false}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-12 rounded-[3.5rem] bg-white border border-slate-200 shadow-sm ring-1 ring-slate-100">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-300 mb-8 border border-slate-100 shadow-inner">
                                <Database size={40} className="animate-pulse" />
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase mb-4">ÎßàÏä§???∞Ïù¥???Ä?•ÏÜå</h3>
                            <p className="text-xs font-bold text-slate-400 text-center max-w-sm leading-relaxed mb-10">
                                ?ºÏ™Ω ÏΩîÎìú ?µÏä§?åÎ°ú?¨Ïóê??Í¥ÄÎ¶??Ä?ÅÏùÑ ?†ÌÉù?òÏã≠?úÏò§.<br />
                                ?ÑÎ©î??Í≥ÑÏ∏µÎ≥?Î™®Îì† ÎßàÏä§???∞Ïù¥?∞Í? ?¥Í≥≥???úÏ∂ú?©Îãà??
                            </p>
                            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">?ÑÎ©î???¥Îü¨?§ÌÑ∞</span>
                                    <span className="text-2xl font-black text-slate-900 font-mono italic">{initialClusters.length}</span>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">?úÏÑ± Í∑∏Î£π ?úÌÄÄ??/span>
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
                title={editingDetail ? '?ÑÌÇ§?çÏ≤ò Î™ÖÏÑ∏ ?òÏ†ï' : '?†Í∑ú Î™ÖÏÑ∏ ?±Î°ù'}
                maxWidth="3xl"
                footer={
                    <div className="flex w-full gap-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2 border-slate-100 shadow-sm">Ï∑®ÏÜå</Button>
                        <Button form="code-form" type="submit" className="flex-[2] h-14 rounded-2xl bg-primary border-none text-white font-black text-[10px] tracking-widest shadow-2xl hover:brightness-110 transition-all hover:-translate-y-1 group">
                            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> ?Ä??                        </Button>
                    </div>
                }
            >
                <form id="code-form" onSubmit={handleSubmitDetail} className="space-y-10 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-8">
                            <FormField label="?ÅÏúÑ Í∑∏Î£π ?ùÎ≥Ñ??>
                                <div className="h-14 flex items-center px-6 rounded-2xl bg-slate-100 border-none font-mono text-xs font-black shadow-inner text-slate-500">
                                    {selectedGroup?.codeId}
                                </div>
                            </FormField>
                            <FormField label="ÏΩîÎìú ?ùÎ≥Ñ??(Unique ID)" required>
                                <Input
                                    name="code"
                                    defaultValue={editingDetail?.code}
                                    required
                                    readOnly={!!editingDetail}
                                    className="h-14 rounded-2xl font-mono text-xs font-black shadow-inner border-none bg-slate-50 focus:bg-white transition-all"
                                    placeholder="Í≥†Ïú† ??ÏΩîÎìú (?? CM001)"
                                />
                            </FormField>
                            <FormField label="?ºÎ¶¨ ?àÏù¥Î∏?(Label)" required>
                                <Input name="codeNm" defaultValue={editingDetail?.codeNm} required className="h-14 rounded-2xl text-sm font-black tracking-tight shadow-inner border-none bg-slate-50 focus:bg-white transition-all" placeholder="?úÍ?/?ÅÎ¨∏ ÏΩîÎìú ?¥Î¶Ñ" />
                            </FormField>
                        </div>

                        <div className="space-y-8">
                            <FormField label="?úÏÑ± ?ÅÌÉú ?ÑÎ°ú?†ÏΩú">
                                <Select
                                    key={editingDetail ? `edit-${editingDetail.code}` : 'new'}
                                    name="useAt"
                                    defaultValue={editingDetail?.useAt || 'Y'}
                                >
                                    <SelectTrigger className="h-14 rounded-2xl border-none bg-slate-50 font-black text-[10px] tracking-widest uppercase shadow-inner">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl shadow-xl z-[9999]">
                                        <SelectItem value="Y" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-emerald-500">
                                            --- ?¨Ïö©Ï§?(ACTIVE) ---
                                        </SelectItem>
                                        <SelectItem value="N" className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase text-rose-500">
                                            --- ÎØ∏ÏÇ¨??(INACTIVE) ---
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                            <FormField label="Î©îÌ??∞Ïù¥??Ïª®ÌÖç?§Ìä∏ ?§Î™Ö">
                                <textarea name="codeDc" defaultValue={editingDetail?.codeDc} className="w-full min-h-[160px] p-6 rounded-[2rem] border-none bg-slate-50 text-[11px] font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none shadow-inner" placeholder="ÏΩîÎìú ?¨Ïö©Ï≤?Î∞??úÏä§???úÏïΩ Ï°∞Í±¥ ?§Î™Ö..." />
                            </FormField>
                        </div>
                    </div>
                </form>
            </StandardModal>
        </div>
    );
}

