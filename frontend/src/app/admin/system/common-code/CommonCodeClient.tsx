'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
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
  ArrowRightCircle,
  FileCode,
  LayoutGrid,
  Search,
  RefreshCcw,
  Zap,
  Globe,
  Database,
  SearchCode,
  ArrowUpRight,
  ShieldAlert,
  Fingerprint,
  Monitor,
  CheckCircle2,
  Settings,
  Pencil,
  Box,
  Binary
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
import { Textarea } from '@/components/ui/textarea';
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

  const currentGroup = groups.find(g => g.codeId === selectedGroupId);

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
        toast('성공적으로 저장되었습니다.', 'success');
        setIsOpen(false);
        router.refresh();
      } else {
        toast(res.message || '저장 중 오류가 발생했습니다.', 'error');
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
      toast('성공적으로 삭제되었습니다.', 'success');
      router.refresh();
    } else {
      toast(res.message || '삭제 중 오류가 발생했습니다.', 'error');
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
        toast('분류코드가 저장되었습니다.', 'success');
        setIsClOpen(false);
        router.refresh();
      } else {
        toast(res.message || '저장 중 오류가 발생했습니다.', 'error');
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
      toast('성공적으로 삭제되었습니다.', 'success');
      router.refresh();
    } else {
      toast(res.message || '삭제 중 오류가 발생했습니다.', 'error');
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
        toast('그룹 코드가 저장되었습니다.', 'success');
        setIsGroupOpen(false);
        router.refresh();
      } else {
        toast(res.message || '저장 중 오류가 발생했습니다.', 'error');
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
      toast('성공적으로 삭제되었습니다.', 'success');
      router.refresh();
    } else {
      toast(res.message || '삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns: Column<CommonCodeDetail>[] = [
    { 
      header: '상세 코드 프로토콜', 
      accessor: (item: CommonCodeDetail) => (
        <div className="flex items-center gap-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl transition-all group-hover:rotate-12 duration-500">
                <Box size={18} className="text-primary" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono italic">RES_UID: {item.code}</span>
                <span className="font-black text-foreground tracking-tighter uppercase leading-none">{item.code}</span>
            </div>
        </div>
      ),
      className: 'w-64'
    },
    { 
      header: '코드 명세 (Identity)', 
      accessor: (item: CommonCodeDetail) => (
        <div className="flex flex-col gap-1">
            <span className="font-black text-foreground tracking-tight text-md uppercase">{item.codeNm}</span>
            <span className="text-[9px] font-bold text-muted-foreground/60 truncate block max-w-[250px] italic leading-none">{item.codeDc || 'NO_SPECIFICATION_GIVEN'}</span>
        </div>
      )
    },
    { 
      header: '활성 프로토콜', 
      accessor: (item: CommonCodeDetail) => <HubStatusBadge status={item.useAt === 'Y' ? "ACTIVE" : "INACTIVE"} />,
      className: 'w-32'
    },
    {
      header: 'MANAGEMENT',
      className: 'text-right w-32',
      accessor: (item: CommonCodeDetail) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-10 w-10 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-100 transition-all font-black shadow-sm">
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.codeId, item.code)} className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all shadow-sm">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="공통 표준 코드 거버넌스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드 관리' }]}
      />

      <HubHeader 
        title="Master" 
        highlight="Registry" 
        subtitle="전사 비즈니스 프로세스에 적용되는 공통 표준 데이터 및 도메인 코드 통합 센터" 
        icon={Binary} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
                variant="ghost"
                onClick={() => router.refresh()}
                className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
            >
                <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button
              onClick={handleOpenClCreate}
              size="lg"
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <Plus size={20} /> 신규 분류 도메인 생성
              <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="DOMAIN_CLUSTERS" value={clCodes.length} icon={Layers} color="indigo" />
        <HubMetricCard title="GROUP_NODES" value={groups.length} icon={LayoutGrid} color="primary" />
        <HubMetricCard title="SPEC_ENTITIES" value={details.length} icon={Box} color="emerald" status="ONLINE" />
        <HubMetricCard title="DATA_INTEGRITY" value="100%" icon={ShieldCheck} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12 min-h-[850px]">
        {/* Domain Hierarchy Explorer */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-8">
            <div className="rounded-[4rem] p-12 bg-slate-900 text-white shadow-2xl relative overflow-hidden group border-none">
                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <Database size={240} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-12">
                    <div className="space-y-3">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                            <Layers size={32} className="text-primary" />
                        </div>
                        <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase font-mono">Domain<br />Architecture</h4>
                    </div>

                    <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar-white">
                        {clCodes.map(cl => (
                            <div key={cl.clCode} className="group/cl space-y-4">
                                <div 
                                    className={cn(
                                        "flex items-center justify-between p-6 rounded-3xl transition-all cursor-pointer relative overflow-hidden border-2",
                                        expandedCl[cl.clCode] ? "bg-white text-slate-900 border-white shadow-2xl scale-[1.02]" : "bg-white/5 border-white/5 hover:bg-white/10 text-white/70"
                                    )}
                                    onClick={() => toggleCl(cl.clCode)}
                                >
                                    <div className="flex items-center gap-5 relative z-10">
                                        <ChevronRight size={20} className={cn("transition-transform duration-500", expandedCl[cl.clCode] && "rotate-90 text-primary")} />
                                        <div className="flex flex-col">
                                            <span className="font-black tracking-tight text-md uppercase leading-none mb-1">{cl.clCodeNm}</span>
                                            <span className={cn("text-[9px] font-black tracking-[0.4em] font-mono", expandedCl[cl.clCode] ? "text-slate-400" : "text-white/20 uppercase")}>{cl.clCode}</span>
                                        </div>
                                    </div>
                                    <div className={cn("flex items-center gap-1 transition-opacity", expandedCl[cl.clCode] ? "opacity-100" : "opacity-0 group-hover/cl:opacity-100")}>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenClEdit(cl); }} className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-emerald-500 rounded-xl transition-all border border-transparent hover:border-slate-200"><Settings size={14}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenGroupCreate(cl.clCode); }} className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-500 rounded-xl transition-all border border-transparent hover:border-slate-200"><Plus size={14}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteCl(cl.clCode); }} className="p-2.5 hover:bg-rose-50 text-rose-400 rounded-xl transition-all border border-transparent hover:border-rose-100"><Trash2 size={14}/></button>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {expandedCl[cl.clCode] && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0, x: -10 }}
                                            animate={{ height: "auto", opacity: 1, x: 0 }}
                                            exit={{ height: 0, opacity: 0, x: -10 }}
                                            className="ml-10 space-y-3"
                                        >
                                            {groups.filter(g => g.clCode === cl.clCode).map(group => (
                                                <div 
                                                    key={group.codeId}
                                                    onClick={() => router.push(`/admin/system/codes?groupId=${group.codeId}`)}
                                                    className={cn(
                                                        "group/item flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden",
                                                        selectedGroupId === group.codeId 
                                                            ? "bg-primary text-white border-primary shadow-2xl scale-[1.05]" 
                                                            : "bg-white/5 border-white/5 hover:bg-white/10 text-white/50"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-4 relative z-10">
                                                        <div className={cn("w-2 h-2 rounded-full", selectedGroupId === group.codeId ? "bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse" : "bg-white/20")} />
                                                        <span className="text-[11px] font-black tracking-widest leading-none uppercase">{group.codeIdNm}</span>
                                                    </div>
                                                    <div className={cn("flex items-center gap-1 transition-all", selectedGroupId === group.codeId ? "opacity-100 scale-110" : "opacity-0 group-hover/item:opacity-100")}>
                                                        <button onClick={(e) => { e.stopPropagation(); handleOpenGroupEdit(group); }} className="p-2 hover:bg-white/20 rounded-lg transition-colors"><Settings size={12} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.codeId); }} className="p-2 hover:bg-rose-500/20 text-rose-200 rounded-lg transition-colors"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {groups.filter(g => g.clCode === cl.clCode).length === 0 && (
                                                <p className="py-4 text-center text-[9px] font-black text-white/10 tracking-[0.4em] uppercase">EMPTY_DOMAIN_CLUSTER</p>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic uppercase opacity-60 max-w-[200px]">
                            * 도메인 아키텍처의 변경은 전사 시스템 데이터 무결성에 영향을 미칩니다.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* Code Specification Matrix */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-10 h-full">
            <HubSectionCard 
                title="상세 코드 아키텍처 매트릭스" 
                description="선택된 비즈니스 도메인 내의 정적 데이터 매트릭스 및 실시간 상태 프로브입니다." 
                icon={SearchCode}
                action={
                    <div className="flex gap-4 p-2 items-center">
                        <Button 
                            variant="ghost"
                            onClick={() => exportToCsv(details, [], 'master-code-registry')}
                            className="h-12 px-6 rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-400 font-black text-[10px] tracking-widest uppercase hover:text-primary hover:bg-primary/5 transition-all shadow-sm group"
                        >
                            EXPORT_SPEC
                        </Button>
                        <Button
                            onClick={handleOpenCreate}
                            disabled={!selectedGroupId}
                            className="h-12 px-8 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 disabled:opacity-20"
                        >
                            <Plus size={18} /> REGISTER_SPEC
                        </Button>
                    </div>
                }
            >
                <div className="relative min-h-[600px] flex flex-col">
                    <StandardDataTable
                        columns={columns}
                        data={details}
                        loading={loading}
                        emptyMessage="조회된 상세 코드 데이터가 존재하지 않습니다."
                        className="border-none bg-transparent flex-1"
                    />

                    {!selectedGroupId && (
                        <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-[3rem] flex items-center justify-center z-20 animate-in fade-in duration-700">
                             <div className="text-center space-y-8 max-w-sm">
                                <div className="w-24 h-24 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex items-center justify-center mx-auto shadow-2xl">
                                    <Monitor size={48} className="text-slate-100" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Matrix_Locked</h3>
                                    <p className="text-[12px] font-black text-slate-400 tracking-[0.5em] uppercase leading-relaxed font-mono">Select_Domain_from_Hierarchy_to_Initialize_Probe</p>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </HubSectionCard>
        </div>
      </div>

      {/* Detail Code Specification Modal */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '신규 상세 코드 프로비저닝' : '코드 명세 아키텍처 수정'}
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
             <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest uppercase border-2">CANCEL</Button>
             <Button onClick={handleSave} disabled={loading} className="flex-[2] h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
              <Zap size={18} className="group-hover:animate-pulse" /> {mode === 'create' ? 'DEPLOY_SPECIFICATION' : 'PATCH_SPECIFICATION'}
            </Button>
          </div>
        }
      >
        <div className="space-y-10 pt-4">
            <div className="grid grid-cols-2 gap-8">
                <FormField label="상세 코드 식별자 (Node UID)" required description="도메인 내에서 유일한 고정 식별자">
                    <div className="relative group/code">
                        <Binary size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/code:opacity-100 transition-opacity" />
                        <Input
                            placeholder="CODE_IDENTIFIER"
                            value={formData.code}
                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                            className="h-16 pl-16 rounded-2xl border-2 text-md font-black italic tracking-widest uppercase shadow-inner"
                        />
                    </div>
                </FormField>
                <FormField label="시스템 사용 상태 (Protocol Status)" description="현재 코드의 운영 서버 실시간 활성화 여부">
                    <select 
                        value={formData.useAt} 
                        onChange={(e) => setFormData(prev => ({ ...prev, useAt: e.target.value as 'Y' | 'N' }))}
                        className="w-full h-16 px-8 rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-[11px] font-black tracking-widest uppercase focus:ring-8 focus:ring-primary/5 outline-none transition-all shadow-inner cursor-pointer"
                    >
                        <option value="Y">ACTIVE_RUNNING</option>
                        <option value="N">SYSTEM_SUSPENDED</option>
                    </select>
                </FormField>
            </div>

            <FormField label="코드 레이블 명칭" required description="사용자 인터페이스에 노출될 명문화된 이름">
                <div className="relative group/nm">
                    <Pencil size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/nm:opacity-100 transition-opacity" />
                    <Input
                        placeholder="코드 명칭 입력"
                        value={formData.codeNm}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeNm: e.target.value }))}
                        className="h-16 pl-16 rounded-2xl border-2 text-md font-black tracking-tight shadow-inner"
                    />
                </div>
            </FormField>

            <FormField label="상세 메타데이터 프로파일" description="코드의 기술적 용도 및 비즈니스 로직 명세">
                <div className="relative group/dc">
                    <FileCode size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
                    <Textarea
                        placeholder="데이터 명세 입력"
                        value={formData.codeDc}
                        onChange={(e) => setFormData(prev => ({ ...prev, codeDc: e.target.value }))}
                        className="min-h-[160px] pl-16 p-8 rounded-[2.5rem] border-2 bg-slate-50/50 text-xs font-bold focus:ring-8 focus:ring-primary/5 outline-none transition-all resize-none shadow-inner"
                    />
                </div>
            </FormField>
        </div>
      </StandardModal>

      {/* CL Code Modal */}
      <StandardModal
        isOpen={isClModalOpen}
        onClose={() => setIsClOpen(false)}
        title="도메인 분류 코드 관리"
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsClOpen(false)} className="flex-1 h-11 rounded-xl">취소</Button>
            <Button onClick={handleSaveCl} disabled={loading} className="flex-1 h-11 rounded-xl shadow-lg">저장</Button>
          </div>
        }
      >
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="분류 코드 ID" required>
              <Input value={clFormData.clCode} onChange={e => setClFormData({...clFormData, clCode: e.target.value})} readOnly={clMode === 'edit'} className="h-11 rounded-xl font-black italic bg-muted/50" />
            </FormField>
            <FormField label="코드 명칭" required>
              <Input value={clFormData.clCodeNm} onChange={e => setClFormData({...clFormData, clCodeNm: e.target.value})} className="h-11 rounded-xl font-bold" />
            </FormField>
          </div>
          <FormField label="분류 설명">
            <Input value={clFormData.clCodeDc} onChange={e => setClFormData({...clFormData, clCodeDc: e.target.value})} className="h-11 rounded-xl" />
          </FormField>
        </div>
      </StandardModal>

      {/* Group Code Modal */}
      <StandardModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupOpen(false)}
        title="비즈니스 그룹 코드 관리"
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsGroupOpen(false)} className="flex-1 h-11 rounded-xl">취소</Button>
            <Button onClick={handleSaveGroup} disabled={loading} className="flex-1 h-11 rounded-xl shadow-lg">저장</Button>
          </div>
        }
      >
        <div className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="공통코드 ID" required>
              <Input value={groupFormData.codeId} onChange={e => setGroupFormData({...groupFormData, codeId: e.target.value})} readOnly={groupMode === 'edit'} className="h-11 rounded-xl font-black italic bg-muted/50" />
            </FormField>
            <FormField label="부모 분류코드">
              <Input value={groupFormData.clCode} readOnly className="h-11 rounded-xl bg-muted/50 font-mono text-xs" />
            </FormField>
          </div>
          <FormField label="그룹 코드 명칭" required>
            <Input value={groupFormData.codeIdNm} onChange={e => setGroupFormData({...groupFormData, codeIdNm: e.target.value})} className="h-11 rounded-xl font-bold" />
          </FormField>
          <FormField label="그룹 상세 설명">
            <Input value={groupFormData.codeIdDc} onChange={e => setGroupFormData({...groupFormData, codeIdDc: e.target.value})} className="h-11 rounded-xl text-muted-foreground" />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}
