'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { PagePagination } from '@/components/common/PagePagination';
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { deptAdminService } from '@/services/foundation/system/DeptAdminService';
import type { DeptJobBxVO } from '@/types/business/deptJob';
import { DeptJobBoxDtoSchema } from '@/types/generated-zod';

const StandardModal = dynamic(
  () => import('@/app/components/ui/standard-modal').then((mod) => mod.StandardModal),
  { ssr: false },
);

/** Radix Select 는 빈 문자열 value 를 허용하지 않는다 — '부서 미지정' 은 별도 sentinel 로 나른다. */
const NO_DEPT = '__none__';
const PAGE_SIZE = 10;

/**
 * 업무함 폼 계약. 서버 DTO(DeptJobBoxDto)를 확장한다 — 이름은 서버가 @NotBlank·@Size(100) 으로 거부하고,
 * 정렬 순서는 화면에서 문자열로 받아 제출 시 숫자로 바꾼다(빈 값은 보내지 않는다).
 */
export const deptJobBoxSchema = DeptJobBoxDtoSchema.pick({ deptId: true }).extend({
  deptTaskBoxNm: z.string().trim().min(1, '업무함 이름을 입력하세요.').max(100, '업무함 이름은 100자 이하여야 합니다.'),
  deptId: z.string().max(20).optional(),
  sortOrdr: z.string().regex(/^\d*$/, '정렬 순서는 0 이상의 정수여야 합니다.').optional(),
});

type DeptJobBoxFormValues = z.infer<typeof deptJobBoxSchema>;

const EMPTY_FORM: DeptJobBoxFormValues = { deptTaskBoxNm: '', deptId: undefined, sortOrdr: '' };

interface DeptJobBoxManageDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 🗂 업무함 관리 다이얼로그 — 워크허브 업무 탭의 관리자 액션.
 *
 * [2026-09-06 DEC-OPS-037] 업무함 CRUD 5본은 서버(/dept-jobs/boxes)와 프런트 서비스에 다 있었는데 화면은
 * 목록 조회 하나만 소비했다(감사 D10-01). 그래서 시드가 없으면 업무 등록 폼의 '업무함' 선택지가 비고
 * 모든 업무가 '업무함 미지정' 으로 남았다. 여기서 만든 함은 업무 등록 폼(['dept-job-boxes'])과
 * 업무 목록(['work-jobs'])이 즉시 다시 읽는다.
 *
 * 삭제는 서버가 산하 업무가 남아 있으면 409(RESOURCE_IN_USE)로 거부한다 — 화면은 그 사실을 미리 알리고
 * 실패 메시지를 그대로 드러낸다(고아 업무를 만들지 않는 서버 규칙을 화면이 우회하지 않는다).
 */
export function DeptJobBoxManageDialog({ isOpen, onClose }: DeptJobBoxManageDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<DeptJobBxVO | null>(null);
  const [saving, setSaving] = useState(false);
  const submitLock = useRef(false);
  const [deletingSn, setDeletingSn] = useState<number | null>(null);
  const deletePendingRef = useRef(false);

  const form = useAppForm(deptJobBoxSchema, { defaultValues: EMPTY_FORM });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dept-job-boxes', 'manage', page],
    queryFn: () => deptJobUserService.getDeptJobBoxes({ page: page - 1, size: PAGE_SIZE }),
    enabled: isOpen,
  });
  const { data: departments } = useQuery({
    queryKey: ['dept-tree', 'box-manage'],
    queryFn: () => deptAdminService.getDeptTree(),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const boxes = data?.list ?? [];
  const total = data?.total ?? 0;

  const invalidate = () => {
    // 업무 등록 폼의 선택지(['dept-job-boxes'])와 워크허브 업무 목록의 업무함 이름(['work-jobs'])을 함께 갱신한다.
    queryClient.invalidateQueries({ queryKey: ['dept-job-boxes'] });
    queryClient.invalidateQueries({ queryKey: ['work-jobs'] });
  };

  const startCreate = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
  };

  const startEdit = (box: DeptJobBxVO) => {
    setEditing(box);
    form.reset({
      deptTaskBoxNm: box.deptTaskBoxNm ?? '',
      deptId: box.deptId || undefined,
      sortOrdr: box.sortOrdr === undefined || box.sortOrdr === null ? '' : String(box.sortOrdr),
    });
  };

  const onSubmit = async (values: DeptJobBoxFormValues) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSaving(true);
    try {
      const payload = {
        deptTaskBoxNm: values.deptTaskBoxNm,
        deptId: values.deptId || undefined,
        ...(values.sortOrdr ? { sortOrdr: Number(values.sortOrdr) } : {}),
      };
      if (editing) {
        await deptJobUserService.updateDeptJobBox(editing.deptTaskBoxSn, payload);
        toast('업무함을 수정했습니다.', 'success');
      } else {
        await deptJobUserService.createDeptJobBox(payload);
        toast('업무함을 등록했습니다.', 'success');
        setPage(1);
      }
      setEditing(null);
      form.reset(EMPTY_FORM);
      invalidate();
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast(extractErrorMessage(error, editing ? '업무함 수정에 실패했습니다.' : '업무함 등록에 실패했습니다.'), 'error');
      }
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  const handleDelete = async (box: DeptJobBxVO) => {
    if (deletePendingRef.current) return;
    deletePendingRef.current = true;
    setDeletingSn(box.deptTaskBoxSn);
    try {
      const ok = await confirm({
        title: '업무함 삭제',
        message: `'${box.deptTaskBoxNm}' 업무함을 삭제합니다. 산하 업무가 남아 있으면 삭제되지 않습니다 — 먼저 업무를 다른 함으로 옮기거나 지워 주세요.`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!ok) return;
      await deptJobUserService.deleteDeptJobBox(box.deptTaskBoxSn);
      toast('업무함을 삭제했습니다.', 'success');
      if (editing?.deptTaskBoxSn === box.deptTaskBoxSn) startCreate();
      invalidate();
    } catch (error) {
      toast(extractErrorMessage(error, '업무함 삭제에 실패했습니다.'), 'error');
    } finally {
      deletePendingRef.current = false;
      setDeletingSn(null);
    }
  };

  const handleClose = () => {
    if (submitLock.current) return;
    startCreate();
    onClose();
  };

  const editingLabel = editing ? `${editing.deptTaskBoxNm} 수정 중` : null;

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={handleClose}
      title="업무함 관리"
      footer={
        <div className="flex w-full items-center gap-2">
          {editing && (
            <Button type="button" variant="outline" className="h-11 flex-1" onClick={startCreate} disabled={saving}>
              수정 취소
            </Button>
          )}
          <Button type="submit" form="dept-job-box-form" className="h-11 flex-[2]" disabled={saving || form.formState.isSubmitting}>
            {saving ? '저장 중…' : editing ? '수정 저장' : '업무함 등록'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pt-2 text-left">
        <section aria-labelledby="dept-job-box-list-heading" className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 id="dept-job-box-list-heading" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              등록된 업무함 <span className="tabular-nums">{total}</span>개
            </h3>
            {editingLabel && <span className="text-xs font-bold text-primary">{editingLabel}</span>}
          </div>
          {isError ? (
            <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
              <span>업무함 목록을 불러오지 못했습니다.</span>
              <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>다시 시도</Button>
            </div>
          ) : isLoading ? (
            <p className="text-xs text-muted-foreground">불러오는 중…</p>
          ) : boxes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              등록된 업무함이 없습니다. 아래에서 첫 업무함을 등록하세요.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border" aria-label="업무함 목록">
              {boxes.map((box) => {
                const isDeleting = deletingSn === box.deptTaskBoxSn;
                const isCurrent = editing?.deptTaskBoxSn === box.deptTaskBoxSn;
                return (
                  <li
                    key={box.deptTaskBoxSn}
                    className={`flex items-center gap-3 px-3 py-2 ${isCurrent ? 'bg-muted' : ''}`}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">{box.deptTaskBoxNm}</span>
                      <span className="block text-xs text-muted-foreground">
                        {box.deptNm || box.deptId || '부서 미지정'}
                        {box.sortOrdr !== undefined && box.sortOrdr !== null ? ` · 순서 ${box.sortOrdr}` : ''}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" aria-label={`${box.deptTaskBoxNm} 수정`} onClick={() => startEdit(box)} disabled={saving}>
                      <Pencil size={16} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${box.deptTaskBoxNm} 삭제`}
                      aria-busy={isDeleting}
                      disabled={deletingSn !== null || saving}
                      onClick={() => handleDelete(box)}
                      className="text-destructive hover:text-destructive"
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <PagePagination page={page} total={total} size={PAGE_SIZE} onPageChange={setPage} />
        </section>

        <Form {...form}>
          <form
            id="dept-job-box-form"
            noValidate
            // 렌더 시점이 아니라 이벤트 시점에 handleSubmit 을 만든다 — onSubmit 이 읽는 동기 잠금 ref 를 렌더에서 읽지 않는다(react-hooks/refs).
            onSubmit={(event) => { void form.handleSubmit(onSubmit)(event); }}
            className="space-y-4"
            aria-label={editing ? '업무함 수정' : '업무함 등록'}
          >
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Plus size={14} aria-hidden="true" /> {editing ? '업무함 수정' : '새 업무함'}
            </h3>
            <FormErrorSummary
              labels={{ deptTaskBoxNm: '업무함 이름', deptId: '담당 부서', sortOrdr: '정렬 순서' }}
              onNavigate={form.focusError}
            />
            <ShadcnFormField
              control={form.control}
              name="deptTaskBoxNm"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel>업무함 이름</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} placeholder="예: 기획 · 인사 · 대외협력" className="h-11 rounded-lg" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="deptId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>담당 부서</FormLabel>
                  <Select
                    value={field.value ?? NO_DEPT}
                    onValueChange={(value) => field.onChange(value === NO_DEPT ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-lg" aria-label="담당 부서">
                        <SelectValue placeholder="부서 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_DEPT}>부서 미지정</SelectItem>
                      {(departments ?? []).map((dept) => (
                        <SelectItem key={dept.ognzId} value={dept.ognzId}>{dept.ognzNm}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control}
              name="sortOrdr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>정렬 순서</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="비우면 순서 없음"
                      className="h-11 rounded-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </StandardModal>
  );
}
