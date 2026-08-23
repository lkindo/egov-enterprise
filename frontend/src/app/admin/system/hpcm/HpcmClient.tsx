'use client';

import { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { hpcmAdminService, Hpcm } from '@/services/foundation/system/HpcmAdminService';
import { HelpCircle, FileText, Search, Plus, BookOpen, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
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
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

import { HpcmDtoSchema } from '@/types/generated-zod';

const hpcmSchema = HpcmDtoSchema.extend({
  hlpSeCd: HpcmDtoSchema.shape.hlpSeCd.min(1),
  hlpDfn: HpcmDtoSchema.shape.hlpDfn.min(1),
  hlpExpln: HpcmDtoSchema.shape.hlpExpln.min(1),
});

type HpcmFormValues = z.infer<typeof hpcmSchema>;

export default function HpcmClient({ initialData }: { initialData: { list: Hpcm[] } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const hpcmList = initialData.list || [];

  const form = useAppForm(hpcmSchema, {
    defaultValues: {
      hlpSeCd: '',
      hlpDfn: '',
      hlpExpln: '',
    }
  });

  const onRegisterSubmit = async (values: HpcmFormValues) => {
    try {
      setRegisterLoading(true);
      await hpcmAdminService.createHpcm(values);
      toast('도움말 콘텐츠가 등록되었습니다.', 'success');
      setIsModalOpen(false);
      form.reset();
      router.refresh();
    } catch {
      toast('도움말 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setRegisterLoading(false);
    }
  };

  const columns: Column<Hpcm>[] = [
    {
      header: '콘텐츠 명세',
      accessor: (item) => (
        <div className="flex items-center gap-5 py-4">
          <div className="w-12 h-12 rounded-lg bg-surface-inverse flex items-center justify-center text-white/40 shadow-xl group-hover:scale-110 transition-transform">
            <BookOpen size={18} />
          </div>
          <div className="flex flex-col gap-1 text-left">
            <span className="px-3 py-1 bg-muted text-foreground rounded-lg text-xs font-bold tracking-tight border border-border w-fit">
              {item.hlpSeCd || 'SYSTEM'}
            </span>
            <span className="font-bold tracking-tighter text-foreground text-md uppercase leading-tight mt-1">{item.hlpDfn}</span>
          </div>
        </div>
      )
    },
    {
      header: 'ID / 레퍼런스',
      accessor: (item) => (
        <span className="text-xs font-bold text-muted-foreground/40 tracking-[0.3em] font-mono ">
          SN: {item.hlpSn}
        </span>
      ),
      className: 'w-48'
    },
    {
      header: '요약 설명',
      accessor: (item) => (
        <p className="text-sm text-muted-foreground font-medium line-clamp-1 max-w-md">
          {item.hlpExpln || '설명이 존재하지 않는 아카이브입니다.'}
        </p>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="도움말 콘텐츠 아키텍처"
        breadcrumbs={[{ label: '시스템관리' }, { label: 'HPCM' }]}
      />

      <HubHeader 
        title="HPCM" 
        highlight="Help Content" 
        subtitle="사용자 경험 최적화를 위해 모든 시스템 가이드와 도움말 콘텐츠를 중앙 집중식으로 관리합니다." 
        icon={HelpCircle} 
        actions={
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="h-12 px-8 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase hover:bg-primary transition-all"
          >
            <Plus size={16} className="mr-2" /> 콘텐츠 등록
          </Button>
        }
      />

      {/* [정직성] 종전에는 하드코딩 "최근_업데이트_로그 2"·"시스템_무결성 99.9% OPTIMIZED"·"SYNCED" 를
          실측처럼 표시했다. 계측 원천이 없는 값은 만들지 않는다 — 실제 목록에서 파생되는 값만 남긴다. */}
      <HubMetricGrid>
        <HubMetricCard title="전체 도움말 자산" value={hpcmList.length} icon={FileText} color="primary" status="집계" />
      </HubMetricGrid>

      <HubSectionCard title="콘텐츠 인벤토리" description="현재 클러스터에 배포된 모든 도움말 콘텐츠 명세입니다." icon={Search}>
        <div className="overflow-hidden min-h-[500px]">
          <StandardDataTable
            columns={columns}
            data={hpcmList}
            loading={loading}
            emptyMessage="조회된 도움말 콘텐츠가 현재 클러스터에 존재하지 않습니다."
            className="border-none bg-transparent"
          />
        </div>
      </HubSectionCard>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="도움말 콘텐츠 등록"
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2">취소</Button>
            <Button 
              onClick={form.handleSubmit(onRegisterSubmit)}
              disabled={registerLoading}
              className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
            >
              <ShieldCheck size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> 최종 등록
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form className="space-y-6 pt-4 text-left">
            <ShadcnFormField
              control={form.control}
              name="hlpSeCd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">분류 구분</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="예: 게시판, 로그인, 회원가입" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="hlpDfn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">도움말 명칭</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="게시판 물리삭제 기능 가이드" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="hlpExpln"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">도움말 상세 설명</FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      placeholder="게시판 영구 말소와 물리삭제 시 준수해야 하는 검증 프로토콜 설명입니다." 
                      className="w-full min-h-[150px] p-3 rounded-lg border bg-muted border-border focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </StandardModal>
    </div>
  );
}


