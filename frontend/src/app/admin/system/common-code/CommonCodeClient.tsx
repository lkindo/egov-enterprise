'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { DataTable, Column } from '@/components/common/DataTable';
import { exportToCsv } from '@/lib/utils/exportUtils';
import { CommonCodeDetail } from '@/services/admin/system/CodeAdminService';
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
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { saveCodeDetail, deleteCodeDetail } from '@/app/actions/codeActions';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function CommonCodeClient({ groups, details, selectedGroupId }: { groups: any[]; details: CommonCodeDetail[]; selectedGroupId: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<CommonCodeDetail>>({
    codeId: '',
    code: '',
    codeNm: '',
    codeDc: '',
    useAt: 'Y'
  });

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
    const res = await saveCodeDetail(null, formData);
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const handleDelete = async (code: string) => {
    if (!selectedGroupId) return;
    const isConfirmed = await confirm({
      title: '상세 코드 삭제',
      message: `[${code}] 코드를 삭제하시겠습니까?`,
      variant: 'destructive'
    });

    if (isConfirmed) {
      const res = await deleteCodeDetail(null, { codeId: selectedGroupId, code });
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const handleExport = () => {
    const exportColumns = [
      { header: '코드', accessorKey: 'code' },
      { header: '코드명', accessorKey: 'codeNm' },
      { header: '설명', accessorKey: 'codeDc' },
      { header: '사용여부', accessorKey: 'useAt' },
    ];
    exportToCsv(details, exportColumns as any, `CommonCodes_${selectedGroupId}`);
    toast('데이터를 내보냈습니다.', 'success');
  };

  const columns: Column<CommonCodeDetail>[] = [
    {
      header: '코드',
      accessorKey: 'code',
      sortable: true,
      cell: (item) => (
        <span className="font-mono font-bold text-primary">{item.code}</span>
      )
    },
    {
      header: '코드명',
      accessorKey: 'codeNm',
      sortable: true,
      cell: (item) => (
        <span className="font-bold">{item.codeNm}</span>
      )
    },
    {
      header: '설명',
      accessorKey: 'codeDc',
      cell: (item) => (
        <span className="text-muted-foreground line-clamp-1 max-w-[250px]">{item.codeDc || '-'}</span>
      )
    },
    {
      header: '상태',
      accessorKey: 'useAt',
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className={cn("h-2 w-2 rounded-full", item.useAt === 'Y' ? "bg-success" : "bg-destructive")} />
          <span className="text-xs font-medium uppercase tracking-widest">{item.useAt === 'Y' ? 'ACTIVE' : 'INACTIVE'}</span>
        </div>
      )
    },
    {
      header: '관리',
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
      <PageHeader
        title="시스템 공통 코드 프레임워크"
        breadcrumbs={[{ label: '시스템관리' }, { label: '코드관리' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Left: Code Groups */}
        <div className="lg:col-span-1 space-y-8">
          <div className="flex items-center justify-between px-3">
            <div className="space-y-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2 italic">
                <Activity size={12} className="text-primary animate-pulse" /> Code Taxonomy
              </h3>
            </div>
            <button className="text-primary hover:bg-primary/10 p-2.5 rounded-2xl transition-all border border-transparent hover:border-primary/20 shadow-sm" title="그룹 추가"><Plus size={20} /></button>
          </div>
          <div className="flex flex-col gap-4">
            {groups.map((g: any) => (
              <button
                key={g.codeId}
                onClick={() => router.push(`/admin/system/common-code?groupId=${g.codeId}`)}
                className={cn(
                  "flex items-center justify-between p-6 rounded-[2rem] border-2 text-left transition-all group relative overflow-hidden",
                  selectedGroupId === g.codeId
                    ? "bg-slate-900 text-white border-slate-900 shadow-[0_20px_40px_rgba(15,23,42,0.15)] translate-x-2"
                    : "bg-white border-slate-50 hover:border-slate-200 hover:bg-slate-50 shadow-sm"
                )}
              >
                <div className="flex items-center gap-5 relative z-10">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                    selectedGroupId === g.codeId ? "bg-white/10 ring-1 ring-white/20" : "bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary"
                  )}>
                    <Layers size={20} className={cn(selectedGroupId === g.codeId && "animate-pulse")} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight uppercase italic">{g.codeIdNm}</span>
                    <span className={cn("text-[9px] font-mono font-bold tracking-widest opacity-40 italic", selectedGroupId === g.codeId ? "text-white" : "text-slate-400")}>{g.codeId}</span>
                  </div>
                </div>
                <ChevronRight size={16} className={cn("transition-all relative z-10", selectedGroupId === g.codeId ? "translate-x-1" : "opacity-0 group-hover:opacity-100")} />
                {selectedGroupId === g.codeId && <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16 animate-pulse" />}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Code Details */}
        <div className="lg:col-span-3 space-y-10">
          {!selectedGroupId ? (
            <div className="h-full min-h-[600px] rounded-[4rem] bg-slate-50/50 border-4 border-dashed border-slate-200/50 flex flex-col items-center justify-center text-slate-400 p-12 text-center transition-all group">
              <div className="w-28 h-28 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-10 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                <Code2 size={48} className="opacity-20 italic text-primary" />
              </div>
              <p className="font-black text-2xl italic uppercase tracking-tighter text-slate-900 mb-4">Initialize Data Protocol</p>
              <p className="text-sm font-bold max-w-sm leading-relaxed opacity-60">좌측 리스트에서 코드 아키텍처 그룹을 선택하십시오.<br />선택한 그룹에 최적화된 상세 프로토콜 정의 매트릭스가 활성화됩니다.</p>
              <div className="mt-12 flex gap-4 text-[9px] font-black uppercase tracking-[0.2em] opacity-30 italic">
                <span className="animate-pulse">Waiting for Selection</span>
                <span>•</span>
                <span>System Idle</span>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-12 duration-1000">
              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between px-6 gap-6">
                <div className="space-y-3">
                  <div className="inline-flex px-4 py-1.5 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 italic shadow-inner">
                    <ShieldCheck size={12} className="mr-2 text-emerald-500" /> Authorized Perspective
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden group/icon">
                      <Tag size={24} className="relative z-10 rotate-12 transition-transform group-hover/icon:rotate-0" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary/40 blur-xl opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
                        {groups.find((g: any) => g.codeId === selectedGroupId)?.codeIdNm}
                      </h3>
                      <span className="text-[10px] font-mono font-black text-slate-400 tracking-[0.4em] mt-2 italic px-1 opacity-60 uppercase">{selectedGroupId} Protocol Chain</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleOpenCreate}
                    className="h-16 px-10 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 border border-white/10"
                  >
                    <Plus size={20} /> Establish New Code
                  </Button>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] p-8 border shadow-2xl relative overflow-hidden group/matrix">
                <DataTable
                  title="코드 상세 정의 매트릭스"
                  columns={columns}
                  data={details}
                  loading={loading}
                  onExport={handleExport}
                  onRefresh={() => {
                    setLoading(true);
                    router.refresh();
                    setTimeout(() => setLoading(false), 500);
                  }}
                  searchPlaceholder="상세 코드 검색..."
                />
                <Layers size={200} className="absolute right-[-40px] bottom-[-40px] opacity-[0.02] -rotate-12 transition-transform duration-1000 group-hover/matrix:rotate-0" />
              </div>

              <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                  <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
                    <Info size={36} className="text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-3 flex-1 text-center md:text-left">
                    <h4 className="text-2xl font-black italic tracking-tighter uppercase">Protocol Documentation Control</h4>
                    <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-2xl">
                      선택된 그룹 내에서 공통 코드의 세부 프로토콜을 정의하고 런타임 환경에 즉각적으로 브로드캐스팅하십시오.
                      모든 변경사항은 <span className="text-primary font-black italic">Next-Auth 기반 보안 환경</span>에서 추적 및 감사됩니다.
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 pr-4">
                    <span className="text-[10px] font-black tracking-widest uppercase opacity-40">System Response</span>
                    <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                      <Clock size={14} className="text-emerald-400" />
                      <span className="text-sm font-mono font-black italic uppercase tracking-tighter">0.03ms Normalized</span>
                    </div>
                  </div>
                </div>
                <Activity size={200} className="absolute inset-0 m-auto opacity-[0.03] group-hover:scale-110 transition-transform duration-1000 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 상세 코드 등록/수정 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? 'Broadcast New Protocol Entry' : 'Refine Knowledge Protocol'}
        maxWidth="lg"
      >
        <StandardForm onSubmit={handleSave} className="bg-transparent border-0 shadow-none">
          <div className="p-10 space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Unique Code Sequence
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    disabled={mode === 'edit'}
                    placeholder="01 / REQ"
                    className="w-full h-16 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 disabled:opacity-50 font-black text-xl px-12 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase italic tracking-widest"
                  />
                  <Code2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Protocol Display Label
                </label>
                <input
                  type="text"
                  value={formData.codeNm}
                  onChange={(e) => setFormData({ ...formData, codeNm: e.target.value })}
                  placeholder="ENTER NOMENCLATURE"
                  className="w-full h-16 rounded-2xl border-2 bg-slate-50 dark:bg-slate-800 font-black text-xl px-6 outline-none focus:ring-8 focus:ring-primary/5 transition-all shadow-xl italic tracking-tighter"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Deployment Status
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, useAt: 'Y' })}
                  className={cn(
                    "h-20 rounded-[1.5rem] border-2 flex items-center justify-center gap-4 transition-all shadow-lg active:scale-95",
                    formData.useAt === 'Y' ? "bg-slate-900 border-slate-900 text-white ring-4 ring-slate-900/10" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full shadow-inner", formData.useAt === 'Y' ? "bg-emerald-400 animate-pulse" : "bg-slate-200")} />
                  <span className="text-xs font-black uppercase tracking-widest">Active Matrix</span>
                  {formData.useAt === 'Y' && <ArrowRightCircle size={16} className="text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, useAt: 'N' })}
                  className={cn(
                    "h-20 rounded-[1.5rem] border-2 flex items-center justify-center gap-4 transition-all shadow-lg active:scale-95",
                    formData.useAt === 'N' ? "bg-slate-900 border-slate-900 text-white ring-4 ring-slate-900/10" : "bg-white border-slate-100 text-slate-400 hover:border-slate-300 dark:bg-slate-800 dark:border-slate-700"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full shadow-inner", formData.useAt === 'N' ? "bg-rose-400 animate-pulse" : "bg-slate-200")} />
                  <span className="text-xs font-black uppercase tracking-widest">Suspended</span>
                  {formData.useAt === 'N' && <ArrowRightCircle size={16} className="text-rose-400" />}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Architectural Meta Description
              </label>
              <textarea
                value={formData.codeDc || ''}
                onChange={(e) => setFormData({ ...formData, codeDc: e.target.value })}
                placeholder="Describe the functional scope and technical impact of this code point..."
                className="w-full min-h-[160px] p-8 rounded-[2.5rem] border-2 bg-slate-50 dark:bg-slate-800 font-bold text-lg outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-8 focus:ring-primary/5 transition-all resize-none shadow-inner leading-relaxed"
              />
            </div>

            <div className="flex gap-6 pt-10">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 h-16 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all opacity-40 hover:opacity-100 dark:border-slate-700 dark:hover:bg-slate-800">Abort Protocol</button>
              <button type="submit" className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black shadow-2xl shadow-slate-900/30 italic uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 hover:-translate-y-1 transition-all active:scale-95 border border-white/10 group">
                <Save size={20} className="group-hover:rotate-12 transition-transform" /> Persist Protocol Configuration
              </button>
            </div>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}
