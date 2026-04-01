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
            toast.error('?쒗뵆由?紐⑸줉님遺덈윭?ㅼ? 紐삵뻽?듬땲님');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newTemplate.tmplatNm || !newTemplate.tmplatCours) {
            toast.error('?쒗뵆由?紐낃낵 寃쎈줈瑜님낅젰?댁＜?몄슂.');
            return;
        }

        setLoading(true);
        try {
            await templateAdminService.createTemplate(newTemplate);
            toast.success('님?쒗뵆由우쓣 등록?덉뒿?덈떎.');
            setIsAddOpen(false);
            handleRefresh();
        } catch {
            toast.error('?쒗뵆由?등록님?ㅽ뙣?덉뒿?덈떎.');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: '?쒗뵆由?ID',
            accessor: (item: TmplatInfo) => (
                <span className="font-mono font-black text-slate-400 text-[10px] tracking-tight">{item.tmplatId}</span>
            )
        },
        {
            header: '?쒗뵆由?紐?,
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
            header: '援щ텇',
            accessor: (item: TmplatInfo) => (
                <span className="text-[10px] font-black text-slate-500 tracking-tight bg-slate-100 px-2 py-1 rounded-md ">
                    {item.tmplatSeCode === 'TMPT01' ? '寃뚯떆님 : item.tmplatSeCode === 'TMPT02' ? '而ㅻ님덊떚' : '?쇰컲'}
                </span>
            )
        },
        {
            header: '?쒗뵆由?寃쎈줈',
            accessor: (item: TmplatInfo) => (
                <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] ">
                    <Code size={12} />
                    {item.tmplatCours}
                </div>
            )
        },
        {
            header: '?ъ슜 ?щ?',
            accessor: (item: TmplatInfo) => (
                <div className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full border w-fit transition-all",
                    item.useAt === 'Y' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                    {item.useAt === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    <span className="text-[10px] font-black tracking-tight ">{item.useAt === 'Y' ? '활성' : '鍮꾪솢님}</span>
                </div>
            )
        }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <PageHeader
                title="?쒗뵆由님쒖뒪님?꾪궎?띿쿂"
                breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '而ㅻ님덊떚愿由? }, { label: '?쒗뵆由욧?由? }]}
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
                            신규 釉붾（?꾨┛님                        </Button>
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
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter ">援ъ“님?먯궛</h3>
                        <p className="text-[9px] font-black text-slate-400 tracking-[0.3em]">등록님?쒖뒪님?쒗뵆由?/p>
                    </div>
                </div>

                <div className="px-2 overflow-x-auto">
                    <StandardDataTable
                        columns={columns}
                        data={templates}
                        loading={loading}
                        emptyMessage="?쒖뒪?쒖뿉 등록님?쒗뵆由우씠 ?놁뒿?덈떎."
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
                        <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter text-center">신규 釉붾（?꾨┛님등록</DialogTitle>
                        <DialogDescription className="text-center font-bold text-slate-400 text-sm">
                            ?쒖뒪?쒖뿉 ?덈줈님UI/UX 援ъ“瑜님뺤쓽?⑸땲님
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8 py-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">?쒗뵆由?紐낆묶</label>
                            <Input
                                placeholder="?쒗뵆由?紐?.."
                                value={newTemplate.tmplatNm}
                                onChange={(e) => setNewTemplate(prev => ({ ...prev, tmplatNm: e.target.value }))}
                                className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-lg font-black focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">移댄뀒怨좊━</label>
                                <Select
                                    value={newTemplate.tmplatSeCode}
                                    onValueChange={(v) => setNewTemplate(prev => ({ ...prev, tmplatSeCode: v }))}
                                >
                                    <SelectTrigger className="h-16 rounded-3xl border-2 border-slate-100 bg-slate-50/50 font-black text-[10px] tracking-tight focus:bg-white">
                                        <SelectValue placeholder="移댄뀒怨좊━ ?좏깮" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="TMPT01" className="font-black text-[10px] tracking-tight ">寃뚯떆님/SelectItem>
                                        <SelectItem value="TMPT02" className="font-black text-[10px] tracking-tight ">而ㅻ님덊떚</SelectItem>
                                        <SelectItem value="TMPT03" className="font-black text-[10px] tracking-tight ">?쇰컲</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">?곹깭</label>
                                <Select
                                    value={newTemplate.useAt}
                                    onValueChange={(v) => setNewTemplate(prev => ({ ...prev, useAt: v }))}
                                >
                                    <SelectTrigger className="h-16 rounded-3xl border-2 border-slate-100 bg-slate-50/50 font-black text-[10px] tracking-tight focus:bg-white">
                                        <SelectValue placeholder="?곹깭 ?좏깮" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                                        <SelectItem value="Y" className="font-black text-[10px] tracking-tight ">활성</SelectItem>
                                        <SelectItem value="N" className="font-black text-[10px] tracking-tight ">鍮꾪솢님/SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 tracking-tight ml-2">?뚯뒪 寃쎈줈</label>
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
                            痍⑥냼
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={loading}
                            className="h-16 px-14 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
                        >
                            {loading ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                            등록 ?뱀씤
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

