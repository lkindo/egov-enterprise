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
    .min(1, '파일명은 필수입니다.')
    .max(60, '파일명은 60자 이내여야 합니다.'),
  progrmStrePath: z.string()
    .max(100, '경로가 너무 깁니다. (최대 100자)')
    .optional()
    .or(z.literal('')),
  progrmKoreanNm: z.string()
    .min(1, '프로그램 명칭은 필수입니다.')
    .max(60, '명칭은 60자 이내여야 합니다.'),
  url: z.string()
    .min(1, '엔드포인트 URL은 필수입니다.')
    .startsWith('/', 'URL은 /로 시작해야 합니다.')
    .max(100, 'URL은 100자 이내여야 합니다.'),
  progrmDc: z.string()
    .max(200, '설명이 너무 깁니다. (최대 200자)')
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
    return (initialData?.list || initialData?.content || initialData?.resultList || []) as Program[];
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
      const res = await programAdminService.getProgramList({ page: page - 1, size: 10, searchWrd: wrd });

      const list = (res.list || res.content || res.resultList || []) as Program[];
      const totalCount = (res.total || res.totalElements || res.totalRecordCount || 0) as number;

      setData(list);
      setTotal(totalCount);
    } catch (error: unknown) {
      toast('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
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
      title: '프로그램 삭제',
      message: `[${name}] 프로그램을 삭제하시겠습니까? 해당 프로그램과 연결된 모든 메뉴 연동이 해제될 수 있습니다.`,
      variant: 'destructive',
      confirmText: '삭제 실행'
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
          <div className="text-left">
            <span className="font-black tracking-tighter text-foreground block text-md uppercase leading-none">{item.progrmKoreanNm}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40 text-left">SYSTEM_MODULE</span>
          </div>
        </div>
      )
    },
    {
      header: '식별 파일명',
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
      header: '엔드포인트(API/URL)',
      accessor: (item: Program) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/70 tracking-tighter italic text-left">
          <LinkIcon size={12} className="text-primary opacity-40 shrink-0" />
          <span className="truncate">{item.url}</span>
        </div>
      ),
      className: 'w-64'
    },
    {
      header: '관리',
      className: 'text-right w-32',
      accessor: (item: Program) => (
        <div className="flex justify-end gap-2 pr-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 hover:bg-primary hover:border-primary hover:text-white transition-all" onClick={() => handleOpenEdit(item)}>
                <Settings size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
              프로그램 속성 및 엔드포인트 수정
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-500 hover:text-white transition-all rounded-xl" onClick={() => handleDelete(item.progrmFileNm)}>
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-rose-300">
              시스템 자산 영구 삭제
            </TooltipContent>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="시스템 프로그램 미들웨어"
        breadcrumbs={[{ label: '시스템관리' }, { label: '프로그램 관리' }]}
      />

      <HubHeader
        title="프로그램"
        highlight="자산 관리"
        subtitle="시스템을 구성하는 모든 물리 프로그램 모듈 및 API 엔드포인트의 생명주기를 관리합니다."
        icon={Box}
        actions={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleOpenCreate}
                size="lg"
                className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
              >
                <Plus size={20} /> 신규 등록
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
              새로운 물리 프로그램 자산 정의
            </TooltipContent>
          </Tooltip>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="활성_프로그램_수" value={total} icon={Layers} color="primary" />
        <HubMetricCard title="시스템 무결성" value="정상" icon={ShieldCheck} color="emerald" status="확인됨" />
        <HubMetricCard title="서비스 가동시간" value="99.9%" icon={Zap} color="amber" />
        <HubMetricCard title="인벤토리 동기화" value="실시간" icon={RefreshCcw} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard 
        title="소프트웨어 레포지토리" 
        description="현재 시스템에 등록되어 동작 중인 모든 소프트웨어 자산의 명세 및 메타데이터 정보입니다." 
        icon={SearchCode}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div className="flex-1 max-w-2xl text-left">
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
              <Input
                placeholder="프로그램명 또는 파일명을 입력하여 검색.."
                value={currentSearchWrd}
                onChange={(e) => setCurrentSearchWrd(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadData()}
                className="h-16 pl-16 pr-8 w-full bg-slate-50/50 border-none rounded-[1.25rem] text-xs font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
          <Button onClick={() => loadData()} size="lg" className="h-16 px-10 rounded-[1.25rem] bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-primary transition-all gap-2">
            <Search size={18} /> 검색
          </Button>
        </div>

        <div className="overflow-hidden">
          <StandardDataTable
            columns={columns}
            data={data}
            loading={loading}
            emptyMessage="시스템에 등록된 프로그램 자산이 존재하지 않습니다."
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
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
            <Button 
                onClick={handleSave} 
                className="flex-[2] h-14 rounded-2xl font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all"
            >
              {mode === 'create' ? '신규 등록' : '정보 수정'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-8 pt-4 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="시스템 식별 파일명" required description="예: EgovMain (고유 식별값)">
              <Input
                {...form.register('progrmFileNm')}
                readOnly={mode === 'edit'}
                maxLength={60}
                className={cn(
                    "h-14 rounded-2xl text-xs font-mono font-black tracking-widest uppercase shadow-inner", 
                    mode === 'edit' && "bg-muted/50 border-none",
                    form.formState.errors.progrmFileNm ? "border-rose-500 bg-rose-50" : "border-slate-100"
                )}
                placeholder="고유 자산 ID (MAX_60)"
              />
              {form.formState.errors.progrmFileNm && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmFileNm.message}</p>}
            </FormField>
            <FormField label="프로그램 한글 명칭" required>
              <Input
                {...form.register('progrmKoreanNm')}
                maxLength={60}
                className={cn(
                    "h-14 rounded-2xl text-sm font-black tracking-tight",
                    form.formState.errors.progrmKoreanNm ? "border-rose-500 bg-rose-50" : "border-slate-100"
                )}
                placeholder="한글 자산 명칭 입력 (MAX_60)"
              />
              {form.formState.errors.progrmKoreanNm && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmKoreanNm.message}</p>}
            </FormField>
          </div>

          <FormField label="인터페이스 엔드포인트(URL)" required description="실제 서비스가 제공되는 접속 주소 또는 API 경로">
            <Input
              {...form.register('url')}
              maxLength={100}
              className={cn(
                  "h-14 rounded-2xl text-xs font-mono font-black",
                  form.formState.errors.url ? "border-rose-500 bg-rose-50" : "border-slate-100"
              )}
              placeholder="/api/v1/... (MAX_100)"
            />
            {form.formState.errors.url && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.url.message}</p>}
          </FormField>

          <FormField label="물리적 저장 경로" description="서버 내 파일 저장소 물리 경로 (Optional)">
            <Input
              {...form.register('progrmStrePath')}
              maxLength={100}
              className={cn(
                  "h-14 rounded-2xl text-xs font-medium bg-slate-50 border-none shadow-inner",
                  form.formState.errors.progrmStrePath ? "border-rose-500 bg-rose-50" : ""
              )}
              placeholder="파일 저장 물리 경로... (최대 100자)"
            />
            {form.formState.errors.progrmStrePath && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmStrePath.message}</p>}
          </FormField>

          <FormField label="상세 기능 명세">
            <textarea
              {...form.register('progrmDc')}
              maxLength={200}
              className={cn(
                  "w-full min-h-[140px] p-6 rounded-2xl border-2 border-border bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner",
                  form.formState.errors.progrmDc ? "border-rose-500 bg-rose-50" : ""
              )}
              placeholder="프로그램의 역할 및 관련 모듈 설명 (최대 200자)"
            />
            {form.formState.errors.progrmDc && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{form.formState.errors.progrmDc.message}</p>}
          </FormField>
        </form>
      </StandardModal>
    </div>
  );
}
