'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ismAdminService, InfrmlSanctn } from '@/services/foundation/system/IsmAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Activity,
  Sparkles,
  Info,
  ArrowRightCircle,
  ShieldAlert,
  Terminal,
  Cpu,
  Fingerprint,
  User,
  Zap,
  Layers,
  SearchCode,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const ismSchema = z.object({
  returnResn: z.string().min(1, '?섍껐 ?섍껄? ?꾩닔 ?낅젰 ?ы빆?낅땲??'),
});

type IsmFormValues = z.infer<typeof ismSchema>;

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

export default function IsmClient({ initialData }: { initialData: { list: InfrmlSanctn[] } }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [isModalOpen, setIsOpen] = useState(false);
  const [selectedSanctn, setSelectedSanctn] = useState<InfrmlSanctn | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useAppForm(ismSchema, {
    defaultValues: {
      returnResn: ''
    }
  });

  const ismList = initialData.list || [];

  const handleOpenConfirm = (sanctn: InfrmlSanctn) => {
    setSelectedSanctn(sanctn);
    form.reset({
      returnResn: ''
    });
    setIsOpen(true);
  };

  const onFormSubmit = async (values: IsmFormValues, status: 'C' | 'R') => {
    if (!selectedSanctn) return;
    try {
      setLoading(true);
      await ismAdminService.confirmInfrmlSanctn(selectedSanctn.infrmlSanctnId, status, values.returnResn);
      toast(`寃곗옱 ?쒗?ㅺ? ${status === 'C' ? '?깃났?곸쑝濡??뱀씤' : '諛섎젮'} 泥섎━?섏뿀?듬땲??`, 'success');
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast('?꾨줈?몄뒪 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<InfrmlSanctn>[] = [
    {
      header: '?꾨찓??諛??꾪궎?띿쿂',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex items-center gap-5 py-4">
            <div className="w-12 h-12 rounded-[0.1rem] bg-slate-900 flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
                <Layers size={18} />
            </div>
            <div className="flex flex-col gap-1 text-left">
                <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black tracking-tight border border-slate-200 w-fit">
                    {item.jobSe || item.jobSeCode || 'STATIC_NODE'}
                </span>
                <span className="font-black tracking-tighter text-foreground text-md uppercase leading-tight mt-1">{item.sancltNm}</span>
            </div>
        </div>
      )
    },
    {
      header: '寃곗옱 ?꾩씠?댄떚??,
      accessor: (item: InfrmlSanctn) => (
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-[0.1rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 shadow-inner group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                <Fingerprint size={16} />
            </div>
            <div className="flex flex-col text-left">
                <span className="text-sm font-black text-foreground tracking-tight">{item.applcntId}</span>
                <span className="text-[9px] font-black text-muted-foreground/40 tracking-[0.3em] font-mono italic">ID: {item.infrmlSanctnId.slice(0, 8)}</span>
            </div>
        </div>
      ),
      className: 'w-56'
    },
    {
      header: '寃곗옱 ?湲?(PENDING)',
      accessor: (item: InfrmlSanctn) => {
          let status: '?쒖꽦' | 'DISABLED' | 'INACTIVE' = 'INACTIVE';
          if (item.confmAt === 'Y') status = '?쒖꽦';
          if (item.confmAt === 'R') status = 'DISABLED';
          
          return (
            <HubStatusBadge 
              status={status} 
              labels={{ ?쒖꽦: '?뱀씤??(CONFIRMED)', DISABLED: '諛섎젮??(REJECTED)', INACTIVE: '寃곗옱 ?湲?(PENDING)' }} 
            />
          );
      },
      className: 'w-48'
    },
    {
      header: '愿由?議곗젙',
      className: 'text-right w-48',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex justify-end gap-3 pr-4">
          {(item.confmAt === 'N' || item.confmAt === 'A') && (
            <Button
              onClick={() => handleOpenConfirm(item)}
              className="h-10 px-6 bg-slate-900 text-white rounded-[0.1rem] text-[10px] font-black tracking-widest uppercase hover:bg-primary transition active:scale-95 shadow-xl shadow-slate-900/10 flex items-center gap-2 group"
            >
              <ShieldCheck size={16} className="group-hover:rotate-12 transition-transform" /> ?뱀씤 ?ㅽ뻾
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-[0.1rem] transition opacity-40 hover:opacity-100"
            onClick={() => toast('?꾩뭅?대툕 ?꾩슜 紐⑤뱶?낅땲??', 'info')}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="?명룷硫 ?앹뀡 ?꾪궎?띿쿂"
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '?쎌떇寃곗옱' }]}
      />

      <HubHeader 
        title="寃곗옱" 
        highlight="寃곗옱 ?쒗?? 
        subtitle="洹쒓꺽?붾릺吏 ?딆? 鍮꾩젙??寃곗옱 ?붿껌???좎뿰?섍쾶 寃利앺븯怨??꾩궗 ?섏궗寃곗젙 泥닿퀎瑜??듯빀 愿由ы빀?덈떎." 
        icon={ShieldCheck} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <div className="px-6 py-3 bg-emerald-50 border-2 border-emerald-100 rounded-[0.1rem] flex items-center gap-4 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-black text-emerald-700 tracking-widest uppercase">?섏궗寃곗젙_?덈툕: ?⑤씪??/span>
            </div>
            <Button
                variant="ghost"
                onClick={() => router.refresh()}
                className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition shadow-xl group active:scale-95 px-4"
            >
                <Activity size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="寃곗옱_?湲??쒗?? value={ismList.filter(i => i.confmAt === 'N' || i.confmAt === 'A').length} icon={Clock} color="amber" status="二쇱쓽" />
        <HubMetricCard title="?뱀씤_?먯궛_?? value={ismList.filter(i => i.confmAt === 'Y').length} icon={CheckCircle2} color="emerald" status="理쒖쟻" />
        <HubMetricCard title="諛섎젮_濡쒓렇_?? value={ismList.filter(i => i.confmAt === 'R').length} icon={XCircle} color="rose" />
        <HubMetricCard title="?꾩껜_?섏궗寃곗젙_?? value={ismList.length} icon={FileText} color="primary" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12 text-left">
        {/* Intelligence Shield Panel */}
        <div className="col-span-12 lg:col-span-4 h-full">
            <div className="rounded-[0.1rem] bg-slate-900 text-white p-12 shadow-2xl relative overflow-hidden group h-full border-none">
                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <Terminal size={240} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-12">
                    <div className="space-y-4">
                        <div className="w-20 h-20 rounded-[0.1rem] bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                            <Cpu size={36} className="text-primary" />
                        </div>
                        <h4 className="text-3xl font-black tracking-tighter leading-tight uppercase">遺덈?<br />?섍껐 ???/h4>
                    </div>
                    
                    <p className="text-sm text-slate-400 font-bold leading-relaxed italic border-l-4 border-primary pl-8">
                        紐⑤뱺 ?쎌떇 寃곗옱 ?꾪궎?띿쿂???곗씠??臾닿껐??寃利앹쓣 嫄곗튂硫?寃곗젙 洹쇨굅??遺꾩궛 ??λ릺???곴뎄?곸쑝濡?湲곕줉?섏뼱 媛먯궗媛 媛?ν빀?덈떎.
                    </p>

                    <div className="space-y-6 pt-12 border-t border-white/5">
                        <div className="flex items-center justify-between group/stat">
                            <span className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-primary transition-colors">濡쒖쭅_?덈툕_臾닿껐??/span>
                            <span className="text-lg font-black font-mono tracking-tighter text-emerald-500">?뺤긽</span>
                        </div>
                        <div className="flex items-center justify-between group/stat">
                            <span className="text-[10px] font-black text-white/40 tracking-[0.3em] uppercase group-hover/stat:text-amber-500 transition-colors">蹂댁븞_?꾨줈?좎퐳</span>
                            <span className="text-lg font-black font-mono tracking-tighter">ENF_2.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Approval Inventory */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
            <HubSectionCard title="?쎌떇 寃곗옱 ?쒗???곗씠??留ㅽ듃由?뒪" description="?쒖뒪?쒖쓽 ?좎뿰???섏궗寃곗젙???꾪빐 罹≪쿂??紐⑤뱺 鍮꾩젙??寃곗옱 ?붿껌 ?ㅼ떆媛?紐낆꽭?낅땲??" icon={SearchCode}>
                <div className="overflow-hidden min-h-[500px]">
                    <StandardDataTable
                        columns={columns}
                        data={ismList}
                        loading={loading}
                        emptyMessage="議고쉶???쎌떇 寃곗옱 ?꾨줈?좎퐳???꾩옱 ?대윭?ㅽ꽣??議댁옱?섏? ?딆뒿?덈떎."
                        className="border-none bg-transparent"
                    />
                </div>
            </HubSectionCard>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title="寃곗옱 ?쒗???ㅽ뻾"
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase border-2">議곗궗_痍⑥냼</Button>
            <Button 
                onClick={form.handleSubmit((v) => onFormSubmit(v, 'R'))}
                disabled={loading}
                className="flex-1 h-16 bg-rose-50 text-rose-500 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase hover:bg-rose-500 hover:text-white transition active:scale-95 border-2 border-rose-100 flex items-center justify-center gap-3"
            >
              <XCircle size={18} strokeWidth={3} /> ?쒗??諛섎젮
            </Button>
            <Button
                onClick={form.handleSubmit((v) => onFormSubmit(v, 'C'))}
                disabled={loading}
                className="flex-[2] h-16 bg-slate-900 border-none text-white rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:-translate-y-2 hover:bg-primary transition active:scale-95 group"
            >
              <CheckCircle2 size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> 理쒖쥌 ?뱀씤
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form className="space-y-12 pt-4 text-left">
            <div className="p-10 bg-slate-900 rounded-[0.1rem] shadow-2xl relative overflow-hidden group/modal-target">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                    <Activity size={16} className="text-primary animate-pulse" />
                  </div>
                  <span className="text-[10px] text-primary/60 font-black tracking-[0.4em] uppercase">Target_Sequence_Probe</span>
                </div>
                <h4 className="text-3xl font-black text-white tracking-tighter uppercase leading-tight">{selectedSanctn?.sancltNm}</h4>
                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-[0.1rem] border border-white/5">
                    <User size={14} className="text-slate-400" />
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{selectedSanctn?.applcntId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-white/20 tracking-[0.3em] font-mono uppercase italic">UUID: {selectedSanctn?.infrmlSanctnId}</span>
                  </div>
                </div>
              </div>
              <Zap size={240} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] -rotate-12 group-hover/modal-target:rotate-0 transition-transform duration-1000" />
            </div>

            <ShadcnFormField
              control={form.control}
              name="returnResn"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormLabel className="text-[11px] font-black tracking-[0.4em] text-slate-400 uppercase flex items-center gap-3">
                    <SearchCode size={14} className="text-primary" /> 寃곗옱/諛섎젮 ?섏궗寃곗젙 濡쒓렇 (Decision Opinion) <span className="text-rose-500 animate-pulse">*</span>
                  </FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      placeholder="寃곗옱 ?먮뒗 諛섎젮 ?ъ쑀瑜??낅젰?섏꽭??.."
                      className="w-full min-h-[200px] p-10 rounded-[0.1rem] border-2 bg-slate-50 font-bold text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus:bg-white focus:ring-[12px] focus:ring-primary/5 focus:border-primary/20 transition shadow-inner leading-relaxed resize-none placeholder:text-slate-300"
                    />
                  </FormControl>
                  <FormMessage className="text-[10px] font-bold text-rose-600 px-1 mt-1" />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 px-6 py-4 bg-amber-50 border border-amber-100 rounded-[0.1rem]">
              <AlertCircle size={16} className="text-amber-500" />
              <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase opacity-80">
                * ?묒꽦???섍껄? ?섏젙??遺덇??ν븯硫?紐⑤뱺 愿怨꾩옄?먭쾶 ?ㅼ떆媛꾩쑝濡?怨듭쑀?⑸땲??
              </p>
            </div>
          </form>
        </Form>
      </StandardModal>
    </div>
  );
}
