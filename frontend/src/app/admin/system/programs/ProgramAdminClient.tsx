'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Program } from '@/types/program';
import { PageResponse } from '@/types/system';
import { programAdminService } from '@/services/admin/system/ProgramAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  Plus,
  Trash2,
  Settings,
  Cpu,
  Globe,
  ShieldCheck,
  FileCode,
  Terminal,
  Link as LinkIcon,
  Search,
  Activity
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { FormField } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { saveProgramAction, deleteProgramAction } from '@/app/actions/programActions';
import { cn } from '@/lib/utils';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function ProgramAdminClient({ initialData, searchWrd }: { initialData: PageResponse<Program>; searchWrd: string }) {
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

  const [data, setData] = useState(initialData?.list || []);
  const [total, setTotal] = useState(initialData?.total || 0);
  const [loading, setLoading] = useState(false);
  const [currentSearchWrd, setCurrentSearchWrd] = useState(searchWrd);

  const loadData = async (wrd: string = currentSearchWrd, page: number = 1) => {
    try {
      setLoading(true);
      const res = await programAdminService.getProgramList({ page번호: page, size: 10, searchWrd: wrd });
      setData(res.list || []);
      setTotal(res.total || 0);
    } catch (error) {
      toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      loadData();
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
        loadData();
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const columns: Column<Program>[] = [
    {
      header: '프로그램 한글명',
      accessor: (item: Program) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center transition-transform group-hover:rotate-6 dark:bg-card">
            <Cpu size={18} />
          </div>
          <span className="font-bold text-foreground italic">{item.progrmNm}</span>
        </div>
      )
    },
    {
      header: '파일명',
      accessor: (item: Program) => (
        <span className="font-mono text-xs font-black text-muted-foreground/60 tracking-tight">
          {item.progrmFileNm}
        </span>
      )
    },
    {
      header: 'URL Endpoint',
      accessor: (item: Program) => (
        <div className="flex items-center gap-2 text-primary/70 font-bold text-xs italic">
           <LinkIcon size={12} /> {item.url}
        </div>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: Program) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleOpenEdit(item)}>
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:text-rose-600 rounded-lg" onClick={() => handleDelete(item.progrmFileNm)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="소프트웨어 자산 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '프로그램관리' }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="h-14 px-10 rounded-2xl font-bold italic shadow-lg gap-3 hover:-translate-y-1 transition-all"
          >
            <Plus size={20} /> Deploy New Program
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <SummaryCard title="Live Modules" value={total} icon={<Globe />} color="indigo" />
        <SummaryCard title="Integrity Check" value="Validated" icon={<ShieldCheck />} color="emerald" />
        <SummaryCard title="System Portals" value="Active" icon={<Terminal size={20} />} color="slate" />
        <SummaryCard title="Resource Load" value="Optimal" icon={<Activity />} color="primary" />
      </div>

      <div className="bg-card border-2 border-border p-12 rounded-[3.5rem] shadow-sm relative overflow-hidden group">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                <FileCode size={24} />
             </div>
             <div>
                <h3 className="text-2xl font-black text-foreground tracking-tighter italic">Software Repository</h3>
                <p className="text-[10px] font-black text-muted-foreground tracking-[0.2em]">Registered Program Assets</p>
             </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="PROCURING ASSETS..."
                defaultValue={searchWrd}
                onChange={(e) => setCurrentSearchWrd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="h-14 pl-12 pr-6 w-full md:w-[350px] rounded-2xl border-2 border-border font-black text-[10px] tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-background"
              />
            </div>
            <Button onClick={() => loadData()} className="h-14 px-8 rounded-2xl font-black text-[10px] tracking-tight shadow-xl italic">
              SEARCH
            </Button>
          </div>
        </div>

        <div className="px-2 overflow-x-auto relative z-10">
          <StandardDataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="등록된 프로그램 정보가 없습니다."
            className="border-none bg-muted/20 rounded-[3rem] p-8"
          />
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '새 프로그램 배포' : '프로그램 사양 수정'}
        maxWidth="2xl"
        footer={
           <div className="flex w-full gap-3">
             <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-xl font-bold">Cancel</Button>
             <Button onClick={handleSave} className="flex-[2] h-11 rounded-xl font-bold italic">
               {mode === 'create' ? 'DEPLOY ASSET' : 'UPDATE ASSET'}
             </Button>
           </div>
        }
      >
        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField label="시스템 프로그램 코드" required description="예: EgovMain">
              <Input
                value={formData.progrmFileNm}
                onChange={(e) => setFormData({ ...formData, progrmFileNm: e.target.value })}
                readOnly={mode === 'edit'}
                className={cn("h-10 text-sm font-mono italic", mode === 'edit' && "bg-muted/50")}
                placeholder="Unique ID"
              />
            </FormField>
            <FormField label="프로그램 한글 명칭" required>
              <Input
                value={formData.progrmNm}
                onChange={(e) => setFormData({ ...formData, progrmNm: e.target.value })}
                className="h-10 text-sm font-semibold"
                placeholder="Asset Name"
              />
            </FormField>
          </div>
          
          <FormField label="자산 URL (EndPoint)" required description="프론트엔드/백엔드 실제 접점">
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="h-10 text-sm font-mono italic"
              placeholder="/api/v1/resource"
            />
          </FormField>

          <FormField label="저장 경로" description="서버 내 물리적 경로 (Optional)">
            <Input
              value={formData.progrmStrePath}
              onChange={(e) => setFormData({ ...formData, progrmStrePath: e.target.value })}
              className="h-10 text-sm"
              placeholder="/src/egov/main"
            />
          </FormField>

          <FormField label="상세 사양 설명">
            <Input
              value={formData.progrmDc}
              onChange={(e) => setFormData({ ...formData, progrmDc: e.target.value })}
              className="h-10 text-sm font-medium"
              placeholder="Module Purpose"
            />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: any) {
  const colorMap: any = {
    slate: "bg-slate-900 text-white border-slate-800 shadow-slate-900/20 dark:bg-card dark:text-foreground dark:border-border",
    primary: "bg-white text-primary border-primary/20 shadow-primary/5 dark:bg-card dark:text-primary dark:border-border",
    emerald: "bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20",
    indigo: "bg-indigo-600 text-white border-indigo-700 shadow-indigo-600/20"
  };

  const iconBgMap: any = {
    slate: "bg-white/10 text-white",
    primary: "bg-primary/10 text-primary",
    emerald: "bg-white/10 text-white",
    indigo: "bg-white/10 text-white"
  };

  return (
    <div className={cn(
      "p-8 rounded-[2.5rem] border transition-all hover:scale-[1.05] group overflow-hidden relative",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-transform shadow-lg", iconBgMap[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 italic">
        <p className="text-[10px] font-black tracking-widest opacity-60 mb-2 uppercase">{title}</p>
        <h4 className="text-3xl font-black tracking-tighter tabular-nums">{value}</h4>
      </div>
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.05] group-hover:rotate-12 transition-all duration-700 text-foreground">
        {React.cloneElement(icon, { size: 100 })}
      </div>
    </div>
  );
}
