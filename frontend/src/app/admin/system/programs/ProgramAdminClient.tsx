
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
      const res = await programAdminService.getProgramList({ page踰덊샇: page, size: 10, searchWrd: wrd });

      const list = res.list || res.content || res.resultList || [];
      const totalCount = (res.total 님 res.totalElements 님 res.totalRecordCount 님 0) as number;

      setData(list);
      setTotal(totalCount);
    } catch (error: unknown) {
      toast('?곗씠?곕? 遺덈윭ㅻ뒗 以님ㅻ쪟媛 諛쒖깮있습니다.', 'error');
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
      title: '프로그램 삭제',
      message: `[${name}] ?꾨줈洹몃옩님삭제섏떆寃좎뒿?덇퉴? ?대떦 ?꾨줈洹몃옩怨님곌껐님紐⑤뱺 硫붾돱 ?곕룞님?댁젣님님있습니다.`,
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
      header: '파일명',
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
      header: '?앸퀎 ?뚯씪紐,
      accessor: (item: Program) => (
        <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit">
          <span className="text-[10px] font-black text-primary tracking-tight font-mono">{item.progrmFileNm}</span>
        </div>
      ),
      className: 'w-48'
    },
    {
      header: '?붾뱶ъ씤님(API/URL)',
      accessor: (item: Program) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/70 tracking-tighter italic">
          <LinkIcon size={12} className="text-primary opacity-40" />
          {item.url}
        </div>
      ),
      className: 'w-64'
    },
    {
      header: '관리,
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
        title="시스템 프로그램 미들웨어"
        breadcrumbs={[{ label: '시스템관리'?꾨줈洹몃옩 관리 }]}
      />

      <HubHeader
        title="?꾨줈洹몃옩"
        highlight="?먯궛 관리
        subtitle="?쒖뒪?쒖쓣 援ъ꽦?섎뒗 紐⑤뱺 ?쇰━님?꾨줈洹몃옩 紐⑤뱢 및 API ?붾뱶ъ씤?몄쓽 ?앸챸二쇨린 관리
        icon={Box}
        actions={
          <Button
            onClick={handleOpenCreate}
            size="lg"
            className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
          >
            <Plus size={20} /> 신규 등록
          </Button>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="활성_?꾨줈洹몃옩_님 value={total} icon={Layers} color="primary" />
        <HubMetricCard title="시스템무결성 value="?뺤긽" icon={ShieldCheck} color="emerald" status="확인님 />
        <HubMetricCard title="?쒕퉬님媛숈떆媛 value="99.9%" icon={Zap} color="amber" />
        <HubMetricCard title="?덉님ㅽ듃由님숆린님 value="실시간 icon={RefreshCcw} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard title="?뚰봽?몄썾님?덊룷吏좊━" description="현재 ?쒖뒪?쒖뿉 등록?섏뼱 ?숈옉 以묒씤 紐⑤뱺 ?뚰봽?몄썾님?먯궛님紐낆꽭 諛님명꽣?섏씠님?뺣낫?낅땲님" icon={SearchCode}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex-1 max-w-2xl">
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
              <Input
                placeholder="?꾨줈洹몃옩紐님먮뒗 ?뚯씪紐낆쓣 ?낅젰?섏뿬 寃님.."
                value={currentSearchWrd}
                onChange={(e) => setCurrentSearchWrd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="h-16 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-[1.25rem] text-xs font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
          <Button onClick={() => loadData()} size="lg" className="h-16 px-10 rounded-[1.25rem] bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2">
            <Search size={18} /> 寃님          </Button>
        </div>

        <div className="overflow-hidden">
          <StandardDataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="?쒖뒪?쒖뿉 등록님?꾨줈洹몃옩 ?먯궛님議댁옱?섏? ?딆뒿?덈떎."
            className="border-none bg-transparent"
          />
        </div>
      </HubSectionCard>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '신규 프로그램 등록' : '프로그램 정보 수정'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">취소</Button>
            <Button onClick={handleSave} className="flex-[2] h-14 rounded-2xl font-black text-[10px] tracking-widest shadow-xl">
              {mode === 'create' ? '신규 등록' : '님}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="시스템?앸퀎 ?뚯씪紐 required description="님 EgovMain (怨좎쑀 ㅺ컪)">
              <Input
                value={formData.progrmFileNm || ''}
                onChange={(e) => setFormData({ ...formData, progrmFileNm: e.target.value })}
                readOnly={mode === 'edit'}
                className={cn("h-14 rounded-2xl text-xs font-mono font-black tracking-widest uppercase shadow-inner", mode === 'edit' && "bg-muted/50 border-none")}
                placeholder="怨좎쑀 ?먯궛 ID"
              />
            </FormField>
            <FormField label="?꾨줈洹몃옩 ?쒓? 紐낆묶" required>
              <Input
                value={formData.progrmKoreanNm || ''}
                onChange={(e) => setFormData({ ...formData, progrmKoreanNm: e.target.value })}
                className="h-14 rounded-2xl text-sm font-black tracking-tight"
                placeholder="?쒓뎅님?먯궛 紐낆묶 ?낅젰"
              />
            </FormField>
          </div>

          <FormField label="?명꽣?섏씠님?붾뱶ъ씤님(URL)" required description="ㅼ젣 ?쒕퉬ㅺ ?쒓났?섎뒗 님주소 또는 API 경로">
            <Input
              value={formData.url || ''}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="h-14 rounded-2xl text-xs font-mono font-black"
              placeholder="/api/v1/..."
            />
          </FormField>

          <FormField label="臾쇰━님경로" description="?쒕쾭 님?뚯씪 μ냼 ?쇰━ 경로 (Optional)">
            <Input
              value={formData.progrmStrePath || ''}
              onChange={(e) => setFormData({ ...formData, progrmStrePath: e.target.value })}
              className="h-14 rounded-2xl text-xs font-medium bg-slate-50 border-none shadow-inner"
              placeholder="이 모듈의 아키텍처적 영향을 설명하세요..."
            />
          </FormField>

          <FormField label="상세 湲곕뒫 紐낆꽭">
            <textarea
              value={formData.progrmDc || ''}
              onChange={(e) => setFormData({ ...formData, progrmDc: e.target.value })}
              className="w-full min-h-[140px] p-6 rounded-2xl border-2 border-border bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner"
              placeholder="?꾨줈洹몃옩님님븷 및 愿님紐⑤뱢 설명"
            />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}

