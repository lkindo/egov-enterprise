'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
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
  Activity,
  ShieldCheck,
  Code2,
  Clock,
  ArrowRightCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { FormField } from '@/app/components/ui/standard-form';
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
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function CommonCodeClient({ clCodes, groups, details, selectedGroupId }: { clCodes: any[]; groups: any[]; details: CommonCodeDetail[]; selectedGroupId: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(false);
  
  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<CommonCodeDetail>>({
    codeId: '', code: '', codeNm: '', codeDc: '', useAt: 'Y'
  });

  const [isClModalOpen, setIsClOpen] = useState(false);
  const [clMode, setClMode] = useState<'create' | 'edit'>('create');
  const [clFormData, setClFormData] = useState<Partial<any>>({ clCode: '', clCodeNm: '', clCodeDc: '', useAt: 'Y' });

  const [isGroupModalOpen, setIsGroupOpen] = useState(false);
  const [groupMode, setGroupMode] = useState<'create' | 'edit'>('create');
  const [groupFormData, setGroupFormData] = useState<Partial<any>>({ codeId: '', codeIdNm: '', codeIdDc: '', clCode: '', useAt: 'Y' });

  const [expandedCl, setExpandedCl] = useState<Record<string, boolean>>({});

  const toggleCl = (clCode: string) => {
    setExpandedCl(prev => ({ ...prev, [clCode]: !prev[clCode] }));
  };

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

  const handleDelete = async (id: string, code: string) => {
    const ok = await confirm({
      title: '삭제 확인',
      message: '정말로 상세코드를 삭제하시겠습니까?',
      variant: 'destructive'
    });
    if (!ok) return;
    const res = await deleteCodeDetail(null, { codeId: id, code });
    if (res.success) {
      toast(res.message, 'success');
      router.refresh();
    } else {
      toast(res.message, 'error');
    }
  };

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

  const handleSaveCl = async () => {
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

  const handleDeleteCl = async (clCode: string) => {
    const ok = await confirm({ title: '분류코드 삭제', message: '이 작업은 되돌릴 수 없습니다.', variant: 'destructive' });
    if (!ok) return;
    const res = await deleteClCode(null, clCode);
    if (res.success) {
        toast(res.message, 'success');
        router.refresh();
    } else {
        toast(res.message, 'error');
    }
  };

  const handleOpenGroupCreate = (clCode: string) => {
    setGroupMode('create');
    setGroupFormData({ codeId: '', codeIdNm: '', codeIdDc: '', clCode, useAt: 'Y' });
    setIsGroupOpen(true);
  };

  const handleOpenGroupEdit = (group: any) => {
    setGroupMode('edit');
    setGroupFormData(group);
    setIsGroupOpen(true);
  };

  const handleSaveGroup = async () => {
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

  const handleDeleteGroup = async (codeId: string) => {
    const ok = await confirm({ title: '공통코드 삭제', message: '그룹 코드를 삭제하시겠습니까?', variant: 'destructive' });
    if (!ok) return;
    const res = await deleteCmmnCode(null, codeId);
    if (res.success) {
        toast(res.message, 'success');
        router.refresh();
    } else {
        toast(res.message, 'error');
    }
  };

  const columns: Column<CommonCodeDetail>[] = [
    { 
       header: '상세 코드', 
       accessor: (item: CommonCodeDetail) => <span className="font-mono font-bold text-muted-foreground/60">{item.code}</span>
    },
    { 
       header: '코드 명칭', 
       accessor: (item: CommonCodeDetail) => <span className="font-bold text-foreground italic">{item.codeNm}</span>
    },
    { 
       header: '코드 설명', 
       accessor: (item: CommonCodeDetail) => <span className="text-sm text-muted-foreground truncate block max-w-[300px]">{item.codeDc}</span>
    },
    { 
      header: '사용 여부', 
      accessor: (item: CommonCodeDetail) => (
        <span className={cn(
          "px-2 py-1 rounded-full text-[10px] font-black tracking-widest uppercase italic border",
          item.useAt === 'Y' ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800" : "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800"
        )}>
          {item.useAt === 'Y' ? 'ACTIVE' : 'INACTIVE'}
        </span>
      )
    },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item: CommonCodeDetail) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-9 w-9 rounded-lg">
            <Edit size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.codeId, item.code)} className="h-9 w-9 text-rose-500 hover:text-rose-600 rounded-lg">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-24 px-4 md:px-0 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="코드 시스템 매트릭스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }]}
        actions={
          <div className="flex gap-4">
             <Button 
                onClick={handleOpenClCreate}
                className="h-14 px-8 rounded-2xl font-bold italic shadow-lg hover:-translate-y-1 transition-all"
             >
               <Plus size={20} className="mr-2" /> 분류코드 추가
             </Button>
             <Button 
                variant="outline"
                onClick={() => exportToCsv(details, [], 'common-codes-detailed')}
                className="h-14 px-8 rounded-2xl font-bold border-2 border-border italic hover:bg-muted transition-all"
             >
               Export Hub
             </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black italic tracking-tighter text-foreground">Domain Hierarchy</h3>
              <p className="text-[10px] font-black text-muted-foreground tracking-widest uppercase opacity-60">System Code Domains</p>
            </div>
          </div>

          <div className="space-y-4 max-h-[1000px] overflow-y-auto pr-4 custom-scrollbar">
            {clCodes.map(cl => (
              <div key={cl.clCode} className="group">
                <div 
                  className={cn(
                    "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden",
                    expandedCl[cl.clCode] ? "bg-primary text-white border-primary shadow-lg scale-[1.02]" : "bg-card border-border hover:border-primary/50 text-foreground"
                  )}
                  onClick={() => toggleCl(cl.clCode)}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <ChevronRight size={18} className={cn("transition-transform duration-300", expandedCl[cl.clCode] && "rotate-90")} />
                    <div className="flex flex-col">
                      <span className="font-bold tracking-tight italic">{cl.clCodeNm}</span>
                      <span className={cn("text-[10px] font-mono", expandedCl[cl.clCode] ? "text-white/60" : "text-muted-foreground")}>{cl.clCode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenClEdit(cl); }} className={cn("h-8 w-8", expandedCl[cl.clCode] ? "text-white hover:bg-white/10" : "text-muted-foreground")}><Edit size={14}/></Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenGroupCreate(cl.clCode); }} className={cn("h-8 w-8", expandedCl[cl.clCode] ? "text-white hover:bg-white/10" : "text-muted-foreground")}><Plus size={14}/></Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteCl(cl.clCode); }} className={cn("h-8 w-8", expandedCl[cl.clCode] ? "text-white hover:bg-white/10" : "text-rose-500")}><Trash2 size={14}/></Button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedCl[cl.clCode] && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-8 mt-4 space-y-3 overflow-hidden"
                    >
                      {groups.filter(g => g.clCode === cl.clCode).map(group => (
                        <div 
                          key={group.codeId}
                          onClick={() => router.push(`/admin/system/codes?groupId=${group.codeId}`)}
                          className={cn(
                            "group/item flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                            selectedGroupId === group.codeId ? "bg-slate-900 text-white dark:bg-card dark:text-foreground shadow-xl border-slate-900 dark:border-border" : "bg-muted/30 border-border/50 hover:bg-muted text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3">
                             <div className={cn("w-1.5 h-1.5 rounded-full", selectedGroupId === group.codeId ? "bg-primary animate-pulse" : "bg-muted-foreground/30")} />
                             <span className="text-sm font-bold tracking-tight italic">{group.codeIdNm}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-all">
                             <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenGroupEdit(group); }} className={cn("h-7 w-7", selectedGroupId === group.codeId ? "text-white hover:bg-white/10 dark:text-muted-foreground" : "text-muted-foreground")}><Edit size={12} /></Button>
                             <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.codeId); }} className={cn("h-7 w-7", selectedGroupId === group.codeId ? "text-rose-400 hover:bg-white/10" : "text-rose-500")}><Trash2 size={12} /></Button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <div className="bg-slate-900 text-white dark:bg-card dark:text-foreground p-12 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] relative overflow-hidden">
             <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                <div className="w-24 h-24 bg-white/10 dark:bg-primary/5 rounded-[2rem] flex items-center justify-center p-6 backdrop-blur-3xl border border-white/20">
                   <Tag size={48} className="text-primary-foreground dark:text-primary" />
                </div>
                <div className="space-y-3 flex-1 text-center md:text-left">
                   <h2 className="text-4xl font-black italic tracking-tighter">
                     {selectedGroupId ? groups.find(g => g.codeId === selectedGroupId)?.codeIdNm : "Select Domain"}
                   </h2>
                   <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 dark:bg-muted rounded-full text-[10px] font-black tracking-widest uppercase italic">
                         <Activity size={12} /> Live Engine Status: Synced
                      </div>
                      <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 rounded-full text-[10px] font-black tracking-widest uppercase italic text-emerald-400">
                         <ShieldCheck size={12} /> Integrity: High
                      </div>
                   </div>
                   <p className="text-slate-400 font-medium leading-relaxed max-w-xl">
                      {selectedGroupId ? groups.find(g => g.codeId === selectedGroupId)?.codeIdDc : "아래 데이터 그리드를 활성화하기 위해 왼쪽 사이드바에서 공통코드 그룹을 선택하십시오."}
                   </p>
                </div>
                {selectedGroupId && (
                  <Button 
                    onClick={handleOpenCreate}
                    className="h-16 px-10 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black italic shadow-2xl transition-transform hover:scale-105"
                  >
                    <Plus size={24} className="mr-2" /> CREATE CODE
                  </Button>
                )}
             </div>
             <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/20 blur-[120px] rounded-full" />
          </div>

          <div className="bg-card border-2 border-border p-12 rounded-[3.5rem] shadow-sm relative group overflow-hidden">
            <div className="flex items-center justify-between mb-10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                    <Code2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black italic tracking-tighter text-foreground">Data Pipeline</h3>
                    <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em]">Detailed Record Stream</p>
                  </div>
               </div>
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-muted-foreground italic">
                     <Clock size={16} />
                     <span className="text-[10px] font-black tracking-widest uppercase">Last Synced: 2026-03-20</span>
                  </div>
               </div>
            </div>

            <div className="bg-muted/20 rounded-[2.5rem] p-6 border-2 border-border/10 overflow-hidden">
              <StandardDataTable 
                columns={columns} 
                data={details} 
                emptyMessage="등록된 상세 코드가 없습니다."
                className="border-none"
              />
            </div>
            {!selectedGroupId && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-md flex items-center justify-center z-20">
                 <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto shadow-inner text-muted-foreground">
                      <Layers size={32} />
                    </div>
                    <div>
                       <h4 className="text-xl font-black italic tracking-tighter text-foreground">데이터 비활성화됨</h4>
                       <p className="text-xs text-muted-foreground font-medium">왼쪽에서 공통코드 그룹을 먼저 선택해주세요.</p>
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '신규 상세코드 등록' : '코드 정보 수정'}
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-xl font-bold">취소</Button>
            <Button onClick={handleSave} disabled={loading} className="flex-[2] h-11 rounded-xl font-bold italic">
              {mode === 'create' ? '등록 완료' : '수정 완료'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pt-2">
            <FormField label="부모 코드 ID" required>
               <Input value={formData.codeId} readOnly className="bg-muted/30 font-mono text-xs italic h-10 border-none" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="상세 코드" required>
                <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="h-10 text-sm font-semibold" placeholder="예: 01" />
              </FormField>
              <FormField label="사용 여부">
                 <select value={formData.useAt} onChange={e => setFormData({...formData, useAt: e.target.value as "Y" | "N"})} className="w-full h-10 px-4 rounded-xl border bg-background text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none">
                   <option value="Y">--- 사용 중 ---</option>
                   <option value="N">--- 사용 안 함 ---</option>
                 </select>
              </FormField>
            </div>
            <FormField label="상세 코드 명칭" required>
               <Input value={formData.codeNm} onChange={e => setFormData({...formData, codeNm: e.target.value})} className="h-10 text-sm font-semibold" placeholder="코드 이름 입력" />
            </FormField>
            <FormField label="상세 코드 설명">
               <textarea value={formData.codeDc} onChange={e => setFormData({...formData, codeDc: e.target.value})} className="w-full min-h-[100px] p-4 rounded-xl border bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none resize-none shadow-inner" placeholder="코드에 대한 상세 설명" />
            </FormField>
        </div>
      </StandardModal>

      <StandardModal
        isOpen={isClModalOpen}
        onClose={() => setIsClOpen(false)}
        title="분류코드 관리"
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={() => setIsClOpen(false)} className="flex-1 h-11 rounded-xl font-bold">취소</Button>
            <Button onClick={handleSaveCl} disabled={loading} className="flex-[2] h-11 rounded-xl font-bold italic">저장 완료</Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
             <FormField label="분류 코드 ID" required>
                <Input value={clFormData.clCode} onChange={e => setClFormData({...clFormData, clCode: e.target.value})} readOnly={clMode === 'edit'} className="h-10 text-sm font-bold bg-muted/30" />
             </FormField>
             <FormField label="코드 명칭" required>
                <Input value={clFormData.clCodeNm} onChange={e => setClFormData({...clFormData, clCodeNm: e.target.value})} className="h-10 text-sm font-bold" />
             </FormField>
          </div>
          <FormField label="설명">
             <Input value={clFormData.clCodeDc} onChange={e => setClFormData({...clFormData, clCodeDc: e.target.value})} className="h-10 text-sm" />
          </FormField>
        </div>
      </StandardModal>

      <StandardModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupOpen(false)}
        title="공통코드(그룹) 관리"
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={() => setIsGroupOpen(false)} className="flex-1 h-11 rounded-xl font-bold">취소</Button>
            <Button onClick={handleSaveGroup} disabled={loading} className="flex-[2] h-11 rounded-xl font-bold italic">저장 완료</Button>
          </div>
        }
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
             <FormField label="공통코드 ID" required>
                <Input value={groupFormData.codeId} onChange={e => setGroupFormData({...groupFormData, codeId: e.target.value})} readOnly={groupMode === 'edit'} className="h-10 text-sm font-bold bg-muted/30" />
             </FormField>
             <FormField label="분류코드 (부모)">
                <Input value={groupFormData.clCode} readOnly className="h-10 text-sm bg-muted/30 font-mono italic" />
             </FormField>
          </div>
          <FormField label="공통코드 명칭" required>
             <Input value={groupFormData.codeIdNm} onChange={e => setGroupFormData({...groupFormData, codeIdNm: e.target.value})} className="h-10 text-sm font-bold" />
          </FormField>
          <FormField label="설명">
             <Input value={groupFormData.codeIdDc} onChange={e => setGroupFormData({...groupFormData, codeIdDc: e.target.value})} className="h-10 text-sm text-muted-foreground font-medium" />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}
