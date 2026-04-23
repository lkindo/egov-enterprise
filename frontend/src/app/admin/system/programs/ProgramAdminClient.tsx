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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';

const programSchema = z.object({
  progrmFileNm: z.string()
    .min(1, '?뚯씪紐낆? ?꾩닔?낅땲??')
    .max(60, '?뚯씪紐낆? 60???대궡?ъ빞 ?⑸땲??'),
  progrmStrePath: z.string()
    .max(100, '寃쎈줈媛 ?덈Т 源곷땲?? (理쒕? 100??')
    .optional()
    .or(z.literal('')),
  progrmKoreanNm: z.string()
    .min(1, '?꾨줈洹몃옩 紐낆묶? ?꾩닔?낅땲??')
    .max(60, '紐낆묶? 60???대궡?ъ빞 ?⑸땲??'),
  url: z.string()
    .min(1, '?붾뱶?ъ씤??URL? ?꾩닔?낅땲??')
    .startsWith('/', 'URL? /濡??쒖옉?댁빞 ?⑸땲??')
    .max(100, 'URL? 100???대궡?ъ빞 ?⑸땲??'),
  progrmDc: z.string()
    .max(200, '?ㅻ챸???덈Т 源곷땲?? (理쒕? 200??')
    .optional()
    .or(z.literal('')),
});

type ProgramFormValues = z.infer<typeof programSchema>;

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function ProgramAdminClient({ initialData, searchWrd }: { initialData: PageResponse<Program>; searchWrd: string }) {
  const { toast } = useToast();
  const confirm = useConfirm();

  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  
  const form = useAppForm(programSchema, {
    defaultValues: {
      progrmFileNm: '',
      progrmStrePath: '',
      progrmKoreanNm: '',
      url: '',
      progrmDc: ''
    }
  });

  const [data, setData] = useState<Program[]>(() => {
    return (initialData?.list || []) as Program[];
  });
  const [total, setTotal] = useState<number>(() => {
    return initialData?.total || 0;
  });
  const [loading, setLoading] = useState(false);
  const [currentSearchWrd, setCurrentSearchWrd] = useState(searchWrd);

  const loadData = async (wrd: string = currentSearchWrd, page: number = 1) => {
    try {
      setLoading(true);
      const res = await programAdminService.getProgramList({ page: page - 1, size: 10, searchWrd: wrd });

      const list = (res.list || []) as Program[];
      const totalCount = res.total || 0;

      setData(list);
      setTotal(totalCount);
    } catch (error: unknown) {
      toast('?곗씠?곕? 遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setMode('create');
    form.reset({ progrmFileNm: '', progrmStrePath: '', progrmKoreanNm: '', url: '', progrmDc: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (program: Program) => {
    setMode('edit');
    form.reset(program);
    setIsOpen(true);
  };

  const onSave = async (values: ProgramFormValues) => {
    const res = await saveProgramAction(null, { mode, data: values as Program });
    if (res.success) {
      toast(res.message, 'success');
      loadData();
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const handleSave = form.handleSubmit(onSave);

  const handleDelete = async (name: string) => {
    const isConfirmed = await confirm({
      title: '?꾨줈洹몃옩 ??젣',
      message: `[${name}] ?꾨줈洹몃옩????젣?섏떆寃좎뒿?덇퉴? ?대떦 ?꾨줈洹몃옩怨??곌껐??紐⑤뱺 硫붾돱 ?곕룞???댁젣?????덉뒿?덈떎.`,
      variant: 'destructive',
      confirmText: '??젣 ?ㅽ뻾'
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
      header: '?뚯씪紐?,
      accessor: (item: Program) => (
        <div className="flex items-center gap-4 py-3">
          <div className="w-12 h-12 rounded-[0.1rem] bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
            <Cpu size={20} />
          </div>
          <div className="text-left">
            <span className="font-black tracking-tighter text-foreground block text-md uppercase leading-none">{item.progrmKoreanNm}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40 text-left">SYSTEM_MODULE</span>
          </div>
        </div>
      )
    },
    {
      header: '?앸퀎 ?뚯씪紐?,
      accessor: (item: Program) => (
        <div className="flex justify-start">
          <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
            <span className="text-[10px] font-black text-primary tracking-tight font-mono">{item.progrmFileNm}</span>
          </div>
        </div>
      ),
      className: 'w-48'
    },
    {
      header: '?붾뱶?ъ씤??API/URL)',
      accessor: (item: Program) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/70 tracking-tighter italic text-left">
          <LinkIcon size={12} className="text-primary opacity-40 shrink-0" />
          <span className="truncate">{item.url}</span>
        </div>
      ),
      className: 'w-64'
    },
    {
      header: '愿由?,
      className: 'text-right w-32',
      accessor: (item: Program) => (
        <div className="flex justify-end gap-2 pr-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-[0.1rem] bg-slate-50 border border-slate-100 hover:bg-primary hover:border-primary hover:text-white transition" onClick={() => handleOpenEdit(item)}>
                <Settings size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
              ?꾨줈洹몃옩 ?띿꽦 諛??붾뱶?ъ씤???섏젙
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition rounded-[0.1rem]" onClick={() => handleDelete(item.progrmFileNm)}>
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-rose-300">
              ?쒖뒪???먯궛 ?곴뎄 ??젣
            </TooltipContent>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="?쒖뒪???꾨줈洹몃옩 誘몃뱾?⑥뼱"
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '?꾨줈洹몃옩 愿由? }]}
      />

      <HubHeader
        title="?꾨줈洹몃옩"
        highlight="?먯궛 愿由?
        subtitle="?쒖뒪?쒖쓣 援ъ꽦?섎뒗 紐⑤뱺 臾쇰━ ?꾨줈洹몃옩 紐⑤뱢 諛?API ?붾뱶?ъ씤?몄쓽 ?앸챸二쇨린瑜?愿由ы빀?덈떎."
        icon={Box}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleOpenCreate}
                size="lg"
                className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1 gap-3"
              >
                <Plus size={20} /> ?좉퇋 ?깅줉
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
              ?덈줈??臾쇰━ ?꾨줈洹몃옩 ?먯궛 ?뺤쓽
            </TooltipContent>
          </Tooltip>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?쒖꽦_?꾨줈洹몃옩_?? value={total} icon={Layers} color="primary" />
        <HubMetricCard title="?쒖뒪??臾닿껐?? value="?뺤긽" icon={ShieldCheck} color="emerald" status="?뺤씤?? />
        <HubMetricCard title="?쒕퉬??媛?숈떆媛? value="99.9%" icon={Zap} color="amber" />
        <HubMetricCard title="?몃깽?좊━ ?숆린?? value="?ㅼ떆媛? icon={RefreshCcw} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard 
        title="?뚰봽?몄썾???덊룷吏?좊━" 
        description="?꾩옱 ?쒖뒪?쒖뿉 ?깅줉?섏뼱 ?숈옉 以묒씤 紐⑤뱺 ?뚰봽?몄썾???먯궛??紐낆꽭 諛?硫뷀??곗씠???뺣낫?낅땲??" 
        icon={SearchCode}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex-1 max-w-2xl text-left">
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
              <Input
                placeholder="?꾨줈洹몃옩紐??먮뒗 ?뚯씪紐낆쓣 ?낅젰?섏뿬 寃??."
                value={currentSearchWrd}
                onChange={(e) => setCurrentSearchWrd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="h-16 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-[0.1rem] text-xs font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition"
              />
            </div>
          </div>
          <Button onClick={() => loadData()} size="lg" className="h-16 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition gap-2">
            <Search size={18} /> 寃??          </Button>
        </div>

        <div className="overflow-hidden">
          <StandardDataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="?쒖뒪?쒖뿉 ?깅줉???꾨줈洹몃옩 ?먯궛??議댁옱?섏? ?딆뒿?덈떎."
            className="border-none bg-transparent"
          />
        </div>
      </HubSectionCard>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '?좉퇋 ?꾨줈洹몃옩 ?깅줉' : '?꾨줈洹몃옩 ?뺣낫 ?섏젙'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase border-2">痍⑥냼</Button>
            <Button 
                onClick={handleSave} 
                className="flex-[2] h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition"
            >
              {mode === 'create' ? '?좉퇋 ?깅줉' : '?뺣낫 ?섏젙'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-8 pt-4 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="?쒖뒪???앸퀎 ?뚯씪紐? required description="?? EgovMain (怨좎쑀 ?앸퀎媛?">
              <Input
                {...form.register('progrmFileNm')}
                readOnly={mode === 'edit'}
                maxLength={60}
                className={cn(
                    "h-14 rounded-[0.1rem] text-xs font-mono font-black tracking-widest uppercase shadow-inner", 
                    mode === 'edit' && "bg-muted/50 border-none",
                    form.formState.errors.progrmFileNm ? "border-rose-500 bg-rose-50" : "border-slate-100"
                )}
                placeholder="怨좎쑀 ?먯궛 ID (MAX_60)"
              />
              {form.formState.errors.progrmFileNm && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmFileNm.message}</p>}
            </FormField>
            <FormField label="?꾨줈洹몃옩 ?쒓? 紐낆묶" required>
              <Input
                {...form.register('progrmKoreanNm')}
                maxLength={60}
                className={cn(
                    "h-14 rounded-[0.1rem] text-sm font-black tracking-tight",
                    form.formState.errors.progrmKoreanNm ? "border-rose-500 bg-rose-50" : "border-slate-100"
                )}
                placeholder="?쒓? ?먯궛 紐낆묶 ?낅젰 (MAX_60)"
              />
              {form.formState.errors.progrmKoreanNm && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmKoreanNm.message}</p>}
            </FormField>
          </div>

          <FormField label="?명꽣?섏씠???붾뱶?ъ씤??URL)" required description="?ㅼ젣 ?쒕퉬?ㅺ? ?쒓났?섎뒗 ?묒냽 二쇱냼 ?먮뒗 API 寃쎈줈">
            <Input
              {...form.register('url')}
              maxLength={100}
              className={cn(
                  "h-14 rounded-[0.1rem] text-xs font-mono font-black",
                  form.formState.errors.url ? "border-rose-500 bg-rose-50" : "border-slate-100"
              )}
              placeholder="/api/v1/... (MAX_100)"
            />
            {form.formState.errors.url && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.url.message}</p>}
          </FormField>

          <FormField label="臾쇰━?????寃쎈줈" description="?쒕쾭 ???뚯씪 ??μ냼 臾쇰━ 寃쎈줈 (Optional)">
            <Input
              {...form.register('progrmStrePath')}
              maxLength={100}
              className={cn(
                  "h-14 rounded-[0.1rem] text-xs font-medium bg-slate-50 border-none shadow-inner",
                  form.formState.errors.progrmStrePath ? "border-rose-500 bg-rose-50" : ""
              )}
              placeholder="?뚯씪 ???臾쇰━ 寃쎈줈... (理쒕? 100??"
            />
            {form.formState.errors.progrmStrePath && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmStrePath.message}</p>}
          </FormField>

          <FormField label="?곸꽭 湲곕뒫 紐낆꽭">
            <textarea
              {...form.register('progrmDc')}
              maxLength={200}
              className={cn(
                  "w-full min-h-[140px] p-6 rounded-[0.1rem] border-2 border-border bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none shadow-inner",
                  form.formState.errors.progrmDc ? "border-rose-500 bg-rose-50" : ""
              )}
              placeholder="?꾨줈洹몃옩????븷 諛?愿??紐⑤뱢 ?ㅻ챸 (理쒕? 200??"
            />
            {form.formState.errors.progrmDc && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmDc.message}</p>}
          </FormField>
        </form>
      </StandardModal>
    </div>
  );
}
