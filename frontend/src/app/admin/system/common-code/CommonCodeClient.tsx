'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { DataTable, Column } from '@/components/common/DataTable';
import { exportToCsv } from '@/lib/utils/exportUtils';
import { CmmnDetailCode as CommonCodeDetail } from '@/types/system';
import { useToast } from '@/app/components/ui/toast';
import {
 Layers,
 ChevronRight,
 Plus,
 Tag,
 Edit,
 Trash2,
 Save,
 Activity,
 ShieldCheck,
 Code2,
 Info,
 Clock,
 ArrowRightCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { 
 saveCodeDetail, 
 deleteCodeDetail, 
 saveClCode, 
 deleteClCode, 
 saveCmmnCode, 
 deleteCmmnCode 
} from '@/app/actions/codeActions';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useMessage } from '@/hooks/useMessage';

export default function CommonCodeClient({ clCodes, groups, details, selectedGroupId }: { clCodes: any[]; groups: any[]; details: CommonCodeDetail[]; selectedGroupId: string | null }) {
 const { t } = useMessage();
 const router = useRouter();
 const { toast } = useToast();
 const confirm = useConfirm();

 const [loading, setLoading] = useState(false);
 
 // --- 상세코드(Detail) Modal ---
 const [isModalOpen, setIsOpen] = useState(false);
 const [mode, setMode] = useState<'create' | 'edit'>('create');
 const [formData, setFormData] = useState<Partial<CommonCodeDetail>>({
 codeId: '', code: '', codeNm: '', codeDc: '', useAt: 'Y'
 });

 // --- 분류코드(ClCode) Modal ---
 const [isClModalOpen, setIsClOpen] = useState(false);
 const [clMode, setClMode] = useState<'create' | 'edit'>('create');
 const [clFormData, setClFormData] = useState<Partial<any>>({ clCode: '', clCodeNm: '', clCodeDc: '', useAt: 'Y' });

 // --- 공통코드(CmmnCode/Group) Modal ---
 const [isGroupModalOpen, setIsGroupOpen] = useState(false);
 const [groupMode, setGroupMode] = useState<'create' | 'edit'>('create');
 const [groupFormData, setGroupFormData] = useState<Partial<any>>({ codeId: '', codeIdNm: '', codeIdDc: '', clCode: '', useAt: 'Y' });

 const [expandedCl, setExpandedCl] = useState<Record<string, boolean>>({});

 const toggleCl = (clCode: string) => {
 setExpandedCl(prev => ({ ...prev, [clCode]: !prev[clCode] }));
 };

 // --- Handlers for Detail Code ---
 const handleOpenCreate = () => {
 if (!selectedGroupId) return;
 setMode('create');
 setFormData({ codeId: selectedGroupId, code: '', codeNm: '', codeDc: '', useAt: 'Y' }); 
 setIsOpen(true);
 };

 const handleOpenEdit = (detail: CommonCodeDetail) => {
 setMode('edit');
 setFormData(detail);
 setIsOpen(true);
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 const res = await saveCodeDetail(null, { ...formData, isNew: mode === 'create' } as any); 
 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 router.refresh();
 } else {
 toast(res.message, 'error');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (code: string) => {
 if (!selectedGroupId) return;
 const isConfirmed = await confirm({
 title: '상세 코드 삭제',
 message: `[${code}] 삭제하시겠습니까?`,
 variant: 'destructive'
 });

 if (isConfirmed) {
 setLoading(true);
 try {
 const res = await deleteCodeDetail(null, { codeId: selectedGroupId, code });
 if (res.success) {
 toast(res.message, 'success');
 router.refresh();
 } else {
 toast(res.message, 'error');
 }
 } finally {
 setLoading(false);
 }
 }
 };

 // --- Handlers for ClCode ---
 const handleOpenClCreate = () => {
 setClMode('create');
 setClFormData({ clCode: '', clCodeNm: '', clCodeDc: '', useAt: 'Y' });
 setIsClOpen(true);
 };

 const handleOpenClEdit = (cl: any) => {
 setClMode('edit');
 setClFormData(cl);
 setIsClOpen(true);
 };

 const handleClSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 const res = await saveClCode(null, { ...clFormData, isNew: clMode === 'create' });
 if (res.success) {
 toast(res.message, 'success');
 setIsClOpen(false);
 router.refresh();
 } else {
 toast(res.message, 'error');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleClDelete = async (clCode: string) => {
 const isConfirmed = await confirm({
 title: '분류 코드 삭제',
 message: `[${clCode}] 분류 코드를 삭제하시겠습니까? 관련 공통 코드가 모두 삭제될 수 있습니다.`,
 variant: 'destructive'
 });
 if (isConfirmed) {
 setLoading(true);
 try {
 const res = await deleteClCode(null, clCode);
 if (res.success) {
 toast(res.message, 'success');
 router.refresh();
 } else {
 toast(res.message, 'error');
 }
 } finally {
 setLoading(false);
 }
 }
 };

 // --- Handlers for CmmnCode (Group) ---
 const handleOpenGroupCreate = (clCode: string) => {
 setGroupMode('create');
 setGroupFormData({ codeId: '', codeIdNm: '', codeIdDc: '', clCode: clCode, useAt: 'Y' });
 setIsGroupOpen(true);
 };

 const handleOpenGroupEdit = (group: any) => {
 setGroupMode('edit');
 setGroupFormData(group);
 setIsGroupOpen(true);
 };

 const handleGroupSave = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 try {
 const res = await saveCmmnCode(null, { ...groupFormData, isNew: groupMode === 'create' });
 if (res.success) {
 toast(res.message, 'success');
 setIsGroupOpen(false);
 router.refresh();
 } else {
 toast(res.message, 'error');
 }
 } finally {
 setLoading(false);
 }
 };

 const handleGroupDelete = async (codeId: string) => {
 const isConfirmed = await confirm({
 title: '공통 코드(그룹) 삭제',
 message: `[${codeId}] 공통 코드를 삭제하시겠습니까? 관련 상세 코드가 모두 삭제됩니다.`,
 variant: 'destructive'
 });
 if (isConfirmed) {
 setLoading(true);
 try {
 const res = await deleteCmmnCode(null, codeId);
 if (res.success) {
 toast(res.message, 'success');
 router.refresh();
 } else {
 toast(res.message, 'error');
 }
 } finally {
 setLoading(false);
 }
 }
 };

 const handleExport = () => {
 const exportColumns = [
 { header: t('admin.system.codeId'), accessorKey: 'code' },
 { header: t('admin.system.codeNm'), accessorKey: 'codeNm' },
 { header: t('common.desc'), accessorKey: 'codeDc' },
 { header: t('admin.system.useAt'), accessorKey: 'useAt' },
 ];
 exportToCsv(details, exportColumns as any, `CommonCodes_${selectedGroupId}`);
 toast(t('common.success'), 'success');
 };

 const selectedGroup = groups.find(g => g.codeId === selectedGroupId);
 const selectedCl = clCodes.find(c => c.clCode === selectedGroup?.clCode);

 const columns: Column<CommonCodeDetail>[] = [
 {
 header: t('admin.system.codeId'),
 accessorKey: 'code',
 sortable: true,
 cell: (item) => (
 <span className="font-mono font-bold text-primary">{item.code}</span>
 )
 },
 {
 header: t('admin.system.codeNm'),
 accessorKey: 'codeNm',
 sortable: true,
 cell: (item) => (
 <span className="font-bold">{item.codeNm}</span>
 )
 },
 {
 header: t('common.desc'),
 accessorKey: 'codeDc',
 cell: (item) => (
 <span className="text-muted-foreground line-clamp-1 max-w-[250px]">{item.codeDc || '-'}</span>
 )
 },
 {
 header: t('common.status'),
 accessorKey: 'useAt',
 sortable: true,
 cell: (item) => (
 <div className="flex items-center gap-2">
 <div className={cn("h-2 w-2 rounded-full", item.useAt === 'Y' ? "bg-success" : "bg-destructive")} />
 <span className="text-sm font-medium tracking-tight">{item.useAt === 'Y' ? t('common.active') : t('common.inactive')}</span>
 </div>
 )
 },
 {
 header: t('common.action'),
 accessorKey: 'actions',
 className: 'text-right',
 cell: (item) => (
 <div className="flex justify-end gap-1">
 <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
 <Edit size={14} />
 </Button>
 <Button variant="ghost" size="icon" onClick={() => handleDelete(item.code)} className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
 <Trash2 size={14} />
 </Button>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000"> 
 <div className="flex items-center gap-4 px-6 mb-8">
 <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner rotate-3">
 <Layers size={24} />
 </div>
 <div>
 <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic">{t('admin.system.codeTitle')}</h3>
 <p className="text-[9px] font-black text-slate-400 tracking-tight italic opacity-60">메타데이터 계층 관리 시스템</p>
 </div>
 </div>


 <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
 <div className="lg:col-span-1 space-y-8">
 <div className="px-3">
 <div className="flex items-center justify-between mb-6">
 <h3 className="text-[10px] font-black text-slate-400 tracking-[0.3em] flex items-center gap-2 italic">
 <Layers size={12} className="text-primary animate-pulse" /> {t('admin.system.clHierarchy')}
 </h3>
 <Button variant="ghost" size="icon" onClick={handleOpenClCreate} className="h-6 w-6 text-primary hover:bg-primary/10">
 <Plus size={14} />
 </Button>
 </div>

 <div className="space-y-4">
 {clCodes.length === 0 && (
 <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
 <p className="text-[10px] font-bold text-slate-400 italic">{t('admin.system.noClCode')}</p>
 </div>
 )}
 {clCodes.map((cl) => {
 const clGroups = groups.filter(g => g.clCode === cl.clCode);
 const isExpanded = expandedCl[cl.clCode] || clGroups.some(g => g.codeId === selectedGroupId);

 return (
 <div key={cl.clCode} className="space-y-2">
 <div className={cn(
 "w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all group relative",
 isExpanded ? "bg-slate-50 border-slate-200" : "bg-white border-transparent hover:bg-slate-50"
 )}>
 <button
 onClick={() => toggleCl(cl.clCode)}
 className="flex-1 flex items-center gap-3 overflow-hidden"
 >
 <ChevronRight size={14} className={cn("transition-transform duration-300 opacity-40", isExpanded && "rotate-90 opacity-100 text-primary")} />
 <div className="w-8 h-8 rounded-lg bg-slate-900/5 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
 <Activity size={14} />
 </div>
 <div className="flex flex-col items-start overflow-hidden">
 <span className="text-[11px] font-black tracking-tight truncate w-full">{cl.clCodeNm}</span>
 <span className="text-[8px] font-mono opacity-40">{cl.clCode}</span> 
 </div>
 </button>
 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
 <Button variant="ghost" size="icon" onClick={() => handleOpenGroupCreate(cl.clCode)} className="h-6 w-6 text-primary"><Plus size={12} /></Button>
 <Button variant="ghost" size="icon" onClick={() => handleOpenClEdit(cl)} className="h-6 w-6 text-slate-400"><Edit size={12} /></Button>
 <Button variant="ghost" size="icon" onClick={() => handleClDelete(cl.clCode)} className="h-6 w-6 text-destructive"><Trash2 size={12} /></Button>
 </div>
 </div>

 <AnimatePresence>
 {isExpanded && (clGroups.length > 0) && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden pl-6 space-y-1.5"
 >
 {clGroups.map(g => (
 <div
 key={g.codeId}
 className={cn(
 "w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group",
 selectedGroupId === g.codeId
 ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.02] -translate-x-1"
 : "bg-white border-slate-50 hover:border-slate-100 text-slate-500 hover:text-slate-900"
 )}
 >
 <button
 onClick={() => router.push(`/admin/system/common-code?groupId=${g.codeId}`)}
 className="flex-1 text-left flex flex-col gap-0.5 max-w-[70%]"
 >
 <span className={cn("text-[10px] font-bold leading-tight truncate", selectedGroupId === g.codeId ? "text-white" : "")}>{g.codeIdNm}</span>
 <span className={cn("text-[8px] font-mono opacity-40", selectedGroupId === g.codeId && "text-white/60")}>{g.codeId}</span>
 </button>
 <div className="flex gap-1">
 <Button variant="ghost" size="icon" onClick={() => handleOpenGroupEdit(g)} className={cn("h-6 w-6", selectedGroupId === g.codeId ? "text-white/60 hover:text-white" : "text-slate-400 opacity-0 group-hover:opacity-100")}><Edit size={10} /></Button>
 <Button variant="ghost" size="icon" onClick={() => handleGroupDelete(g.codeId)} className={cn("h-6 w-6", selectedGroupId === g.codeId ? "text-white/60 hover:text-rose-300" : "text-destructive opacity-0 group-hover:opacity-100")}><Trash2 size={10} /></Button>
 <ArrowRightCircle size={12} className={cn("transition-all ml-1", selectedGroupId === g.codeId ? "opacity-100" : "opacity-0 group-hover:opacity-40")} />
 </div>
 </div>
 ))}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 );
 })}
 </div>
 </div>
 </div>

 <div className="lg:col-span-3 space-y-10">
 {!selectedGroupId ? (
 <div className="h-full min-h-[700px] rounded-[4rem] bg-slate-50/50 border-4 border-dashed border-slate-200/50 flex flex-col items-center justify-center text-slate-400 p-12 text-center transition-all group">
 <div className="w-28 h-28 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-10 shadow-2xl group-hover:scale-110 transition-transform duration-700"> 
 <ShieldCheck size={48} className="opacity-20 italic text-primary" />
 </div>
 <p className="font-black text-2xl italic tracking-tighter text-slate-900 mb-4">통합 코드 관리 센터</p>
 <p className="text-sm font-bold max-w-sm leading-relaxed opacity-60">트리에서 공통코드 그룹을 선택하여 상세 내용을 관리하세요.</p>
 </div>
 ) : (
 <div className="space-y-10 animate-in fade-in slide-in-from-right-12 duration-1000"> 
 <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between px-6 gap-10">
 <div className="flex items-center gap-6">
 <div className="relative group/id">
 <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover/id:-rotate-12 transition-all duration-700">
 <Tag size={32} className="text-white" />
 </div>
 </div>
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <span className="text-[10px] font-black text-primary tracking-[0.3em] italic bg-primary/5 px-3 py-1 rounded-full border border-primary/10">{selectedCl?.clCodeNm}</span>
 <ChevronRight size={12} className="opacity-20" />
 <span className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic">{selectedGroup?.codeIdNm}</span>
 </div>
 <h3 className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">
 {selectedGroup?.codeIdNm}
 </h3>
 </div>
 </div>

 <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 shadow-inner w-full xl:w-auto">
 <div className="hidden sm:flex flex-col items-end px-6">
 <span className="text-[10px] font-black text-slate-400 tracking-tight leading-none">글로벌 코드 ID</span>
 <span className="text-lg font-mono font-black italic text-slate-900">{selectedGroupId}</span>
 </div>
 <Button
 onClick={handleOpenCreate}
 className="h-16 px-8 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black tracking-tight shadow-2xl shadow-slate-900/20 hover:-translate-y-1 transition-all flex items-center gap-3 flex-1 xl:flex-none"
 >
 <Plus size={20} /> {t('common.create')}
 </Button>
 </div>
 </div>

 <div className="bg-white rounded-[3rem] p-10 border shadow-2xl relative overflow-hidden group/matrix ring-1 ring-slate-100">
 <DataTable
 title={t('admin.system.matrixTitle')}
 columns={columns}
 data={details}
 loading={loading}
 onExport={handleExport}
 onRefresh={() => {
 setLoading(true);
 router.refresh();
 setTimeout(() => setLoading(false), 500);
 }}
 searchPlaceholder={t('admin.system.detailList')}
 />
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-xl relative overflow-hidden group border border-white/10">
 <div className="flex flex-col gap-1 relative z-10">
 <span className="text-[9px] font-black text-primary tracking-[0.3em] italic">총 정의된 항목</span>
 <div className="flex items-end gap-3">
 <h4 className="text-4xl font-black italic tracking-tighter tabular-nums">{details.length}</h4>
 </div>
 </div>
 <Code2 size={80} className="absolute right-[-10px] bottom-[-10px] opacity-[0.05] -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
 </div>

 <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl relative overflow-hidden group transition-all hover:border-primary/20">
 <div className="flex flex-col gap-1 relative z-10">
 <span className="text-[9px] font-black text-slate-400 tracking-[0.3em] italic">최근 동기화</span>
 <div className="flex items-center gap-3">
 <Clock size={20} className="text-primary opacity-40" />
 <h4 className="text-xl font-black italic tracking-tighter tabular-nums">동기화 완료</h4>
 </div>
 </div>
 </div>

 <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl relative overflow-hidden group transition-all hover:border-primary/20">
 <div className="flex flex-col gap-1 relative z-10">
 <span className="text-[9px] font-black text-slate-400 tracking-[0.3em] italic">보안 프로토콜</span>
 <div className="flex items-center gap-3">
 <ShieldCheck size={20} className="text-emerald-500 opacity-60" /> 
 <h4 className="text-sm font-black italic tracking-tighter">인증 완료</h4>
 </div>
 </div>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* --- 상세코드(Detail) Modal --- */}
 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={mode === 'create' ? t('admin.system.newDetail') : t('admin.system.updateDetail')}
 maxWidth="lg"
 >
 <StandardForm onSubmit={handleSave} className="bg-transparent border-0 shadow-none"> 
 <div className="p-10 space-y-12">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">상세 코드 ID</label>
 <div className="relative">
 <input
 type="text"
 value={formData.code}
 onChange={(e) => setFormData({ ...formData, code: e.target.value })}
 disabled={mode === 'edit'}
 placeholder="CODE_01"
 className="w-full h-16 rounded-2xl border-2 bg-slate-50 disabled:opacity-50 font-black text-xl px-12 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-inner italic tracking-tight"
 />
 <Code2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
 </div>
 </div>
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">상세 코드명</label>
 <input
 type="text"
 value={formData.codeNm}
 onChange={(e) => setFormData({ ...formData, codeNm: e.target.value })}
 placeholder={t('admin.system.codeNm')}
 className="w-full h-16 rounded-2xl border-2 bg-slate-50 font-black text-xl px-6 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-xl italic tracking-tighter"
 />
 </div>
 </div>

 <div className="space-y-4 pt-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">{t('admin.system.statusSetting')}</label>
 <div className="grid grid-cols-2 gap-4">
 <button
 type="button"
 onClick={() => setFormData({ ...formData, useAt: 'Y' })}
 className={cn(
 "h-20 rounded-[1.5rem] border-2 flex items-center justify-center gap-4 transition-all shadow-lg active:scale-95",
 formData.useAt === 'Y' ? "bg-slate-900 border-slate-900 text-white ring-4 ring-slate-900/10" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
 )}
 >
 <div className={cn("w-3 h-3 rounded-full shadow-inner", formData.useAt === 'Y' ? "bg-emerald-400 animate-pulse" : "bg-slate-200")} />
 <span className="text-sm font-black tracking-tight">{t('common.active')}</span> 
 </button>
 <button
 type="button"
 onClick={() => setFormData({ ...formData, useAt: 'N' })}
 className={cn(
 "h-20 rounded-[1.5rem] border-2 flex items-center justify-center gap-4 transition-all shadow-lg active:scale-95",
 formData.useAt === 'N' ? "bg-slate-900 border-slate-900 text-white ring-4 ring-slate-900/10" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
 )}
 >
 <div className={cn("w-3 h-3 rounded-full shadow-inner", formData.useAt === 'N' ? "bg-rose-400 animate-pulse" : "bg-slate-200")} />
 <span className="text-sm font-black tracking-tight">{t('common.inactive')}</span> 
 </button>
 </div>
 </div>

 <div className="space-y-4 pt-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">{t('common.desc')}</label>
 <textarea
 value={formData.codeDc || ''}
 onChange={(e) => setFormData({ ...formData, codeDc: e.target.value })}
 placeholder={t('admin.system.enterCodeDesc')}
 className="w-full min-h-[160px] p-8 rounded-[2.5rem] border-2 bg-slate-50 font-bold text-lg outline-none focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner leading-relaxed resize-none"
 />
 </div>

 <div className="flex gap-6 pt-10">
 <button type="button" onClick={() => setIsOpen(false)} className="flex-1 h-16 border-2 border-slate-100 rounded-2xl font-black text-[10px] tracking-[0.2em] opacity-40 hover:opacity-100 transition-all">{t('common.cancel')}</button>
 <button type="submit" className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-900/30 italic tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 hover:-translate-y-1 transition-all">
 <Save size={20} /> {t('admin.system.saveSettings')}
 </button>
 </div>
 </div>
 </StandardForm>
 </StandardModal>

 {/* --- 분류코드(ClCode) Modal --- */}
 <StandardModal
 isOpen={isClModalOpen}
 onClose={() => setIsClOpen(false)}
 title={clMode === 'create' ? '신규 분류 코드 등록' : '분류 코드 수정'}
 maxWidth="lg"
 >
 <StandardForm onSubmit={handleClSave} className="bg-transparent border-0 shadow-none"> 
 <div className="p-10 space-y-12">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">분류 코드 ID</label>
 <input
 type="text"
 value={clFormData.clCode}
 onChange={(e) => setClFormData({ ...clFormData, clCode: e.target.value })}
 disabled={clMode === 'edit'}
 className="w-full h-16 rounded-2xl border-2 bg-slate-50 font-black text-xl px-6 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-inner italic"
 placeholder="CL_01"
 />
 </div>
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">분류 코드명</label>
 <input
 type="text"
 value={clFormData.clCodeNm}
 onChange={(e) => setClFormData({ ...clFormData, clCodeNm: e.target.value })}
 className="w-full h-16 rounded-2xl border-2 bg-slate-50 font-black text-xl px-6 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-xl italic"
 placeholder="분류 코드 이름"
 />
 </div>
 </div>
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">코드 설명</label>
 <textarea
 value={clFormData.clCodeDc || ''}
 onChange={(e) => setClFormData({ ...clFormData, clCodeDc: e.target.value })}
 className="w-full min-h-[120px] p-6 rounded-2xl border-2 bg-slate-50 font-bold outline-none focus:bg-white transition-all shadow-inner"
 />
 </div>
 <div className="flex gap-6">
 <button type="button" onClick={() => setIsClOpen(false)} className="flex-1 h-14 border-2 rounded-xl font-bold opacity-40">취소</button>
 <button type="submit" className="flex-2 h-14 bg-primary text-white rounded-xl font-bold shadow-lg">저장</button>
 </div>
 </div>
 </StandardForm>
 </StandardModal>

 {/* --- 공통코드(CmmnCode/Group) Modal --- */}
 <StandardModal
 isOpen={isGroupModalOpen}
 onClose={() => setIsGroupOpen(false)}
 title={groupMode === 'create' ? '신규 공통 코드 등록' : '공통 코드 수정'}
 maxWidth="lg"
 >
 <StandardForm onSubmit={handleGroupSave} className="bg-transparent border-0 shadow-none"> 
 <div className="p-10 space-y-12">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">공통 코드 ID</label>
 <input
 type="text"
 value={groupFormData.codeId}
 onChange={(e) => setGroupFormData({ ...groupFormData, codeId: e.target.value })}
 disabled={groupMode === 'edit'}
 className="w-full h-16 rounded-2xl border-2 bg-slate-50 font-black text-xl px-6 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-inner italic"
 placeholder="GRP_01"
 />
 </div>
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">공통 코드명</label>
 <input
 type="text"
 value={groupFormData.codeIdNm}
 onChange={(e) => setGroupFormData({ ...groupFormData, codeIdNm: e.target.value })}
 className="w-full h-16 rounded-2xl border-2 bg-slate-50 font-black text-xl px-6 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-xl italic"
 placeholder="공통 코드 이름"
 />
 </div>
 </div>
 <div className="space-y-4">
 <label className="text-[10px] font-black text-slate-400 tracking-[0.3em] italic px-2">코드 설명</label>
 <textarea
 value={groupFormData.codeIdDc || ''}
 onChange={(e) => setGroupFormData({ ...groupFormData, codeIdDc: e.target.value })}
 className="w-full min-h-[120px] p-6 rounded-2xl border-2 bg-slate-50 font-bold outline-none focus:bg-white transition-all shadow-inner"
 />
 </div>
 <div className="flex gap-6">
 <button type="button" onClick={() => setIsGroupOpen(false)} className="flex-1 h-14 border-2 rounded-xl font-bold opacity-40">취소</button>
 <button type="submit" className="flex-2 h-14 bg-primary text-white rounded-xl font-bold shadow-lg">저장</button>
 </div>
 </div>
 </StandardForm>
 </StandardModal>
 </div>
 );
}
