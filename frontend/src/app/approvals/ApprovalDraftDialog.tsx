'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { AlertTriangle, RefreshCcw, UserRound } from 'lucide-react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { UserPicker } from '@/app/components/ui/user-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { ApprovalDraftRequestSchema } from '@/types/generated-zod';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import { approvalMutationOptions, approvalQueryOptions } from '@/queries/approval-query-options';

const DRAFT_LABELS = {
  taskSeCd: '업무 구분',
  aprvrId: '결재자',
  reqYmd: '신청일',
};

/**
 * 기안 폼 스키마 — 백엔드 SSOT(generated-zod)를 확장한다(FE 헌법 제13조 2항).
 * 신청일은 물리 컬럼이 varchar(8) 이라 yyyyMMdd 8자로 고정한다.
 */
const draftFormSchema = ApprovalDraftRequestSchema.extend({
  taskSeCd: z.string().trim().min(1, '업무 구분을 선택해 주세요.').max(12, '업무 구분 코드는 12자 이내입니다.'),
  aprvrId: z.string().trim().min(1, '결재자를 선택해 주세요.').max(20, '결재자 식별자는 20자 이내입니다.'),
  reqYmd: z.string().trim().regex(/^\d{8}$/, '신청일을 확인해 주세요.'),
});

type DraftFormValues = z.output<typeof draftFormSchema>;

/** 저장 포맷 'yyyyMMdd' → <input type="date"> 의 'yyyy-MM-dd' */
const ymdToInput = (ymd: string) =>
  ymd.length === 8 ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '';
/** <input type="date"> 의 'yyyy-MM-dd' → 저장 포맷 'yyyyMMdd' */
const inputToYmd = (value: string) => value.replace(/-/g, '');

interface ApprovalDraftDialogProps {
  /**
   * 열림 여부. 부모는 열릴 때만 이 컴포넌트를 마운트한다 — 그래야 닫았다 다시 열 때 폼이 빈 상태로
   * 시작하고, 오늘 날짜도 마운트(사용자 상호작용 뒤) 시점에 계산돼 하이드레이션과 무관하다.
   */
  isOpen: boolean;
  onClose: () => void;
  /** 상신이 저장된 뒤 호출된다. 부모가 '내가 올린 결재' 탭으로 옮기는 데 쓴다. */
  onCreated: (ifmlAtrzSn: number) => void;
}

/**
 * 새 결재 기안 다이얼로그.
 *
 * [2026-09-05] 결재 도메인에는 승인·반려는 있었지만 <b>올리는</b> 화면이 없었다. 기안 화면
 * (`/approvals/draft`)은 하드코딩 양식 4종의 목업이고 제출은 "저장하지 않는다" 토스트만 띄웠다.
 * 백엔드가 실제로 아는 세 값(업무 구분·결재자·신청일)만 받아 `POST /approvals` 로 보낸다.
 *
 * ⚠ 업무 구분은 공통코드 COM075 의 상세코드다. 그룹이 비어 있으면 임의 값을 지어내지 않고
 *   (PD-DB-003) "고를 것이 없다" 를 그대로 보여 주며 상신을 막는다 — 서버도 같은 이유로 거부한다.
 * ⚠ 결재자는 사용자 검색이 돌려주는 esntlId 다. loginId 를 넣으면 결재자 이름이 조용히 빈다.
 */
export function ApprovalDraftDialog({ isOpen, onClose, onCreated }: ApprovalDraftDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [taskSeCd, setTaskSeCd] = useState('');
  const [approver, setApprover] = useState<UserSearchResult | null>(null);
  const [reqYmd, setReqYmd] = useState(() => getTodayYmd());
  const [isPickerOpen, setPickerOpen] = useState(false);
  const submitPendingRef = useRef(false);
  const approverButtonRef = useRef<HTMLButtonElement>(null);
  const reqYmdRef = useRef<HTMLInputElement>(null);
  const taskSeCdTriggerRef = useRef<HTMLButtonElement>(null);

  const validation = useManualFormValidation(draftFormSchema, {
    labels: DRAFT_LABELS,
    focusTargets: {
      taskSeCd: () => taskSeCdTriggerRef.current,
      aprvrId: () => approverButtonRef.current,
      reqYmd: () => reqYmdRef.current,
    },
  });

  const {
    data: taskTypes,
    isLoading: isTaskTypesLoading,
    isError: isTaskTypesError,
    refetch: refetchTaskTypes,
  } = useQuery({ ...approvalQueryOptions.taskTypes(), enabled: isOpen });
  const createMutation = useMutation(approvalMutationOptions.create(queryClient));

  const taskTypeOptions = useMemo(
    () => (taskTypes ?? []).filter((code) => code.useYn === 'Y' && code.dtlCd),
    [taskTypes],
  );
  const hasTaskTypes = taskTypeOptions.length > 0;
  const isSubmitting = createMutation.isPending;
  const canSubmit = hasTaskTypes && !isSubmitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitPendingRef.current || !canSubmit) return;

    const validated = validation.validate({
      taskSeCd,
      aprvrId: approver?.esntlId ?? '',
      reqYmd,
    } satisfies DraftFormValues);
    if (!validated) return;

    submitPendingRef.current = true;
    try {
      const ifmlAtrzSn = await createMutation.mutateAsync(validated);
      toast('결재를 상신했습니다. 결재자가 처리하면 알림으로 알려 드립니다.', 'success');
      onCreated(ifmlAtrzSn);
      onClose();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '결재를 상신하지 못했습니다. 입력한 내용은 유지됩니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
    }
  };

  const taskSeCdProps = validation.fieldProps('taskSeCd');
  const aprvrIdProps = validation.fieldProps('aprvrId');
  const reqYmdProps = validation.fieldProps('reqYmd');

  return (
    <>
      <StandardModal isOpen={isOpen} onClose={onClose} title="새 결재 기안" maxWidth="md">
        <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="결재 기안 폼">
          <FormErrorSummary
            errors={validation.errors}
            labels={DRAFT_LABELS}
            onNavigate={validation.focusError}
          />

          {/* 업무 구분 */}
          <div className="space-y-2">
            <label htmlFor="approval-draft-task-type" className="text-sm font-semibold text-foreground">
              업무 구분
            </label>
            {isTaskTypesLoading ? (
              <p role="status" className="text-sm text-muted-foreground">업무 구분을 불러오는 중입니다.</p>
            ) : isTaskTypesError ? (
              <div role="alert" className="space-y-2 rounded-md border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm font-semibold text-destructive-emphasis">업무 구분을 불러오지 못했습니다.</p>
                <Button type="button" size="sm" variant="outline" onClick={() => { void refetchTaskTypes(); }}>
                  <RefreshCcw aria-hidden="true" /> 다시 시도
                </Button>
              </div>
            ) : !hasTaskTypes ? (
              /*
                COM075 에 사용 중 상세코드가 없다. 선택지를 지어내면 서버가 거부하고(등록 코드 검증),
                시드로 채우면 PD-DB-003 을 우회한다 — 사실을 그대로 말하고 상신을 막는다(G10).
              */
              <div role="alert" className="flex gap-3 rounded-md border border-warning/40 bg-warning/10 p-3">
                <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={16} />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-foreground">등록된 업무 구분이 없어 결재를 올릴 수 없습니다.</p>
                  <p className="text-muted-foreground">
                    관리자가 공통코드 관리에서 업무구분코드(COM075)의 상세코드를 등록하면 여기에서 고를 수 있습니다.
                  </p>
                </div>
              </div>
            ) : (
              <Select
                value={taskSeCd}
                onValueChange={(value) => {
                  validation.clearError('taskSeCd');
                  setTaskSeCd(value);
                }}
              >
                <SelectTrigger
                  id="approval-draft-task-type"
                  ref={taskSeCdTriggerRef}
                  className="w-full"
                  aria-invalid={taskSeCdProps['aria-invalid']}
                  aria-describedby={taskSeCdProps['aria-describedby']}
                >
                  <SelectValue placeholder="업무 구분을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypeOptions.map((code) => (
                    <SelectItem key={code.dtlCd} value={code.dtlCd}>{code.dtlCdNm || code.dtlCd}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {validation.errors.taskSeCd ? (
              <p {...validation.messageProps('taskSeCd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>

          {/* 결재자 */}
          <div className="space-y-2">
            <p id="approval-draft-approver-label" className="text-sm font-semibold text-foreground">결재자</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                ref={approverButtonRef}
                id="approval-draft-approver-button"
                type="button"
                variant="outline"
                aria-labelledby="approval-draft-approver-label approval-draft-approver-button"
                aria-invalid={aprvrIdProps['aria-invalid']}
                aria-describedby={aprvrIdProps['aria-describedby']}
                onClick={() => setPickerOpen(true)}
              >
                <UserRound aria-hidden="true" />
                {approver ? '결재자 변경' : '결재자 선택'}
              </Button>
              <span className="text-sm text-foreground" data-testid="approval-draft-approver">
                {approver
                  ? `${approver.userNm ?? approver.esntlId}${approver.deptNm ? ` · ${approver.deptNm}` : ''}`
                  : '아직 선택하지 않았습니다.'}
              </span>
            </div>
            {validation.errors.aprvrId ? (
              <p {...validation.messageProps('aprvrId')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>

          {/* 신청일 */}
          <div className="space-y-2">
            <label htmlFor="approval-draft-req-ymd" className="text-sm font-semibold text-foreground">신청일</label>
            <Input
              id="approval-draft-req-ymd"
              ref={reqYmdRef}
              type="date"
              value={ymdToInput(reqYmd)}
              onChange={(event) => {
                validation.clearError('reqYmd');
                setReqYmd(inputToYmd(event.target.value));
              }}
              aria-invalid={reqYmdProps['aria-invalid']}
              aria-describedby={reqYmdProps['aria-describedby']}
              className="max-w-xs"
            />
            {validation.errors.reqYmd ? (
              <p {...validation.messageProps('reqYmd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>취소</Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              aria-busy={isSubmitting || undefined}
              title={hasTaskTypes ? undefined : '등록된 업무 구분이 없어 상신할 수 없습니다'}
            >
              {isSubmitting ? '상신 중…' : '결재 상신'}
            </Button>
          </div>
        </form>
      </StandardModal>

      <UserPicker
        isOpen={isPickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(user) => {
          validation.clearError('aprvrId');
          setApprover(user);
        }}
        title="결재자 검색 및 선택"
      />
    </>
  );
}
