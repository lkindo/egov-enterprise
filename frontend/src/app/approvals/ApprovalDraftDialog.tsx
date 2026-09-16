'use client';

import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ArrowDown, ArrowUp, Plus, RefreshCcw, UserRound, X } from 'lucide-react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { UserPicker } from '@/app/components/ui/user-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { ApprovalDraftRequestSchema, ApprovalStageRequestSchema } from '@/types/generated-zod';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import type { ApprovalStageRequest, InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import { approvalMutationOptions, approvalQueryOptions } from '@/queries/approval-query-options';

const LABELS = { taskSeCd: '업무 구분', docTtl: '제목', docCn: '본문', reqYmd: '신청일', stages: '결재선' };
const contentSchema = ApprovalDraftRequestSchema.pick({ taskSeCd: true, docTtl: true, docCn: true, reqYmd: true }).extend({
  taskSeCd: z.string().trim().min(1, '업무 구분을 선택해 주세요.').max(12),
  docTtl: z.string().trim().min(1, '제목을 입력해 주세요.').max(256, '제목은 256자 이내로 입력해 주세요.'),
  docCn: z.string().max(4000, '본문은 4000자 이내로 입력해 주세요.'),
  reqYmd: z.string().regex(/^\d{8}$/, '신청일을 확인해 주세요.'),
});
const stageSchema = ApprovalStageRequestSchema.extend({
  kind: z.enum(['APPROVAL', 'AGREEMENT']),
  approverIds: z.array(z.string().trim().min(1).max(20)).min(1, '이 단계의 결재자를 선택해 주세요.').max(10, '한 단계에는 최대 10명을 지정할 수 있습니다.'),
});
const draftSchema = ApprovalDraftRequestSchema.extend({ ...contentSchema.shape,
  stages: z.array(stageSchema).min(1, '결재 단계를 추가해 주세요.').max(10, '결재는 최대 10단계입니다.'),
}).superRefine((request, context) => {
  const ids = request.stages.flatMap(stage => stage.approverIds);
  if (ids.length > 50) context.addIssue({ code: 'custom', path: ['stages'], message: '전체 결재자는 최대 50명입니다.' });
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', path: ['stages'], message: '같은 사람을 결재선에 중복 지정할 수 없습니다.' });
});

// 화면 편집 상태만 소유한다. API 요청과 응답은 생성 계약을 참조한다.
type StageEditor = { key: number; kind: ApprovalStageRequest['kind']; users: UserSearchResult[] };
interface ApprovalDraftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (ifmlAtrzSn: number) => void;
  resubmission?: InformalSanctionDto;
}

export function ApprovalDraftDialog({ isOpen, onClose, onCreated, resubmission }: ApprovalDraftDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [taskSeCd, setTaskSeCd] = useState(resubmission?.taskSeCd ?? '');
  const [docTtl, setDocTtl] = useState(resubmission?.docTtl ?? '');
  const [docCn, setDocCn] = useState(resubmission?.docCn ?? '');
  const [reqYmd, setReqYmd] = useState(() => getTodayYmd());
  const [stages, setStages] = useState<StageEditor[]>(() => {
    if (resubmission?.stages?.length) return resubmission.stages.map((stage, index) => {
      const kind = stage.kind;
      if (kind !== 'APPROVAL' && kind !== 'AGREEMENT') throw new Error('결재 단계 유형을 확인할 수 없습니다. 문서 상세를 다시 불러와 주세요.');
      return { key: index, kind, users: (stage.approvers ?? []).map(person => ({ esntlId: person.userId, userNm: person.userNm })) };
    });
    return [{ key: 0, kind: 'APPROVAL', users: [] }];
  });
  const nextKey = useRef(stages.length);
  const [pickerStage, setPickerStage] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [serverError, setServerError] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [latestDocument, setLatestDocument] = useState<InformalSanctionDto>();
  const [expectedVersion, setExpectedVersion] = useState(resubmission?.version);
  const [refreshing, setRefreshing] = useState(false);
  const [edited, setEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pendingRef = useRef(false);
  const submittedRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickerButtons = useRef(new Map<number, HTMLButtonElement>());
  const stageHeadings = useRef(new Map<number, HTMLHeadingElement>());
  const content = { taskSeCd, docTtl, docCn, reqYmd };
  const values = { ...content, stages: stages.map(stage => ({ kind: stage.kind, approverIds: stage.users.map(person => person.esntlId ?? '') })) };
  const stageLabels = Object.fromEntries(stages.map((_, index) => [`stages.${index}.approverIds`, `${index + 1}단계 결재자`]));
  const stageFocus = Object.fromEntries(stages.map((stage, index) => [`stages.${index}.approverIds`, () => pickerButtons.current.get(stage.key) ?? null]));
  const contentValidation = useManualFormValidation(contentSchema, { form: () => formRef.current, labels: LABELS });
  const draftValidation = useManualFormValidation(draftSchema, {
    form: () => formRef.current, labels: { ...LABELS, ...stageLabels },
    focusTargets: { ...stageFocus, stages: () => pickerButtons.current.get(stages[0]?.key) ?? null },
  });
  const validation = step === 0 ? contentValidation : draftValidation;
  const close = useDirtyCloseGuard(edited, onClose);
  useUnsavedChanges(() => ({ dirty: edited && !submittedRef.current, pending: (pendingRef.current || refreshing) && !submittedRef.current }));
  const taskTypes = useQuery({ ...approvalQueryOptions.taskTypes(), enabled: isOpen });
  const createMutation = useMutation(approvalMutationOptions.create(queryClient));
  const resubmitMutation = useMutation(approvalMutationOptions.resubmit(queryClient));
  const taskOptions = useMemo(() => (taskTypes.data ?? []).filter(code => code.useYn === 'Y' && code.dtlCd), [taskTypes.data]);
  const hasTaskTypes = taskOptions.length > 0;
  const totalApprovers = stages.reduce((count, stage) => count + stage.users.length, 0);
  const touch = () => { setEdited(true); if (!needsReview) setServerError(''); };
  const focusAfterRender = (target: () => HTMLElement | null | undefined) => {
    const origin = document.activeElement;
    requestAnimationFrame(() => {
      // 피커 닫힘과 DOM 갱신을 기다리는 동안 사용자가 옮긴 초점을 빼앗지 않는다.
      if (document.activeElement === origin || document.activeElement === document.body) target()?.focus();
    });
  };
  const changeStep = (next: number) => {
    setStep(next);
    focusAfterRender(() => headingRef.current);
  };
  const updateStage = (key: number, update: (stage: StageEditor) => StageEditor) => {
    touch(); draftValidation.setFormErrors({}, false);
    setStages(current => current.map(stage => stage.key === key ? update(stage) : stage));
  };
  const moveStage = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= stages.length || submitting) return;
    const key = stages[index].key;
    touch(); draftValidation.setFormErrors({}, false);
    setStages(current => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    setNotice(`${index + 1}단계를 ${destination + 1}단계로 이동했습니다.`);
    focusAfterRender(() => stageHeadings.current.get(key));
  };
  const removeStage = (index: number) => {
    if (stages.length <= 1 || submitting) return;
    const nextFocusKey = stages[index === stages.length - 1 ? index - 1 : index + 1].key;
    touch(); draftValidation.setFormErrors({}, false);
    setStages(current => current.filter(stage => stage.key !== stages[index].key));
    setNotice(`${index + 1}단계를 삭제했습니다. 남은 결재 순서를 확인해 주세요.`);
    focusAfterRender(() => stageHeadings.current.get(nextFocusKey));
  };
  const validateStages = () => {
    const ownId = user?.esntlId;
    if (ownId && values.stages.some(stage => stage.approverIds.includes(ownId))) {
      draftValidation.setFormErrors({ stages: '자신을 결재자로 지정할 수 없습니다.' });
      return null;
    }
    return draftValidation.validate(values);
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRef.current || !hasTaskTypes || needsReview) return;
    if (step === 0) { if (contentValidation.validate(content)) changeStep(1); return; }
    const request = validateStages();
    if (!request) return;
    if (step === 1) { changeStep(2); return; }
    pendingRef.current = true; setSubmitting(true); setServerError('');
    try {
      let id: number;
      if (resubmission) {
        const originalId = resubmission.ifmlAtrzSn;
        const version = expectedVersion;
        if (originalId === undefined || version === undefined) {
          setNeedsReview(true);
          setServerError('현재 문서 번호와 버전을 확인할 수 없습니다. 입력은 유지됩니다. 최신 문서를 확인해 주세요.');
          return;
        }
        id = await resubmitMutation.mutateAsync({ ifmlAtrzSn: originalId, request: { ...request, version } });
      } else id = await createMutation.mutateAsync(request);
      setEdited(false);
      submittedRef.current = true;
      toast(resubmission ? '수정한 문서를 새 차수로 재상신했습니다.' : '결재를 상신했습니다. 결재 진행 상태는 결재함에서 확인할 수 있습니다.', 'success');
      onCreated(id); onClose();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) {
        const isContentError = Object.keys(fieldErrors).some(key => key in LABELS && key !== 'stages');
        if (isContentError) { setStep(0); contentValidation.setFormErrors(fieldErrors); }
        else { setStep(1); draftValidation.setFormErrors(fieldErrors); }
      }
      const conflict = typeof error === 'object' && error !== null && 'response' in error
        && (error as { response?: { status?: number } }).response?.status === 409;
      if (conflict) setNeedsReview(true);
      setServerError(conflict ? '문서가 다른 곳에서 변경되었습니다. 입력은 유지됩니다. 최신 문서를 확인한 뒤 다시 상신해 주세요.'
        : extractErrorMessage(error, '상신하지 못했습니다. 입력한 내용은 유지됩니다. 다시 시도해 주세요.'));
    } finally { pendingRef.current = false; setSubmitting(false); }
  };
  const fieldError = (name: string) => validation.errors[name]
    ? <p {...validation.messageProps(name)} className="text-sm text-destructive-emphasis" /> : null;
  const refreshVersion = async () => {
    if (resubmission?.ifmlAtrzSn === undefined || refreshing) return;
    setRefreshing(true);
    try {
      const latest = await queryClient.fetchQuery(approvalQueryOptions.detail(resubmission.ifmlAtrzSn));
      setLatestDocument(latest);
      if (!latest.canResubmit) {
        setServerError('최신 상태에서는 재상신할 수 없습니다. 입력은 유지됩니다. 결재함에서 처리 상태를 확인해 주세요.');
        return;
      }
      setExpectedVersion(latest.version);
      setServerError('최신 문서를 불러왔습니다. 아래 내용과 작성 중인 내용을 비교하고 결재선을 다시 확인해 주세요. 입력은 유지됩니다.');
      setNeedsReview(false);
      changeStep(1);
    } catch { setServerError('최신 문서를 불러오지 못했습니다. 입력은 유지됩니다. 다시 시도해 주세요.'); }
    finally { setRefreshing(false); }
  };

  return <>
    <StandardModal isOpen={isOpen} onClose={close} title={resubmission ? '결재 재상신' : '새 결재 기안'} maxWidth="2xl" closeDisabled={submitting}>
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="결재 기안 폼">
        <ol aria-label="기안 작성 단계" className="flex flex-wrap gap-3 text-sm">
          {['내용 작성', '결재선', '최종 확인'].map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={step === index ? 'font-bold text-primary' : 'text-muted-foreground'}>{index + 1}. {label}{index < step ? ' · 완료' : ''}</li>)}
        </ol>
        <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-foreground focus-visible:outline-ring">{['내용 작성', '결재선 지정', '상신 전 최종 확인'][step]}</h2>
        <FormErrorSummary errors={validation.errors} labels={{ ...LABELS, ...stageLabels }} onNavigate={validation.focusError} />
        {serverError && <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis"><p>{serverError}</p>{needsReview && resubmission && <Button type="button" variant="outline" disabled={refreshing} onClick={() => { void refreshVersion(); }}>{refreshing ? '불러오는 중…' : '최신 문서 확인'}</Button>}</div>}
        {latestDocument && <details className="rounded-md border border-border p-3 text-sm"><summary>서버의 최신 문서 · {latestDocument.atrzCycl}차 · {latestDocument.docTtl}</summary><p className="mt-2 whitespace-pre-wrap break-words">{latestDocument.docCn || '작성한 본문이 없습니다.'}</p><p className="mt-2">결재선: {(latestDocument.stages ?? []).map(stage => `${stage.order}단계 ${stage.kind === 'AGREEMENT' ? '합의' : '결재'}: ${(stage.approvers ?? []).map(person => person.userNm || person.userId).join(', ')}`).join(' → ')}</p></details>}
        <fieldset disabled={submitting} className="min-w-0 space-y-5">
          {step === 0 && <>
            <div className="space-y-2"><label htmlFor="approval-draft-title" className="text-sm font-semibold">제목 (필수)</label><Input id="approval-draft-title" {...contentValidation.fieldProps('docTtl')} value={docTtl} maxLength={256} onChange={event => { touch(); contentValidation.clearError('docTtl'); setDocTtl(event.target.value); }} placeholder="결재할 내용을 한 문장으로 적어 주세요" />{fieldError('docTtl')}</div>
            <div className="space-y-2"><label htmlFor="approval-draft-content" className="text-sm font-semibold">본문 (선택)</label><textarea id="approval-draft-content" {...contentValidation.fieldProps('docCn')} value={docCn} maxLength={4000} rows={6} onChange={event => { touch(); contentValidation.clearError('docCn'); setDocCn(event.target.value); }} className="w-full rounded-md border border-border bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-ring" /><p className="text-xs text-muted-foreground">검토에 필요한 배경과 요청 사항을 적어 주세요. {docCn.length}/4000자</p>{fieldError('docCn')}</div>
            <div className="space-y-2">
              <label htmlFor="approval-draft-task-type" className="text-sm font-semibold">업무 구분 (필수)</label>
              {taskTypes.isLoading ? <p role="status" className="text-sm text-muted-foreground">업무 구분을 불러오는 중입니다.</p>
                : taskTypes.isError ? <div role="alert" className="space-y-2"><p>업무 구분을 불러오지 못했습니다.</p><Button type="button" variant="outline" onClick={() => { void taskTypes.refetch(); }}><RefreshCcw aria-hidden="true" /> 다시 시도</Button></div>
                : !hasTaskTypes ? <div role="alert" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><p>등록된 업무 구분이 없어 결재를 올릴 수 없습니다.</p><p className="mt-1 text-muted-foreground">관리자에게 업무 구분 등록을 요청해 주세요.</p></div>
                : <Select value={taskSeCd} onValueChange={value => { touch(); contentValidation.clearError('taskSeCd'); setTaskSeCd(value); }}><SelectTrigger id="approval-draft-task-type" {...contentValidation.fieldProps('taskSeCd')} className="w-full"><SelectValue placeholder="업무 구분을 선택하세요" /></SelectTrigger><SelectContent>{taskOptions.map(code => <SelectItem key={code.dtlCd} value={code.dtlCd}>{code.dtlCdNm || code.dtlCd}</SelectItem>)}</SelectContent></Select>}
              {fieldError('taskSeCd')}
            </div>
            <div className="space-y-2"><label htmlFor="approval-draft-req-ymd" className="text-sm font-semibold">신청일</label><Input id="approval-draft-req-ymd" {...contentValidation.fieldProps('reqYmd')} type="date" value={reqYmd.length === 8 ? `${reqYmd.slice(0, 4)}-${reqYmd.slice(4, 6)}-${reqYmd.slice(6, 8)}` : ''} onChange={event => { touch(); contentValidation.clearError('reqYmd'); setReqYmd(event.target.value.replace(/-/g, '')); }} className="max-w-xs" />{fieldError('reqYmd')}</div>
          </>}
          {step === 1 && <>
            {resubmission && <p className="rounded-md bg-muted p-3 text-sm">이전 결재선을 가져왔습니다. 결재자와 순서를 다시 확인해 주세요. 이전 차수는 이력에 보존됩니다.</p>}
            <p id="approval-stage-help" className="text-sm text-muted-foreground">앞 단계의 모든 사람이 승인해야 다음 단계로 넘어갑니다. 합의 단계도 전원 동의가 필요합니다. 최대 10단계, 단계별 10명, 전체 50명이며 자기 결재와 중복 지정은 할 수 없습니다.</p>
            <ol aria-label="결재선 단계" className="space-y-3">
              {stages.map((stage, index) => <li key={stage.key} className="space-y-3 rounded-md border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 ref={node => { if (node) stageHeadings.current.set(stage.key, node); else stageHeadings.current.delete(stage.key); }} tabIndex={-1} className="font-semibold focus-visible:outline-2 focus-visible:outline-ring">{index + 1}단계 · {stage.kind === 'AGREEMENT' ? '합의' : '결재'}</h3>
                  <div className="flex gap-1"><Button type="button" size="icon" variant="ghost" aria-label={`${index + 1}단계 위로 이동`} disabled={index === 0} onClick={() => moveStage(index, -1)}><ArrowUp aria-hidden="true" /></Button><Button type="button" size="icon" variant="ghost" aria-label={`${index + 1}단계 아래로 이동`} disabled={index === stages.length - 1} onClick={() => moveStage(index, 1)}><ArrowDown aria-hidden="true" /></Button><Button type="button" size="icon" variant="ghost" aria-label={`${index + 1}단계 삭제`} disabled={stages.length === 1} onClick={() => removeStage(index)}><X aria-hidden="true" /></Button></div>
                </div>
                <div className="space-y-1"><label htmlFor={`approval-stage-kind-${stage.key}`} className="text-sm">단계 유형</label><select id={`approval-stage-kind-${stage.key}`} value={stage.kind} onChange={event => updateStage(stage.key, current => ({ ...current, kind: event.target.value as ApprovalStageRequest['kind'] }))} className="block w-full rounded-md border border-border bg-background p-2 text-sm"><option value="APPROVAL">결재 · 전원 승인</option><option value="AGREEMENT">합의 · 전원 동의</option></select></div>
                {stage.users.length > 0 ? <ul aria-label={`${index + 1}단계 결재자`} className="space-y-1">{stage.users.map(person => <li key={person.esntlId} className="flex items-center justify-between gap-2 text-sm"><span>{person.userNm || person.esntlId}{person.deptNm ? ` · ${person.deptNm}` : ''}</span><Button type="button" variant="ghost" size="sm" aria-label={`${person.userNm || person.esntlId} 결재선에서 제외`} onClick={() => updateStage(stage.key, current => ({ ...current, users: current.users.filter(item => item.esntlId !== person.esntlId) }))}>제외</Button></li>)}</ul> : <p className="text-sm text-muted-foreground">아직 결재자를 선택하지 않았습니다.</p>}
                <Button ref={node => { if (node) pickerButtons.current.set(stage.key, node); else pickerButtons.current.delete(stage.key); }} type="button" variant="outline" {...draftValidation.fieldProps(`stages.${index}.approverIds`)} aria-describedby={[draftValidation.fieldProps(`stages.${index}.approverIds`)['aria-describedby'], 'approval-stage-help'].filter(Boolean).join(' ')} disabled={stage.users.length >= 10 || totalApprovers >= 50} onClick={() => { setNotice(''); setPickerStage(stage.key); }}><UserRound aria-hidden="true" />{stage.users.length ? `${index + 1}단계 결재자 추가` : `${index + 1}단계 결재자 선택`}</Button>
                {fieldError(`stages.${index}.approverIds`)}
              </li>)}
            </ol>
            {fieldError('stages')}
            <Button type="button" variant="outline" disabled={stages.length >= 10 || totalApprovers >= 50} onClick={() => { touch(); const key = nextKey.current++; setStages(current => [...current, { key, kind: 'APPROVAL', users: [] }]); focusAfterRender(() => stageHeadings.current.get(key)); }}><Plus aria-hidden="true" /> 다음 단계 추가</Button>
            <p className="text-sm text-muted-foreground">{stages.length}/10단계 · {totalApprovers}/50명</p><p role="status" aria-live="polite" className="text-sm text-foreground">{notice}</p>
          </>}
          {step === 2 && <>
            <dl className="space-y-3 rounded-md border border-border p-4"><div><dt className="text-sm text-muted-foreground">제목</dt><dd className="break-words font-semibold">{docTtl}</dd></div><div><dt className="text-sm text-muted-foreground">업무 구분</dt><dd>{taskOptions.find(code => code.dtlCd === taskSeCd)?.dtlCdNm || taskSeCd}</dd></div><div><dt className="text-sm text-muted-foreground">본문</dt><dd className="whitespace-pre-wrap break-words text-sm">{docCn || '작성한 본문이 없습니다.'}</dd></div></dl>
            <ol aria-label="상신 결재선 미리보기" className="space-y-2">{stages.map((stage, index) => <li key={stage.key} className="rounded-md border border-border p-3 text-sm"><p className="font-semibold">{index + 1}단계 · {stage.kind === 'AGREEMENT' ? '합의' : '결재'} · 전원 {stage.kind === 'AGREEMENT' ? '동의' : '승인'} ({stage.users.length}명)</p><p className="mt-1 break-words">{stage.users.map(person => person.userNm || person.esntlId).join(', ')}</p></li>)}</ol>
            <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">각 단계의 전원이 승인해야 다음 단계가 시작됩니다. 누구든 한 명이 반려하면 문서 전체가 반려되어 남은 결재는 종료됩니다.</p>
          </>}
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4"><Button type="button" variant="ghost" onClick={close}>취소</Button>{step > 0 && <Button type="button" variant="outline" onClick={() => changeStep(step - 1)}>이전</Button>}<Button type="submit" disabled={!hasTaskTypes || submitting || needsReview} aria-busy={submitting || undefined}>{submitting ? '상신 중…' : step === 2 ? resubmission ? '새 차수로 재상신' : '결재 상신' : '다음'}</Button></div>
        </fieldset>
      </form>
    </StandardModal>
    <UserPicker isOpen={pickerStage !== null} onClose={() => { const key = pickerStage; setPickerStage(null); focusAfterRender(() => key !== null ? pickerButtons.current.get(key) : null); }} title="결재자 검색 및 선택" onSelect={person => {
      if (!person.esntlId) { setNotice('사용자 식별자를 확인할 수 없어 추가하지 않았습니다.'); return; }
      if (person.esntlId === user?.esntlId) { setNotice('자신을 결재자로 지정할 수 없습니다.'); return; }
      if (stages.some(stage => stage.users.some(item => item.esntlId === person.esntlId))) { setNotice('이미 결재선에 지정된 사람입니다. 다른 사람을 선택해 주세요.'); return; }
      const target = stages.find(stage => stage.key === pickerStage);
      if (!target || target.users.length >= 10 || totalApprovers >= 50) { setNotice('결재자 지정 한도를 확인해 주세요.'); return; }
      updateStage(target.key, current => ({ ...current, users: [...current.users, person] }));
      setNotice(`${person.userNm || '선택한 사용자'}를 ${stages.indexOf(target) + 1}단계에 추가했습니다.`);
    }} />
  </>;
}
