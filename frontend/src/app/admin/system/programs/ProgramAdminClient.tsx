'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { SmartSearchPanel } from '@/app/components/ui/standard-search-filter';
import { Program, ProgramResponse } from '@/types/program';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  Plus,
  Code,
  Globe,
  Trash2,
  Edit,
  Terminal,
  Layers,
  Cpu,
  Activity,
  FileCode,
  Link as LinkIcon,
  ShieldCheck,
  Search,
  Settings,
  ChevronRight
} from 'lucide-react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { saveProgramAction, deleteProgramAction } from '@/app/actions/programActions';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ProgramAdminClient({ initialData, searchWrd }: { initialData: ProgramResponse; searchWrd: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Program>({
    progrmFileNm: '',
    progrmStrePath: '',
    progrmNm: '',
    url: '',
    progrmDc: ''
  });

  const programs = initialData.content || [];
  const total = initialData.totalElements || 0;

  const handleOpenCreate = () => {
    setMode('create');
    setFormData({ progrmFileNm: '', progrmStrePath: '', progrmNm: '', url: '', progrmDc: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (program: Program) => {
    setMode('edit');
    setFormData(program);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveProgramAction(null, { mode, data: formData });
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const handleDelete = async (name: string) => {
    const isConfirmed = await confirm({
      title: '프로그램 삭제',
      message: `[${name}] 프로그램을 삭제하시겠습니까? 관련 메뉴 연동이 해제될 수 있습니다.`,
      variant: 'destructive'
    });
    if (isConfirmed) {
      const res = await deleteProgramAction(null, name);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const columns: ColumnDef<Program>[] = [
    {
      id: 'progrmFileNm',
      header: 'Artifact Name',
      pinned: 'left',
      width: 280,
      accessor: (item: Program) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-[1rem] flex items-center justify-center shadow-lg group-hover:rotate-3 transition-transform">
            <FileCode size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-black tracking-tighter italic uppercase text-slate-900">{item.progrmFileNm}</span>
            <span className="text-[10px] text-primary font-bold opacity-60 flex items-center gap-1">
              <Terminal size={12} strokeWidth={3} /> COMPILED SOURCE
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'progrmNm',
      header: 'Technical Name',
      accessor: (item: Program) => (
        <span className="font-black text-slate-700 tracking-tight italic uppercase">{item.progrmNm}</span>
      )
    },
    {
      id: 'url',
      header: 'Endpoint Mapping',
      width: 300,
      accessor: (item: Program) => (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-slate-500 font-mono text-xs font-bold shadow-inner w-full">
            <LinkIcon size={14} className="opacity-30" />
            <span className="truncate">{item.url}</span>
          </div>
        </div>
      )
    },
    {
      id: 'progrmStrePath',
      header: 'Physical Path',
      accessor: (item: Program) => (
        <span className="text-[10px] font-black text-slate-400 font-mono tracking-tighter">{item.progrmStrePath}</span>
      )
    },
    {
      id: 'actions',
      header: 'SYSTEM CONTROL',
      className: 'text-right',
      accessor: (item: Program) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenEdit(item)}
            className="h-11 w-11 hover:bg-slate-900 hover:text-white rounded-[1rem] border-2 border-transparent hover:border-slate-900 transition-all active:scale-90"
          >
            <Settings size={18} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(item.progrmFileNm)}
            className="h-11 w-11 hover:bg-rose-50 hover:text-rose-600 rounded-[1rem] border-2 border-transparent hover:border-rose-100 transition-all active:scale-90"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="시스템 프로그램 미들웨어"
        breadcrumbs={[{ label: '시스템관리' }, { label: '프로그램관리' }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="h-14 px-10 rounded-2xl font-black shadow-2xl shadow-primary/20 gap-3 hover:-translate-y-1 transition-all active:scale-95 italic uppercase tracking-widest text-xs"
          >
            <Plus size={20} /> Deploy New Logic
          </Button>
        }
      />

      {/* Modern Dashboard Stats Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-slate-300 transition-all overflow-hidden relative">
          <div className="w-16 h-16 rounded-[1.25rem] bg-slate-900 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
            <Cpu size={28} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">REGISTERED LOGIC</p>
            <h4 className="text-3xl font-black italic tracking-tighter tabular-nums">{total} Units</h4>
          </div>
          <Cpu size={100} className="absolute right-[-20px] bottom-[-20px] opacity-[0.02] -rotate-12" />
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-primary/20 transition-all overflow-hidden relative">
          <div className="w-16 h-16 rounded-[1.25rem] bg-primary text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
            <Globe size={28} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ENDPOINT ACCESSIBLE</p>
            <h4 className="text-3xl font-black italic tracking-tighter tabular-nums text-primary">{programs.filter(p => p.url).length} Nodes</h4>
          </div>
          <Globe size={100} className="absolute right-[-20px] bottom-[-20px] opacity-[0.02] -rotate-12" />
        </div>
        <div className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 group hover:border-emerald-200 transition-all overflow-hidden relative">
          <div className="w-16 h-16 rounded-[1.25rem] bg-emerald-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform relative z-10">
            <ShieldCheck size={28} />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">SYSTEM INTEGRITY</p>
            <h4 className="text-3xl font-black italic tracking-tighter tabular-nums text-emerald-600">VERIFIED</h4>
          </div>
          <ShieldCheck size={100} className="absolute right-[-20px] bottom-[-20px] opacity-[0.02] -rotate-12" />
        </div>
      </div>

      <div className="p-8 rounded-[3rem] bg-slate-50 border border-slate-100 shadow-inner relative overflow-hidden group">
        <SmartSearchPanel
          fields={[
            { name: 'searchWrd', label: 'Logic Name / Identifier', type: 'text', placeholder: 'Enter code or technical term...' }
          ]}
          onSearch={(v: any) => {
            const val = v.searchWrd || '';
            router.push(`/admin/system/programs?searchWrd=${val}`);
          }}
          onReset={() => router.push('/admin/system/programs')}
        />
        <Search size={150} className="absolute right-[-20px] bottom-[-20px] opacity-[0.02] -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
      </div>

      <div className="bg-white rounded-[4rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative">
        <UltimateDataGrid
          title="PROGRAM MIDDLEWARE INVENTORY"
          columns={columns}
          data={programs}
          keyField="progrmFileNm"
          className="bg-slate-50/50 p-6 rounded-[3rem] border border-dashed border-slate-200"
        />
      </div>

      <div className="flex justify-center items-center gap-4 text-[10px] font-black italic text-slate-400 tracking-[0.3em] uppercase opacity-40">
        <Activity size={14} className="animate-pulse" />
        Middleware System Status: Normalized & Synchronized
      </div>

      {/* Registration/Edit Modal */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? 'Deploy System Entity' : 'Alter Logic Blueprint'}
        maxWidth="2xl"
      >
        <StandardForm onSubmit={handleSave} className="bg-transparent border-0 shadow-none">
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Artifact ID (Unique)</label>
                  <span className="text-[8px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded font-black italic">REQUIRED</span>
                </div>
                <Input
                  value={formData.progrmFileNm}
                  onChange={(e) => setFormData({ ...formData, progrmFileNm: e.target.value })}
                  disabled={mode === 'edit'}
                  placeholder="E.g. SYSTEM_LOG_V1"
                  className="h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all bg-slate-50 dark:bg-slate-800 disabled:opacity-50"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logic Nomenclature</label>
                  <span className="text-[8px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded font-black italic">REQUIRED</span>
                </div>
                <Input
                  value={formData.progrmNm}
                  onChange={(e) => setFormData({ ...formData, progrmNm: e.target.value })}
                  placeholder="E.g. AUDIT TRAIL ENGINE"
                  className="h-16 rounded-2xl border-2 text-lg font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Endpoint URI Mapping</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                  <LinkIcon size={20} />
                </div>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="E.g. /sys/audit/logs"
                  className="h-16 rounded-2xl border-2 text-lg font-black pl-16 pr-8 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Root Storage Directory</label>
              <Input
                value={formData.progrmStrePath}
                onChange={(e) => setFormData({ ...formData, progrmStrePath: e.target.value })}
                placeholder="E.g. /opt/middleware/v1/"
                className="h-16 rounded-2xl border-2 text-lg font-black px-8 focus:ring-4 focus:ring-primary/10 transition-all italic text-slate-400 font-mono bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Middleware Contextual Description</label>
              <textarea
                value={formData.progrmDc}
                onChange={(e) => setFormData({ ...formData, progrmDc: e.target.value })}
                className="w-full min-h-[140px] p-8 rounded-[2.5rem] border-2 bg-slate-50 dark:bg-slate-800 text-lg font-bold outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-4 focus:ring-primary/10 transition-all resize-none shadow-inner"
                placeholder="Describe the architectural impact of this module..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 transition-all">Abort Deployment</Button>
              <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black shadow-2xl shadow-primary/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all">
                <Terminal size={18} /> Persist Logic Framework
              </Button>
            </div>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}
