'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { templateAdminService, TmplatInfo } from '@/services/foundation/system/TemplateAdminService';
import {
    Layout,
    Plus,
    Search,
    RefreshCcw,
    FileCode,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function TemplateAdminClient({
    initialTemplates
}: {
    initialTemplates: TmplatInfo[]
}) {
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState(initialTemplates);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTemplate, setNewTemplate] = useState<TmplatInfo>({
        tmplatNm: '',
        tmplatSeCode: 'TMPT01',
        tmplatCours: '',
        useAt: 'Y'
    });

    const handleRefresh = async () => {
        setLoading(true);
        try {
            const res = await templateAdminService.getTemplateList();
            setTemplates(res);
        } catch {
            toast.error('?úÌîåÎ¶?Î™©Î°ù??Î∂àÎü¨?§Ï? Î™ªÌñà?µÎãà??');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newTemplate.tmplatNm || !newTemplate.tmplatCours) {
            toast.error('?úÌîåÎ¶?Î™ÖÍ≥º Í≤ΩÎ°úÎ•??ÖÎ†•?¥Ï£º?∏Ïöî.');
            return;
        }

        setLoading(true);
        try {
            await templateAdminService.createTemplate(newTemplate);
            toast.success('???úÌîåÎ¶øÏùÑ ?±Î°ù?àÏäµ?àÎã§.');
            setIsAddOpen(false);
            handleRefresh();
        } catch {
            toast.error('?úÌîåÎ¶??±Î°ù???§Ìå®?àÏäµ?àÎã§.');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: '?úÌîåÎ¶?ID',
            accessor: (item: TmplatInfo) => (
                <span className="font-mono font-black text-slate-400 text-[10px] tracking-tight">{item.tmplatId}</span>
            )
        },
        {
            header: '?úÌîåÎ¶?Î™?,
            accessor: (item: TmplatInfo) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
                        <Layout size={14} />
                    </div>
                    <span className="font-black tracking-tighter text-slate-900">{item.tmplatNm}</span>
                </div>
            )
        },
        {
            header: 'Íµ¨Î∂Ñ',
            accessor: (item: TmplatInfo) => (
                <span className="text-[10px] font-black text-slate-500 tracking-tight bg-slate-100 px-2 py-1 rounded-md ">
                    {item.tmplatSeCode === 'TMPT01' ? 'Í≤åÏãú?? : item.tmplatSeCode === 'TMPT02' ? 'Ïª§Î??àÌã∞' : '?ºÎ∞ò'}
                </span>
            )
        },
        {
            header: '?úÌîåÎ¶?Í≤ΩÎ°ú',
            accessor: (item: TmplatInfo) => (
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] ">
                    <Code size={12} />
                    {item.tmplatCours}
                </div>
            )
        },
        {
            header: '?¨Ïö© ?¨Î?',
            accessor: (item: TmplatInfo) => (
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full border w-fit transition-all",
                    item.useAt === 'Y' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    {item.useAt === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span className="text-[10px] font-black tracking-tight ">{item.useAt === 'Y' ? '?úÏÑ±' : 'ÎπÑÌôú??}</span>
                </div>
            )
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <PageHeader
                title="?úÌîåÎ¶??úÏä§???ÑÌÇ§?çÏ≤ò"
                breadcrumbs={[{ label: '?úÏä§?úÍ?Î¶? }, { label: 'Ïª§Î??àÌã∞Í¥ÄÎ¶? }, { label: '?úÌîåÎ¶øÍ?Î¶? }]}
                actions={
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={handleRefresh}
                            variant="outline"
                            className="h-14 w-14 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95"
                        >
                            <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
                        </Button>
                        <Button
                            onClick={() => setIsAddOpen(true)}
                            className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 "
                        >
                            <Plus size={18} />
                            ?†Í∑ú Î∏îÎ£®?ÑÎ¶∞??                        </Button>
                    </div>
                }
            />

            {/* Main Content Area */}
            <div className="responsive-card p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                        <FileCode size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter ">Íµ¨Ï°∞???êÏÇ∞</h3>
                        <p className="text-[9px] font-black text-slate-400 tracking-[0.3em]">?±Î°ù???úÏä§???úÌîåÎ¶?/p>
                    </div>
                </div>

                <div className="px-2 overflow-x-auto">
                    <StandardDataTable
                        columns={columns}
                        data={templates}
                        loading={loading}
                        emptyMessage="?úÏä§?úÏóê ?±Î°ù???úÌîåÎ¶øÏù¥ ?ÜÏäµ?àÎã§."
                        className="border-none bg-slate-50/50 rounded-[3rem] p-8"
                    />
                </div>
            </div>

            {/* Add Template Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-10 border-none shadow-2xl bg-white">
                    <DialogHeader className="space-y-4">
                        <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
                            <Plus size={28} />
                        </div>
                        <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter text-center">?†Í∑ú Î∏îÎ£®?ÑÎ¶∞???±Î°ù</DialogTitle>
                        <DialogDescription className="text-center font-bold text-slate-400 text-sm">
                            ?úÏä§?úÏóê ?àÎ°ú??UI/UX Íµ¨Ï°∞Î•??ïÏùò?©Îãà??
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8 py-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">?úÌîåÎ¶?Î™ÖÏπ≠</label>
                            <Input
                                placeholder="?úÌîåÎ¶?Î™?.."
                                value={newTemplate.tmplatNm}
                                onChange={(e) => setNewTemplate(prev => ({ ...prev, tmplatNm: e.target.value }))}
                                className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">Ïπ¥ÌÖåÍ≥†Î¶¨</label>
                                <Select
                                    value={newTemplate.tmplatSeCode}
                                    onValueChange={(v) => setNewTemplate(prev => ({ ...prev, tmplatSeCode: v }))}
                                >
                                    <SelectTrigger className="h-16 rounded-3xl border-2 border-slate-100 bg-slate-50/50 font-black text-[10px] tracking-tight focus:bg-white">
                                        <SelectValue placeholder="Ïπ¥ÌÖåÍ≥†Î¶¨ ?†ÌÉù" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="TMPT01" className="font-black text-[10px] tracking-tight ">Í≤åÏãú??/SelectItem>
                                        <SelectItem value="TMPT02" className="font-black text-[10px] tracking-tight ">Ïª§Î??àÌã∞</SelectItem>
                                        <SelectItem value="TMPT03" className="font-black text-[10px] tracking-tight ">?ºÎ∞ò</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">?ÅÌÉú</label>
                                <Select
                                    value={newTemplate.useAt}
                                    onValueChange={(v) => setNewTemplate(prev => ({ ...prev, useAt: v }))}
                                >
                                    <SelectTrigger className="h-16 rounded-3xl border-2 border-slate-100 bg-slate-50/50 font-black text-[10px] tracking-tight focus:bg-white">
                                        <SelectValue placeholder="?ÅÌÉú ?†ÌÉù" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="Y" className="font-black text-[10px] tracking-tight ">?úÏÑ±</SelectItem>
                                        <SelectItem value="N" className="font-black text-[10px] tracking-tight ">ÎπÑÌôú??/SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">?åÏä§ Í≤ΩÎ°ú</label>
                            <div className="relative">
                                <Code className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <Input
                                    placeholder="/src/templates/..."
                                    value={newTemplate.tmplatCours}
                                    onChange={(e) => setNewTemplate(prev => ({ ...prev, tmplatCours: e.target.value }))}
                                    className="h-16 pl-16 pr-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 font-mono text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddOpen(false)}
                            className="h-16 px-10 rounded-2xl border-2 border-slate-100 font-black text-sm tracking-tight hover:bg-slate-50 transition-all"
                        >
                            Ï∑®ÏÜå
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={loading}
                            className="h-16 px-14 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
                        >
                            {loading ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            ?±Î°ù ?πÏù∏
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
