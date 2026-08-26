'use client';

import React, { useCallback, useRef, useState } from 'react';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { eventService, EventInfo } from '@/services/foundation/operation/eventService';
import { Button } from '@/components/ui/button';
import { FormErrorSummary } from '@/components/ui/form';
import { EventInfoDtoSchema } from '@/types/generated-zod';

/**
 * `<input type="date">` 는 `2026-05-01`(10자)을 준다. 그러나 evnt_bgng_ymd/evnt_end_ymd 는
 * length=8 YYYYMMDD 컬럼이고 DTO 도 @Size(max = 8) 이라, 종전에는 등록 요청이 **항상 400
 * (C001 "size must be between 0 and 8")** 으로 실패했다 = 행사 등록 기능이 동작한 적이 없다.
 * 저장소의 기존 관례(ScheduleCreateForm·ReportCreateForm·ScheduleDeptClient)와 동일하게
 * 경계에서 하이픈을 제거한다.
 */
const inputToYmd = (value?: string) => (value ?? '').replace(/-/g, '');

function isValidInputDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ymd = inputToYmd(value);
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const day = Number(ymd.slice(6, 8));
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === month - 1
    && parsed.getDate() === day;
}

const eventInputDate = (label: string, generated: z.ZodOptional<z.ZodString>) => z.string()
  .trim()
  .min(1, `${label}을 선택해 주세요.`)
  .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} 형식을 확인해 주세요.`)
  .refine(isValidInputDate, `${label}을 확인해 주세요.`)
  .transform(inputToYmd)
  .pipe(generated.unwrap());

export const eventCreateSchema = EventInfoDtoSchema.pick({
  evntNm: true,
  evntCn: true,
  evntBgngYmd: true,
  evntEndYmd: true,
  evntUseCnt: true,
}).extend({
  evntNm: EventInfoDtoSchema.shape.evntNm.unwrap().trim().min(1, '행사 명칭을 입력해 주세요.'),
  evntCn: EventInfoDtoSchema.shape.evntCn.unwrap().trim().min(1, '상세 내용을 입력해 주세요.'),
  evntBgngYmd: eventInputDate('행사 시작일', EventInfoDtoSchema.shape.evntBgngYmd),
  evntEndYmd: eventInputDate('행사 종료일', EventInfoDtoSchema.shape.evntEndYmd),
  evntUseCnt: z.string()
    .trim()
    .min(1, '참여 정원을 입력해 주세요.')
    .regex(/^\d+$/, '참여 정원은 0명 이상의 정수로 입력해 주세요.')
    .transform(Number)
    .pipe(EventInfoDtoSchema.shape.evntUseCnt.unwrap().finite().int().min(0, '참여 정원은 0명 이상이어야 합니다.')),
}).refine((values) => values.evntEndYmd >= values.evntBgngYmd, {
  path: ['evntEndYmd'],
  message: '행사 종료일은 시작일보다 빠를 수 없습니다.',
});

type EventCreateFormInput = z.input<typeof eventCreateSchema>;

const eventValidationLabels: Record<keyof EventCreateFormInput, string> = {
  evntNm: '행사 명칭',
  evntCn: '상세 내용',
  evntBgngYmd: '행사 시작일',
  evntEndYmd: '행사 종료일',
  evntUseCnt: '참여 정원',
};

const EMPTY_EVENT_FORM: EventCreateFormInput = {
  evntNm: '',
  evntCn: '',
  evntBgngYmd: '',
  evntEndYmd: '',
  evntUseCnt: '0',
};

/** 반대 방향 — 저장된 YYYYMMDD 를 사람이 읽는 형태로. 등록이 가능해지면서 실제로 노출된다. */
const ymdToDisplay = (value?: string) => {
  const ymd = inputToYmd(value);
  return ymd.length === 8 ? `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}` : (value ?? '-');
};
import { Input } from '@/components/ui/input';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function EventManagementClient() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 페이지 번호는 URL 파생값이다(공유·새로고침·뒤로가기 복원).
  // 검색어는 개인정보 노출 우려로 URL 에 싣지 않는다(감사 D-13).
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = useCallback((next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchWrd, setSearchWrd] = useState('');
  // 타이핑 한 글자마다 서버 요청이 나가지 않도록 디바운스 값만 queryKey 에 넣는다.
  const debouncedSearchWrd = useDebouncedValue(searchWrd, 300);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState<EventCreateFormInput>(EMPTY_EVENT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const [deletingEventSn, setDeletingEventSn] = useState<number | null>(null);
  const deletePendingRef = useRef(false);
  const validation = useManualFormValidation(eventCreateSchema, { labels: eventValidationLabels });

  // --- Data Fetching ---
  const { data: eventsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['events-list', debouncedSearchWrd, page, pageSize],
    queryFn: () => eventService.getEvents({ searchWrd: debouncedSearchWrd, page: page - 1, size: pageSize }),
  });

  const displayItems: EventInfo[] = eventsData?.list ?? [];
  const totalItems = eventsData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: (data: Partial<EventInfo>) => eventService.createEvent(data),
  });

  const deleteMutation = useMutation({
    mutationFn: (evntSn: number) => eventService.deleteEvent(evntSn),
    onSuccess: () => {
      toast('행사가 성공적으로 삭제되었습니다.', 'success');
      queryClient.invalidateQueries({ queryKey: ['events-list'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate(form);
    if (!validated) return;

    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      await createMutation.mutateAsync({
        ...validated,
        bizYr: validated.evntBgngYmd.slice(0, 4),
      });
      toast('행사가 성공적으로 생성되었습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['events-list'] });
      setIsCreateModalOpen(false);
      setForm(EMPTY_EVENT_FORM);
      validation.setFormErrors({}, false);
    } catch (mutationError: unknown) {
      const fieldErrors = extractFieldErrors(mutationError);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(mutationError, '행사 생성에 실패했습니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    validation.setFormErrors({}, false);
    setIsCreateModalOpen(true);
  };

  const handleCreateModalOpenChange = (open: boolean) => {
    if (!open && submitPendingRef.current) return;
    setIsCreateModalOpen(open);
  };

  const handleSearchChange = (value: string) => {
    setSearchWrd(value);
    // 3페이지에서 검색해 빈 화면이 되는 것을 막는다.
    if (page !== 1) setPage(1);
  };

  const handleDelete = async (event: EventInfo) => {
    if (deletePendingRef.current) return;
    deletePendingRef.current = true;
    setDeletingEventSn(event.evntSn);
    try {
      const ok = await confirm({
        title: '행사 삭제',
        message: `'${event.evntNm}' 행사를 삭제합니다. 삭제된 행사는 복구할 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!ok) return;
      await deleteMutation.mutateAsync(event.evntSn);
    } catch {
      toast('행사 삭제에 실패했습니다.', 'error');
    } finally {
      deletePendingRef.current = false;
      setDeletingEventSn(null);
    }
  };

  // --- DataTable Configuration ---
  const eventColumns: Column<EventInfo>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {index !== undefined ? (index + 1 + (page - 1) * pageSize).toString().padStart(2, '0') : '-'}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '행사 명칭',
      accessor: (event) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {event.evntNm}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {ymdToDisplay(event.evntBgngYmd)} ~ {ymdToDisplay(event.evntEndYmd)}
          </span>
        </div>
      )
    },
    {
      header: '참여 정원',
      accessor: (event) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground tabular-nums">{event.evntUseCnt}</span>
          <span className="text-[10px] font-bold text-muted-foreground tracking-tighter">명</span>
        </div>
      ),
      className: 'w-32'
    },
    {
      header: '관리',
      className: 'text-right w-24',
      accessor: (event) => {
        const isDeleting = deletingEventSn === event.evntSn;
        return (
        <div className="flex items-center justify-end pr-4">
          <Button
            variant="ghost"
            size="icon"
            data-testid="delete-event-btn"
            disabled={deletingEventSn !== null}
            aria-busy={isDeleting}
            aria-label={isDeleting ? `${event.evntNm} 삭제 중` : `${event.evntNm} 삭제`}
            onClick={() => { void handleDelete(event); }}
            className="w-10 h-10 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"
          >
            {isDeleting
              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              : <Trash2 size={16} aria-hidden="true" />}
          </Button>
        </div>
        );
      }
    }
  ];

  return (
    <WorkListPage
      title="행사 운영 센터"
      description="사내 행사 및 캠페인을 조회·등록합니다."
      breadcrumbItems={[{ label: '운영지원' }, { label: '행사관리' }]}
      filterStateKey="operation-events"
      // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
      totalCount={isError ? undefined : totalItems}
      actions={
        <Button size="sm" onClick={handleOpenCreate} className="gap-2">
          <Plus size={16} aria-hidden="true" /> 행사 등록
        </Button>
      }
      filter={
        <div className="min-w-60 max-w-xl space-y-1">
          <label htmlFor="event-search" className="text-[length:var(--font-size-body)] font-medium">
            행사 명칭
          </label>
          <Input
            id="event-search"
            value={searchWrd}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="행사 검색"
            placeholder="행사 검색"
          />
        </div>
      }
    >
      <StandardDataTable
        accessibleLabel="행사 목록"
        columns={eventColumns}
        data={displayItems}
        loading={isLoading}
        error={isError ? (error as Error) : null}
        onRetry={() => refetch()}
        emptyMessage={emptyResultMessage(debouncedSearchWrd, '등록된 행사가 없습니다.')}
        keyField="evntSn"
        pagination={{
          currentPage: page,
          totalPages: totalPages,
          // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
          pageSize,
          onPageChange: (p) => setPage(p),
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
      />

      {/* Creation Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={handleCreateModalOpenChange}>
        <DialogContent className="max-w-2xl bg-card rounded-lg border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-surface-inverse p-8 text-surface-inverse-foreground">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tighter">신규 행사 등록</DialogTitle>
              <DialogDescription className="text-white/40 text-xs font-bold tracking-[0.2em]">행사 기본 정보를 입력하십시오.</DialogDescription>
            </DialogHeader>
          </div>
          <form onSubmit={handleSubmit} noValidate className="p-8 space-y-8">
            <FormErrorSummary
              errors={validation.errors}
              labels={eventValidationLabels}
              onNavigate={validation.focusError}
            />
            <div className="grid grid-cols-2 gap-8">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="evntNm" className="text-xs font-bold text-muted-foreground tracking-widest">
                  행사 명칭 <span aria-hidden="true" className="text-destructive-emphasis">*</span>
                </Label>
                <Input
                  id="evntNm"
                  {...validation.fieldProps('evntNm')}
                  aria-label="행사 명칭"
                  value={form.evntNm}
                  onChange={(e) => {
                    validation.clearError('evntNm');
                    setForm({ ...form, evntNm: e.target.value });
                  }}
                  placeholder="행사 명칭을 입력하십시오"
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                  maxLength={200}
                />
                {validation.errors.evntNm ? (
                  <p {...validation.messageProps('evntNm')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="evntCn" className="text-xs font-bold text-muted-foreground tracking-widest">
                  상세 내용 <span aria-hidden="true" className="text-destructive-emphasis">*</span>
                </Label>
                <Input
                  id="evntCn"
                  {...validation.fieldProps('evntCn')}
                  aria-label="상세 내용"
                  value={form.evntCn}
                  onChange={(e) => {
                    validation.clearError('evntCn');
                    setForm({ ...form, evntCn: e.target.value });
                  }}
                  placeholder="상세 내용을 입력하십시오"
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                  maxLength={4000}
                />
                {validation.errors.evntCn ? (
                  <p {...validation.messageProps('evntCn')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="evntBgngYmd" className="text-xs font-bold text-muted-foreground tracking-widest">
                  행사 시작일 <span aria-hidden="true" className="text-destructive-emphasis">*</span>
                </Label>
                <Input
                  id="evntBgngYmd"
                  {...validation.fieldProps('evntBgngYmd')}
                  aria-label="행사 시작일"
                  type="date"
                  value={form.evntBgngYmd}
                  onChange={(e) => {
                    validation.clearError('evntBgngYmd');
                    setForm({ ...form, evntBgngYmd: e.target.value });
                  }}
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                />
                {validation.errors.evntBgngYmd ? (
                  <p {...validation.messageProps('evntBgngYmd')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="evntEndYmd" className="text-xs font-bold text-muted-foreground tracking-widest">
                  행사 종료일 <span aria-hidden="true" className="text-destructive-emphasis">*</span>
                </Label>
                <Input
                  id="evntEndYmd"
                  {...validation.fieldProps('evntEndYmd')}
                  aria-label="행사 종료일"
                  type="date"
                  value={form.evntEndYmd}
                  onChange={(e) => {
                    validation.clearError('evntEndYmd');
                    setForm({ ...form, evntEndYmd: e.target.value });
                  }}
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                />
                {validation.errors.evntEndYmd ? (
                  <p {...validation.messageProps('evntEndYmd')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="evntUseCnt" className="text-xs font-bold text-muted-foreground tracking-widest">
                  참여 정원 (명) <span aria-hidden="true" className="text-destructive-emphasis">*</span>
                </Label>
                <Input
                  id="evntUseCnt"
                  {...validation.fieldProps('evntUseCnt')}
                  aria-label="참여 정원 (명)"
                  type="number"
                  value={form.evntUseCnt}
                  onChange={(e) => {
                    validation.clearError('evntUseCnt');
                    setForm({ ...form, evntUseCnt: e.target.value });
                  }}
                  className="h-11 bg-muted border-none rounded-lg font-bold text-sm"
                  required
                  min={0}
                  step={1}
                />
                {validation.errors.evntUseCnt ? (
                  <p {...validation.messageProps('evntUseCnt')} className="text-xs font-bold text-destructive-emphasis" />
                ) : null}
              </div>
            </div>
            <DialogFooter className="pt-8 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting || createMutation.isPending}
                onClick={() => handleCreateModalOpenChange(false)}
                className="h-11 px-8 font-bold text-xs tracking-widest"
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending} aria-busy={(isSubmitting || createMutation.isPending) || undefined} className="h-11 px-10 bg-primary text-white rounded-lg font-bold text-xs tracking-widest shadow-xl shadow-primary/20 gap-3">
                {isSubmitting || createMutation.isPending ? '등록 중...' : <><Zap size={16} aria-hidden="true" /> 행사 등록</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </WorkListPage>
  );
}
