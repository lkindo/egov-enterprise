'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { KnoManagementVO } from '@/types/dam';
import { updateKno, deleteKno } from '@/app/actions/damActions';
import { useToast } from '@/app/components/ui/toast';
import { ChevronLeft, Save, Trash2, Edit3, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KnoDetailClient({ kno, id }: { kno: KnoManagementVO; id: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);

    const [updateState, updateAction, isUpdating] = useActionState(updateKno, null);
    const [deleteState, deleteAction, isDeleting] = useActionState(deleteKno, null);

    // Form inputs
    const [knoNm, setKnoNm] = useState(kno.knoNm || '');
    const [knoCn, setKnoCn] = useState(kno.knoCn || '');
    const [knoType, setKnoType] = useState(kno.knoType || '1');
    const [othbcAt, setOthbcAt] = useState(kno.othbcAt || 'Y');

    useEffect(() => {
        if (updateState?.success) {
            toast(updateState.message, 'success');
            setIsEditing(false);
        } else if (updateState && !updateState.success) {
            toast(updateState.message, 'error');
        }
    }, [updateState, toast]);

    useEffect(() => {
        if (deleteState?.success) {
            toast(deleteState.message, 'success');
            router.push('/admin/dam/kno');
        } else if (deleteState && !deleteState.success) {
            toast(deleteState.message, 'error');
        }
    }, [deleteState, toast, router]);

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/admin/dam/kno')}
                        className="p-0 h-auto hover:bg-transparent text-slate-400 font-bold gap-1 group"
                    >
                        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> BACK TO LIST
                    </Button>
                    <h2 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase">
                        {isEditing ? 'Modify Insight' : 'Insight Details'}
                    </h2>
                </div>

                <div className="flex gap-3">
                    {!isEditing ? (
                        <>
                            <Button
                                onClick={() => setIsEditing(true)}
                                className="rounded-2xl h-12 px-8 font-bold gap-2 shadow-xl shadow-primary/10 hover:-translate-y-1 transition-all"
                            >
                                <Edit3 size={18} /> Edit Article
                            </Button>
                            <form action={deleteAction} onSubmit={(e) => !confirm('정말 삭제하시겠습니까?') && e.preventDefault()}>
                                <input type="hidden" name="knoId" value={id} />
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={isDeleting}
                                    className="rounded-2xl h-12 px-8 font-bold gap-2 shadow-xl shadow-destructive/10 hover:-translate-y-1 transition-all"
                                >
                                    <Trash2 size={18} /> {isDeleting ? 'Removing...' : 'Delete'}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                                className="rounded-2xl h-12 px-8 font-bold border-2 gap-2"
                            >
                                <X size={18} /> Cancel
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className={cn(
                        "rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl overflow-hidden ring-1 ring-slate-50 transition-all duration-500",
                        isEditing ? "opacity-100" : "opacity-95"
                    )}>
                        <div className="p-10 space-y-8">
                            {isEditing ? (
                                <form action={updateAction} className="space-y-8">
                                    <input type="hidden" name="knoId" value={id} />
                                    <input type="hidden" name="knoType" value={knoType} />
                                    <input type="hidden" name="othbcAt" value={othbcAt} />

                                    <div className="space-y-3">
                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Insight Title</Label>
                                        <Input
                                            name="knoNm"
                                            value={knoNm}
                                            onChange={(e) => setKnoNm(e.target.value)}
                                            className="h-14 rounded-2xl border-2 text-xl font-bold px-6 focus:ring-primary/20"
                                            placeholder="Enter knowledge title..."
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Content description</Label>
                                        <Textarea
                                            name="knoCn"
                                            value={knoCn}
                                            onChange={(e) => setKnoCn(e.target.value)}
                                            rows={12}
                                            className="rounded-[2rem] border-2 p-6 text-lg font-medium leading-relaxed resize-none focus:ring-primary/20"
                                            placeholder="Detailed description goes here..."
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isUpdating}
                                        className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest gap-3 shadow-2xl shadow-primary/20 hover:-translate-y-1 transition-all"
                                    >
                                        <Save size={20} /> {isUpdating ? 'Saving Changes...' : 'Update Insight'}
                                    </Button>
                                </form>
                            ) : (
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="inline-flex px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                                            Insight Content
                                        </div>
                                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">
                                            {kno.knoNm}
                                        </h3>
                                    </div>
                                    <div className="prose prose-slate prose-lg max-w-none text-slate-600 font-medium leading-loose whitespace-pre-wrap pt-8 border-t border-slate-50">
                                        {kno.knoCn}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <div className="rounded-[2rem] bg-slate-50 border border-slate-100 p-8 space-y-8 shadow-sm">
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-200 pb-4">Classification</h4>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase">Knowledge Type</Label>
                                        <Select value={knoType} onValueChange={setKnoType}>
                                            <SelectTrigger className="h-12 rounded-xl border-2 bg-white font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-2">
                                                <SelectItem value="1" className="font-bold">지침 (Guidelines)</SelectItem>
                                                <SelectItem value="2" className="font-bold">법령 (Regulations)</SelectItem>
                                                <SelectItem value="3" className="font-bold">매뉴얼 (Manuals)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2 pt-2">
                                        <Label className="text-[10px] font-black text-slate-400 uppercase">Visibility</Label>
                                        <RadioGroup value={othbcAt} onValueChange={setOthbcAt} className="flex flex-col gap-2">
                                            <div className={cn(
                                                "flex items-center space-x-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                othbcAt === 'Y' ? "bg-emerald-50 border-emerald-200" : "bg-white border-transparent"
                                            )} onClick={() => setOthbcAt('Y')}>
                                                <RadioGroupItem value="Y" id="public" className="text-emerald-600 border-emerald-600" />
                                                <Label htmlFor="public" className="font-bold cursor-pointer">Public Access</Label>
                                            </div>
                                            <div className={cn(
                                                "flex items-center space-x-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                                                othbcAt === 'N' ? "bg-rose-50 border-rose-200" : "bg-white border-transparent"
                                            )} onClick={() => setOthbcAt('N')}>
                                                <RadioGroupItem value="N" id="private" className="text-rose-600 border-rose-600" />
                                                <Label htmlFor="private" className="font-bold cursor-pointer">Private Cache</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</span>
                                        <span className="text-lg font-black text-slate-900 italic">
                                            {kno.knoType === '1' ? '지침 (GUIDELINE)' : kno.knoType === '2' ? '법령 (REGULATION)' : '매뉴얼 (MANUAL)'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                        <span className={cn(
                                            "inline-flex w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em]",
                                            kno.othbcAt === 'Y' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                        )}>
                                            {kno.othbcAt === 'Y' ? 'Public Insight' : 'Confidential'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {!isEditing && (
                            <div className="space-y-6 pt-6 border-t border-slate-200">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Metadata</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-400 uppercase">Created At</span>
                                        <span className="font-black text-slate-900 tabular-nums">{kno.frstRegisterPnttm?.slice(0, 10)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-slate-400 uppercase">Author</span>
                                        <span className="font-black text-slate-900">SYSTEM ADMIN</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}