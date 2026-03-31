'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { Program } from '@/types/foundation/program';
import { PageResponse } from '@/types/foundation/system';
import { programAdminService } from '@/services/foundation/system/ProgramAdminService';
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
  RefreshCcw,
  Activity,
  Box,
  Layers,
  Zap,
  CheckCircle2,
  ShieldAlert,
  SearchCode,
  Database
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
    progrmKoreanNm: '',
    url: '',
    progrmDc: ''
  });

  const [data, setData] = useState<Program[]>(() => {
    return initialData?.list || initialData?.content || initialData?.resultList || [];
  });
  const [total, setTotal] = useState<number>(() => {
    const t = initialData?.total || initialData?.totalElements || initialData?.totalRecordCount || 0;
    return typeof t === 'number' ? t : Number(t) || 0;
  });
  const [loading, setLoading] = useState(false);
  const [currentSearchWrd, setCurrentSearchWrd] = useState(searchWrd);

  const loadData = async (wrd: string = currentSearchWrd, page: number = 1) => {
    try {
      setLoading(true);
      const res = await programAdminService.getProgramList({ pageÎ≤àÌò∏: page, size: 10, searchWrd: wrd });

      const list = res.list || res.content || res.resultList || [];
      const totalCount = (res.total ?? res.totalElements ?? res.totalRecordCount ?? 0) as number;

      setData(list);
      setTotal(totalCount);
    } catch (error: unknown) {
      toast('?∞Ïù¥?∞Î? Î∂àÎü¨?§Îäî Ï§??§Î•òÍ∞Ä Î∞úÏÉù?àÏäµ?àÎã§.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setMode('create');
    setFormData({ progrmFileNm: '', progrmStrePath: '', progrmKoreanNm: '', url: '', progrmDc: '' });
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
      title: '?ÑÎ°úÍ∑∏Îû® ??†ú ?ïÏù∏',
      message: `[${name}] ?ÑÎ°úÍ∑∏Îû®????†ú?òÏãúÍ≤†Ïäµ?àÍπå? ?¥Îãπ ?ÑÎ°úÍ∑∏Îû®Í≥??∞Í≤∞??Î™®Îì† Î©îÎâ¥ ?∞Îèô???¥Ï†ú?????àÏäµ?àÎã§.`,
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
      header: '?ÑÎ°úÍ∑∏Îû® ?êÏÇ∞ Î™ÖÏπ≠',
      accessor: (item: Program) => (
        <div className="flex items-center gap-4 py-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <Cpu size={20} />
          </div>
          <div>
            <span className="font-black tracking-tighter text-foreground block text-md uppercase leading-none">{item.progrmKoreanNm}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">SYSTEM_MODULE</span>
          </div>
        </div>
      )
    },
    {
      header: '?ùÎ≥Ñ ?åÏùºÎ™?,
      accessor: (item: Program) => (
        <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
          <span className="text-[10px] font-black text-primary tracking-tight font-mono">{item.progrmFileNm}</span>
        </div>
      ),
      className: 'w-48'
    },
    {
      header: '?îÎìú?¨Ïù∏??(API/URL)',
      accessor: (item: Program) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/70 tracking-tighter italic">
          <LinkIcon size={12} className="text-primary opacity-40" />
          {item.url}
        </div>
      ),
      className: 'w-64'
    },
    {
      header: 'Í¥ÄÎ¶?,
      className: 'text-right w-32',
      accessor: (item: Program) => (
        <div className="flex justify-end gap-2 pr-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 hover:bg-primary hover:border-primary hover:text-white transition-all" onClick={() => handleOpenEdit(item)}>
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all rounded-xl" onClick={() => handleDelete(item.progrmFileNm)}>
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="?úÏä§???êÏÇ∞ Í±∞Î≤Ñ?åÏä§"
        breadcrumbs={[{ label: '?úÏä§?úÍ?Î¶? }, { label: '?ÑÎ°úÍ∑∏Îû® Í¥ÄÎ¶? }]}
      />

      <HubHeader
        title="?ÑÎ°úÍ∑∏Îû®"
        highlight="?êÏÇ∞ Í¥ÄÎ¶?
        subtitle="?úÏä§?úÏùÑ Íµ¨ÏÑ±?òÎäî Î™®Îì† ?ºÎ¶¨???ÑÎ°úÍ∑∏Îû® Î™®Îìà Î∞?API ?îÎìú?¨Ïù∏?∏Ïùò ?ùÎ™ÖÏ£ºÍ∏∞ Í¥ÄÎ¶?
        icon={Box}
        actions={
          <Button
            onClick={handleOpenCreate}
            size="lg"
            className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
          >
            <Plus size={20} /> ?†Í∑ú ?±Î°ù
          </Button>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?úÏÑ±_?ÑÎ°úÍ∑∏Îû®_?? value={total} icon={Layers} color="primary" />
        <HubMetricCard title="?úÏä§??Î¨¥Í≤∞?? value="?ïÏÉÅ" icon={ShieldCheck} color="emerald" status="?ïÏù∏?? />
        <HubMetricCard title="?úÎπÑ??Í∞Ä?ôÏãúÍ∞? value="99.9%" icon={Zap} color="amber" />
        <HubMetricCard title="?àÏ??§Ìä∏Î¶??ôÍ∏∞?? value="?§ÏãúÍ∞? icon={RefreshCcw} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard title="?åÌîÑ?∏Ïõ®???àÌè¨ÏßÄ?†Î¶¨" description="?ÑÏû¨ ?úÏä§?úÏóê ?±Î°ù?òÏñ¥ ?ôÏûë Ï§ëÏù∏ Î™®Îì† ?åÌîÑ?∏Ïõ®???êÏÇ∞??Î™ÖÏÑ∏ Î∞??∏ÌÑ∞?òÏù¥???ïÎ≥¥?ÖÎãà??" icon={SearchCode}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex-1 max-w-2xl">
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
              <Input
                placeholder="?ÑÎ°úÍ∑∏Îû®Î™??êÎäî ?åÏùºÎ™ÖÏùÑ ?ÖÎ†•?òÏó¨ Í≤Ä??.."
                value={currentSearchWrd}
                onChange={(e) => setCurrentSearchWrd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="h-16 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-[1.25rem] text-xs font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
          <Button onClick={() => loadData()} size="lg" className="h-16 px-10 rounded-[1.25rem] bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2">
            <Search size={18} /> Í≤Ä??          </Button>
        </div>

        <div className="overflow-hidden">
          <StandardDataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="?úÏä§?úÏóê ?±Î°ù???ÑÎ°úÍ∑∏Îû® ?êÏÇ∞??Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§."
            className="border-none bg-transparent"
          />
        </div>
      </HubSectionCard>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '?†Í∑ú ?ÑÎ°úÍ∑∏Îû® ?±Î°ù' : '?ÑÎ°úÍ∑∏Îû® ?ïÎ≥¥ ?òÏ†ï'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">Ï∑®ÏÜå</Button>
            <Button onClick={handleSave} className="flex-[2] h-14 rounded-2xl font-black text-[10px] tracking-widest shadow-xl">
              {mode === 'create' ? '?†Í∑ú ?±Î°ù' : '?Ä??}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="?úÏä§???ùÎ≥Ñ ?åÏùºÎ™? required description="?? EgovMain (Í≥†Ïú† ?§Í∞í)">
              <Input
                value={formData.progrmFileNm || ''}
                onChange={(e) => setFormData({ ...formData, progrmFileNm: e.target.value })}
                readOnly={mode === 'edit'}
                className={cn("h-14 rounded-2xl text-xs font-mono font-black tracking-widest uppercase shadow-inner", mode === 'edit' && "bg-muted/50 border-none")}
                placeholder="Í≥†Ïú† ?êÏÇ∞ ID"
              />
            </FormField>
            <FormField label="?ÑÎ°úÍ∑∏Îû® ?úÍ? Î™ÖÏπ≠" required>
              <Input
                value={formData.progrmKoreanNm || ''}
                onChange={(e) => setFormData({ ...formData, progrmKoreanNm: e.target.value })}
                className="h-14 rounded-2xl text-sm font-black tracking-tight"
                placeholder="?úÍµ≠???êÏÇ∞ Î™ÖÏπ≠ ?ÖÎ†•"
              />
            </FormField>
          </div>

          <FormField label="?∏ÌÑ∞?òÏù¥???îÎìú?¨Ïù∏??(URL)" required description="?§Ï†ú ?úÎπÑ?§Í? ?úÍ≥µ?òÎäî ??Ï£ºÏÜå ?êÎäî API Í≤ΩÎ°ú">
            <Input
              value={formData.url || ''}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="h-14 rounded-2xl text-xs font-mono font-black"
              placeholder="/api/v1/..."
            />
          </FormField>

          <FormField label="Î¨ºÎ¶¨???Ä??Í≤ΩÎ°ú" description="?úÎ≤Ñ ???åÏùº ?Ä?•ÏÜå ?ºÎ¶¨ Í≤ΩÎ°ú (Optional)">
            <Input
              value={formData.progrmStrePath || ''}
              onChange={(e) => setFormData({ ...formData, progrmStrePath: e.target.value })}
              className="h-14 rounded-2xl text-xs font-medium bg-slate-50 border-none shadow-inner"
              placeholder="/src/egov/main..."
            />
          </FormField>

          <FormField label="?ÅÏÑ∏ Í∏∞Îä• Î™ÖÏÑ∏">
            <textarea
              value={formData.progrmDc || ''}
              onChange={(e) => setFormData({ ...formData, progrmDc: e.target.value })}
              className="w-full min-h-[140px] p-6 rounded-2xl border-2 border-border bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner"
              placeholder="?ÑÎ°úÍ∑∏Îû®????ï† Î∞?Í¥Ä??Î™®Îìà ?§Î™Ö"
            />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}
