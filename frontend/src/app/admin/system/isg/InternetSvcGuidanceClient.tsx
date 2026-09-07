'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, RefreshCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { z } from 'zod';
import dynamic from 'next/dynamic';

import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  internetSvcGuidanceAdminService,
  type InternetSvcGuidance,
} from '@/services/foundation/system/InternetSvcGuidanceAdminService';
import type { PageResponse } from '@/types/foundation/system';
import { InternetSvcGuidanceDtoRequestSchema } from '@/types/generated-zod';

const StandardModal = dynamic(
  () => import('@/app/components/ui/standard-modal').then((mod) => mod.StandardModal),
  { ssr: false },
);

/**
 * 등록·수정 공통 스키마. 생성 Request 스키마를 확장해 서버 `@NotBlank` 를 화면에서 먼저 잡는다
 * (생성 zod 는 `min(0)` 이라 빈 문자열을 통과시킨다 — 서버 400 을 기다리지 않는다).
 * 반영여부는 물리 컬럼이 varchar(1) 이고 화면이 Y/N 두 값만 제공하므로 그 어휘로 좁힌다.
 */
export const internetSvcGuidanceSchema = InternetSvcGuidanceDtoRequestSchema.extend({
  itntSvcNm: InternetSvcGuidanceDtoRequestSchema.shape.itntSvcNm
    .min(1, '인터넷 서비스 명칭을 입력하세요.')
    .max(100),
  itntSvcExpln: InternetSvcGuidanceDtoRequestSchema.shape.itntSvcExpln
    .min(1, '인터넷 서비스 설명을 입력하세요.')
    .max(4000),
  rfltYn: z.enum(['Y', 'N']),
});

type GuidanceFormValues = z.infer<typeof internetSvcGuidanceSchema>;

const EMPTY_FORM: GuidanceFormValues = {
  itntSvcNm: '',
  itntSvcExpln: '',
  rfltYn: 'Y',
};

const QUERY_KEY = 'admin-internet-svc-guidance';

export default function InternetSvcGuidanceClient({
  initialPage,
}: {
  initialPage: PageResponse<InternetSvcGuidance> | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialPage?.size || 10);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const submitLock = useRef(false);
  /** 수정 대상. null 이면 등록 모달이다. */
  const [editing, setEditing] = useState<InternetSvcGuidance | null>(null);
  const [deletingSn, setDeletingSn] = useState<number | null>(null);
  const deletePendingRef = useRef(false);

  const form = useAppForm(internetSvcGuidanceSchema, { defaultValues: EMPTY_FORM });

  const closeModal = () => {
    if (submitLock.current) return;
    setIsModalOpen(false);
    setEditing(null);
  };

  const openCreate = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEdit = (item: InternetSvcGuidance) => {
    setEditing(item);
    form.reset({
      itntSvcNm: item.itntSvcNm ?? '',
      itntSvcExpln: item.itntSvcExpln ?? '',
      // 저장된 값이 Y/N 어휘 밖이면 지어내지 않고 'N'(미반영)으로 보수적으로 연다.
      rfltYn: item.rfltYn === 'Y' ? 'Y' : 'N',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: InternetSvcGuidance) => {
    if (deletePendingRef.current || item.itntSrvcSn === undefined || item.itntSrvcSn === null) return;
    deletePendingRef.current = true;
    setDeletingSn(item.itntSrvcSn);
    try {
      const ok = await confirm({
        title: '인터넷 서비스 안내 삭제',
        message: `'${item.itntSvcNm}' 안내를 삭제합니다. 삭제한 안내는 복구할 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!ok) return;
      await internetSvcGuidanceAdminService.deleteGuidance(item.itntSrvcSn);
      toast('인터넷 서비스 안내를 삭제했습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    } catch (error) {
      toast(extractErrorMessage(error, '인터넷 서비스 안내 삭제에 실패했습니다.'), 'error');
    } finally {
      deletePendingRef.current = false;
      setDeletingSn(null);
    }
  };

  /*
    조회 실패를 '없음' 으로 그리지 않는다 — 실패하면 error·onRetry 로 표에 드러내고,
    셸 툴바의 총 건수는 0 이 아니라 '알 수 없음' 으로 둔다(형제 화면과 같은 규칙).
  */
  const { data, isLoading, isError, error: listError, refetch } = useQuery({
    queryKey: [QUERY_KEY, searchKeyword, page, size],
    // 서버 계약: keyword(서비스 명칭 부분일치) + Spring Pageable(page 는 0-based)
    queryFn: () => internetSvcGuidanceAdminService.getGuidanceList({
      keyword: searchKeyword,
      page: page - 1,
      size,
    }),
    initialData: (!searchKeyword && page === 1 && initialPage) ? initialPage : undefined,
  });

  const guidances = data?.list || [];
  const totalItems = data?.total || 0;
  const totalPages = data?.totalPage ?? Math.ceil(totalItems / size);

  const onSubmit = async (values: GuidanceFormValues) => {
    if (submitLock.current) return;
    submitLock.current = true;
    try {
      setSubmitLoading(true);
      if (editing && editing.itntSrvcSn !== undefined && editing.itntSrvcSn !== null) {
        await internetSvcGuidanceAdminService.updateGuidance(editing.itntSrvcSn, values);
        toast('인터넷 서비스 안내를 수정했습니다.', 'success');
      } else {
        await internetSvcGuidanceAdminService.createGuidance(values);
        toast('인터넷 서비스 안내를 등록했습니다.', 'success');
        setPage(1);
      }
      setIsModalOpen(false);
      setEditing(null);
      form.reset(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast(
          editing
            ? '인터넷 서비스 안내 수정 중 오류가 발생했습니다.'
            : '인터넷 서비스 안내 등록 중 오류가 발생했습니다.',
          'error',
        );
      }
    } finally {
      submitLock.current = false;
      setSubmitLoading(false);
    }
  };

  const columns: Column<InternetSvcGuidance>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {index !== undefined ? (index + 1 + (page - 1) * size).toString().padStart(2, '0') : '-'}
        </span>
      ),
      className: 'w-20 text-center',
    },
    {
      header: '서비스 명칭',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {item.itntSvcNm}
          </span>
          <span className="text-xs text-muted-foreground line-clamp-1 max-w-[520px]">
            {item.itntSvcExpln}
          </span>
        </div>
      ),
    },
    {
      header: '반영 여부',
      className: 'w-28',
      accessor: (item) => {
        // 어휘 밖 값은 'Y/N' 중 하나로 뭉개지 않고 원문을 드러낸다 — 지어내지 않는다.
        if (item.rfltYn === 'Y') return <span className="text-xs font-bold text-success-emphasis">반영</span>;
        if (item.rfltYn === 'N') return <span className="text-xs font-bold text-muted-foreground">미반영</span>;
        return (
          <span className="text-xs font-bold text-warning-emphasis">
            {item.rfltYn ? `알 수 없음 (${item.rfltYn})` : '미지정'}
          </span>
        );
      },
    },
    {
      header: '최종 수정',
      className: 'w-44',
      accessor: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
            {item.mdfcnDt ? item.mdfcnDt.slice(0, 10) : '-'}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
            {item.lastMdfrId ?? '-'}
          </span>
        </div>
      ),
    },
    {
      header: '관리',
      className: 'text-right w-28',
      accessor: (item) => {
        const isDeleting = deletingSn !== null && deletingSn === item.itntSrvcSn;
        return (
          <div className="flex items-center justify-end gap-1 pr-2">
            <Button
              variant="ghost"
              size="icon"
              disabled={deletingSn !== null || submitLoading}
              aria-label={`${item.itntSvcNm} 수정`}
              onClick={() => openEdit(item)}
              className="w-10 h-10 rounded-lg hover:bg-muted transition-colors"
            >
              <Pencil size={16} aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={deletingSn !== null}
              aria-busy={isDeleting}
              aria-label={isDeleting ? `${item.itntSvcNm} 삭제 중` : `${item.itntSvcNm} 삭제`}
              onClick={() => { void handleDelete(item); }}
              className="w-10 h-10 rounded-lg hover:bg-destructive/10 hover:text-destructive-emphasis transition-colors"
            >
              {isDeleting
                ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                : <Trash2 size={16} aria-hidden="true" />}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <WorkListPage
      title="인터넷 서비스 안내 관리"
      description="기관이 제공하는 인터넷 서비스의 안내 문구를 조회·등록·수정합니다."
      breadcrumbItems={[{ label: '시스템 관리' }, { label: '서비스 안내' }, { label: '인터넷 서비스 안내' }]}
      filterStateKey="system-internet-svc-guidance"
      totalCount={isError ? undefined : totalItems}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            aria-label="인터넷 서비스 안내 목록 새로고침"
            onClick={() => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })}
            className="gap-2"
          >
            <RefreshCcw size={16} aria-hidden="true" />
            새로고침
          </Button>
          <Button size="sm" onClick={openCreate} className="gap-2">
            <Plus size={16} aria-hidden="true" /> 서비스 안내 등록
          </Button>
        </>
      }
      filter={
        <KeywordFilter
          label="서비스 명칭"
          placeholder="서비스 명칭으로 검색"
          value={searchKeyword}
          onSearch={(keyword) => { setPage(1); setSearchKeyword(keyword); }}
        />
      }
    >
      <StandardDataTable
        accessibleLabel="인터넷 서비스 안내 목록"
        columns={columns}
        data={guidances}
        loading={isLoading}
        error={isError ? listError : null}
        onRetry={() => { void refetch(); }}
        emptyMessage={emptyResultMessage(searchKeyword, '등록된 인터넷 서비스 안내가 없습니다.')}
        pagination={{
          currentPage: page,
          totalPages,
          onPageChange: (p) => setPage(p),
          pageSize: size,
          onPageSizeChange: (next) => { setSize(next); setPage(1); },
          pageSizeOptions: [10, 20, 50],
        }}
      />

      <StandardModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editing ? '인터넷 서비스 안내 수정' : '인터넷 서비스 안내 등록'}
        maxWidth="xl"
        footer={
          <div className="flex w-full gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              disabled={submitLoading || form.formState.isSubmitting}
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest uppercase border-2"
            >
              취소
            </Button>
            <Button
              type="submit"
              form="internet-svc-guidance-form"
              disabled={submitLoading || form.formState.isSubmitting}
              className="flex-[2] h-11 bg-surface-inverse border-none text-surface-inverse-foreground rounded-lg font-bold text-xs tracking-widest uppercase shadow-2xl flex items-center justify-center gap-3 hover:bg-primary transition-all active:scale-95 group"
            >
              <ShieldCheck size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" aria-hidden="true" />
              {submitLoading ? (editing ? '저장 중…' : '등록 중…') : (editing ? '수정 저장' : '등록')}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form
            id="internet-svc-guidance-form"
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6 pt-4 text-left"
          >
            <FormErrorSummary
              labels={{
                itntSvcNm: '서비스 명칭',
                itntSvcExpln: '서비스 설명',
                rfltYn: '반영 여부',
              }}
              onNavigate={form.focusError}
            />
            <ShadcnFormField
              control={form.control}
              name="itntSvcNm"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">서비스 명칭</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} placeholder="민원 전자 접수" className="h-11 rounded-lg bg-muted border-border" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="itntSvcExpln"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">서비스 설명</FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      maxLength={4000}
                      placeholder="온라인으로 민원을 접수하고 처리 상태를 확인할 수 있는 서비스입니다."
                      className="w-full min-h-[140px] p-3 rounded-lg border bg-muted border-border focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="rfltYn"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">반영 여부</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full h-11 px-3 rounded-lg border bg-muted border-border focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="Y">반영</option>
                      <option value="N">미반영</option>
                    </select>
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
