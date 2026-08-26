'use client';

import { useRef, useState } from 'react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { hpcmAdminService, Hpcm } from '@/services/foundation/system/HpcmAdminService';
import { Plus, BookOpen, ShieldCheck } from 'lucide-react';
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
  FormErrorSummary,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

import { HpcmDtoSchema } from '@/types/generated-zod';

export const hpcmSchema = HpcmDtoSchema.extend({
  hlpSeCd: HpcmDtoSchema.shape.hlpSeCd
    .trim()
    .min(1, '분류 구분을 입력해 주세요.')
    .max(3, '분류 구분은 최대 3자까지 입력할 수 있습니다.'),
  hlpDfn: HpcmDtoSchema.shape.hlpDfn
    .trim()
    .min(1, '도움말 명칭을 입력해 주세요.')
    .max(1000, '도움말 명칭은 최대 1,000자까지 입력할 수 있습니다.'),
  hlpExpln: HpcmDtoSchema.shape.hlpExpln
    .trim()
    .min(1, '도움말 상세 설명을 입력해 주세요.')
    .max(65535, '도움말 상세 설명은 최대 65,535자까지 입력할 수 있습니다.'),
});

const HPCM_FORM_LABELS = {
  hlpSeCd: '분류 구분',
  hlpDfn: '도움말 명칭',
  hlpExpln: '도움말 상세 설명',
};

type HpcmFormValues = z.infer<typeof hpcmSchema>;

export default function HpcmClient({ initialData }: { initialData: { list: Hpcm[] } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const registeringRef = useRef(false);
  const hpcmList = initialData.list || [];

  const form = useAppForm(hpcmSchema, {
    defaultValues: {
      hlpSeCd: '',
      hlpDfn: '',
      hlpExpln: '',
    }
  });

  const onRegisterSubmit = async (values: HpcmFormValues) => {
    if (registeringRef.current) return;
    registeringRef.current = true;
    try {
      setRegisterLoading(true);
      await hpcmAdminService.createHpcm(values);
      toast('도움말 콘텐츠가 등록되었습니다.', 'success');
      setIsModalOpen(false);
      form.reset();
      router.refresh();
    } catch (error: unknown) {
      if (!form.applyServerErrors(error)) {
        toast('도움말 등록 중 오류가 발생했습니다. 입력값은 유지됩니다.', 'error');
      }
    } finally {
      registeringRef.current = false;
      setRegisterLoading(false);
    }
  };

  const closeModal = () => {
    if (!registeringRef.current) setIsModalOpen(false);
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
    <WorkListPage
      title="도움말 콘텐츠 관리(HPCM)"
      description="시스템 가이드와 도움말 콘텐츠를 등록·관리합니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: 'HPCM' }]}
      totalCount={hpcmList.length}
      actions={
        <Button size="sm" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={16} aria-hidden="true" /> 콘텐츠 등록
        </Button>
      }
    >
      <StandardDataTable
        accessibleLabel="도움말 콘텐츠 목록"
        columns={columns}
        data={hpcmList}
        loading={loading}
        emptyMessage="등록된 도움말 콘텐츠가 없습니다."
      />

      <StandardModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="도움말 콘텐츠 등록"
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" type="button" disabled={registerLoading} onClick={closeModal} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2">취소</Button>
            <Button 
              type="submit"
              form="hpcm-create-form"
              disabled={registerLoading}
              className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
            >
              <ShieldCheck size={18} strokeWidth={3} aria-hidden="true" className="text-primary group-hover:rotate-12 transition-transform" />
              {registerLoading ? '등록 중…' : '최종 등록'}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form id="hpcm-create-form" onSubmit={form.handleSubmit(onRegisterSubmit)} className="space-y-6 pt-4 text-left" noValidate>
            <FormErrorSummary labels={HPCM_FORM_LABELS} onNavigate={form.focusError} />
            <ShadcnFormField
              control={form.control}
              name="hlpSeCd"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">분류 구분</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={3} placeholder="예: BBS" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="hlpDfn"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">도움말 명칭</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={1000} placeholder="게시판 물리삭제 기능 가이드" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="hlpExpln"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">도움말 상세 설명</FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      maxLength={65535}
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
    </WorkListPage>
  );
}


