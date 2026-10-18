'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ChevronDown, ChevronUp, History, ListChecks, RefreshCcw, Save } from 'lucide-react';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { AbsenceBadge } from '@/app/components/ui/absence-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { ApprovalSavedLineRequestSchema } from '@/types/generated-zod';
import { INELIGIBLE_REASONS } from './ApproverInlinePicker';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import type {
  ApprovalReferee,
  ApprovalSavedLine,
  ApprovalSavedLineSummary,
  ApprovalStageRequest,
  ApprovalTemporaryDraftSummary,
  ApproverProfile,
  InformalSanctionDto,
} from '@/services/business/user/approval/ApprovalUserService';
import type { components } from '@/types/generated-api';
import { approvalKeys, approvalMutationOptions, approvalQueryOptions } from '@/queries/approval-query-options';

/** 한 사람이 둘 수 있는 결재선 수 — 서버(ApprovalSavedLineService.MAX_LINES)와 같은 값이다. */
export const SAVED_LINE_LIMIT = 20;

const nameSchema = ApprovalSavedLineRequestSchema.pick({ aplnNm: true }).extend({
  aplnNm: z.string().trim().min(1, '결재선 이름을 입력해 주세요.').max(200, '결재선 이름은 200자 이내로 입력해 주세요.'),
});

/**
 * 서버 오류 응답의 상태와 오류 코드. 409 는 버전 충돌(C013)·상한(C014)·같은 이름(C008)이 같은 상태를 쓰므로 코드로 가른다 —
 * 상태만 보면 상한에 걸린 새 기안이 '다른 곳에서 바뀌었다' 는 안내에 갇힌다.
 */
export function responseError(error: unknown): { status?: number; code?: string } {
  if (typeof error !== 'object' || error === null || !('response' in error)) return {};
  const response = (error as { response?: { status?: unknown; data?: { code?: unknown } } }).response;
  return {
    status: typeof response?.status === 'number' ? response.status : undefined,
    code: typeof response?.data?.code === 'string' ? response.data.code : undefined,
  };
}

interface ApprovalSavedLinesPanelProps {
  /** 지금 결재선 편집기의 단계. 결재자가 없는 단계가 하나라도 있으면 저장하지 않는다(서버도 받지 않는다). */
  stages: readonly ApprovalStageRequest[];
  /**
   * 결재자가 없는 단계(편집기의 0부터 센 순서)가 있어 저장을 멈췄다. 기안 창이 상신과 같은 자리(그 단계의 결재자 칸)에 오류를 두고
   * 첫 칸으로 옮긴다 — 빈 단계를 빼고 저장하면 서버가 거부 문구에 매기는 단계 번호가 편집기의 번호와 어긋난다.
   */
  onEmptyStages: (indexes: readonly number[]) => void;
  /** 기안 창이 상신·임시저장 중이면 잠근다. */
  disabled: boolean;
  /** 불러온 결재선을 편집기에 넣는다. 지금 결재자로 지정할 수 있는 사람만 온다 — 빠진 사람 수는 line.droppedApproverCount 다. */
  onApply: (line: ApprovalSavedLine) => void;
  /** 결재선 단계의 상태 문구(role=status)에 알린다. */
  onNotice: (message: string) => void;
}

/**
 * 나의 결재선(2026-10-16 결재 동선 개선 D2, DEC-OPS-328). 기안 창의 결재선 단계에 둔다.
 *
 * <p>'나의 결재선 ▾' 를 펼치면 이름을 붙여 저장해 둔 결재선을 가져오거나 지운다. '이 결재선 저장' 은 지금 결재선을 이름을 붙여
 * 서버에 저장한다 — 한 사람이 20개까지, 같은 이름은 둘 수 없으며 같은 이름으로 저장하면 묻고 그 결재선을 바꾼다.
 * 저장할 때와 불러올 때 모두 서버가 결재자 자격(본인 아님·사용 중·결재 권한)을 지금 기준으로 다시 판정한다. 불러올 때 자격을 잃은
 * 사람은 이름 없이 빠지고 그 수만 온다 — 화면은 그 사실을 말한다. 개인 결재선만 둔다(공용 결재선은 범위 밖).
 */
export function ApprovalSavedLinesPanel({ stages, disabled, onApply, onNotice, onEmptyStages }: ApprovalSavedLinesPanelProps) {
  const queryClient = useQueryClient();
  // 확인 대화 함수. 이름을 `confirm` 으로 두지 않는다 — 쓰기 권한 census(축 3)가 이 파일이 import 하는 결재 쿼리 모듈의
  // `confirm`(승인·반려, APPROVAL_APPROVE)을 이름으로 맞춰, 승인하지 않는 화면을 승인 권한이 필요한 화면으로 센다(기안 창과 같다).
  const askConfirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingSn, setLoadingSn] = useState<number | null>(null);
  const [deletingSn, setDeletingSn] = useState<number | null>(null);
  const pendingRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const savedLines = useQuery(approvalQueryOptions.savedLines());
  const saveMutation = useMutation(approvalMutationOptions.saveSavedLine(queryClient));
  const deleteMutation = useMutation(approvalMutationOptions.deleteSavedLine(queryClient));
  const validation = useManualFormValidation(nameSchema, {
    labels: { aplnNm: '결재선 이름' },
    focusTargets: { aplnNm: () => nameRef.current },
  });
  const lines = savedLines.data ?? [];
  const busy = disabled || saving || loadingSn !== null || deletingSn !== null;

  /** 결재선 불러오기. 지금 자격으로 판정한 결과를 서버에서 다시 읽는다 — 목록을 읽은 뒤 자격을 잃은 사람을 넣지 않는다. */
  const handleApplyLine = async (summary: ApprovalSavedLineSummary) => {
    const savedLineSn = summary.savedLineSn;
    if (typeof savedLineSn !== 'number' || pendingRef.current) return;
    pendingRef.current = true;
    setLoadingSn(savedLineSn); setServerError('');
    try {
      const line = await queryClient.fetchQuery(approvalQueryOptions.savedLine(savedLineSn));
      if ((line.stages ?? []).length === 0) {
        onNotice(`‘${summary.aplnNm}’ 결재선에 지금 결재자로 지정할 수 있는 사람이 없어 가져오지 않았습니다. 사용 중이 아니거나 결재 권한을 잃은 ${line.droppedApproverCount ?? 0}명이 빠졌습니다.`);
        return;
      }
      onApply(line);
      setOpen(false);
      requestAnimationFrame(() => toggleRef.current?.focus());
    } catch (error: unknown) {
      if (responseError(error).status === 404) {
        setServerError(`‘${summary.aplnNm}’ 결재선을 찾을 수 없습니다. 다른 곳에서 지웠을 수 있습니다. 목록을 다시 불러왔습니다.`);
        void queryClient.invalidateQueries({ queryKey: approvalKeys.savedLines() });
      } else setServerError(extractErrorMessage(error, '결재선을 불러오지 못했습니다. 다시 시도해 주세요.'));
    } finally { pendingRef.current = false; setLoadingSn(null); }
  };

  /** 결재선 삭제. 확인을 받고 한 번만 지운다. 작성 중인 결재선은 그대로다. */
  const handleDeleteLine = async (summary: ApprovalSavedLineSummary) => {
    const savedLineSn = summary.savedLineSn;
    if (typeof savedLineSn !== 'number' || pendingRef.current) return;
    pendingRef.current = true;
    try {
      const ok = await askConfirm({
        title: '나의 결재선 삭제',
        message: `‘${summary.aplnNm}’ 결재선을 지웁니다. 지운 결재선은 되살릴 수 없습니다. 지금 작성 중인 결재선은 그대로 남습니다.`,
        confirmText: '결재선 삭제',
        variant: 'destructive',
      });
      if (!ok) return;
      setDeletingSn(savedLineSn); setServerError('');
      await deleteMutation.mutateAsync(savedLineSn);
      onNotice(`‘${summary.aplnNm}’ 결재선을 지웠습니다.`);
    } catch (error: unknown) {
      setServerError(responseError(error).status === 404
        ? `‘${summary.aplnNm}’ 결재선을 찾을 수 없습니다. 이미 지웠을 수 있습니다. 목록을 다시 불러왔습니다.`
        : extractErrorMessage(error, '결재선을 지우지 못했습니다. 다시 시도해 주세요.'));
      void queryClient.invalidateQueries({ queryKey: approvalKeys.savedLines() });
    } finally { pendingRef.current = false; setDeletingSn(null); }
  };

  /**
   * '이 결재선 저장'. 결재자가 없는 단계가 있으면 저장하지 않고 그 단계를 가리킨다(상신과 같다). 같은 이름의 결재선이 있으면 바꿀지
   * 묻고 그 결재선을 바꾼다. 자격 없는 결재자가 있으면 서버가 단계 번호를 밝혀 거부한다(사전 확인과 같은 판정) — 단계를 빼지 않고
   * 보내므로 그 번호가 편집기의 번호와 같다.
   */
  const handleSaveLine = async () => {
    if (pendingRef.current) return;
    const request = validation.validate({ aplnNm: name });
    if (!request) return;
    if (stages.length === 0) {
      validation.setFormErrors({ aplnNm: '결재자를 지정한 단계가 없어 저장할 수 없습니다. 결재자를 먼저 지정해 주세요.' });
      return;
    }
    const emptyStages = stages.flatMap((stage, index) => (stage.approverIds.length === 0 ? [index] : []));
    if (emptyStages.length > 0) {
      onEmptyStages(emptyStages);
      return;
    }
    const existing = lines.find(line => line.aplnNm === request.aplnNm);
    if (!existing && savedLines.isSuccess && lines.length >= SAVED_LINE_LIMIT) {
      setServerError(`나의 결재선은 ${SAVED_LINE_LIMIT}개까지 저장할 수 있습니다. ‘나의 결재선’ 목록에서 쓰지 않는 결재선을 지운 뒤 다시 저장해 주세요.`);
      return;
    }
    pendingRef.current = true;
    try {
      if (existing && !(await askConfirm({
        title: '나의 결재선 바꾸기',
        message: `‘${existing.aplnNm}’ 결재선이 이미 있습니다. 그 결재선을 지금 결재선으로 바꿉니다.`,
        confirmText: '지금 결재선으로 바꾸기',
        cancelText: '다른 이름 쓰기',
      }))) {
        requestAnimationFrame(() => nameRef.current?.focus());
        return;
      }
      setSaving(true); setServerError('');
      await saveMutation.mutateAsync({
        savedLineSn: existing?.savedLineSn,
        request: { aplnNm: request.aplnNm, stages: stages.map(stage => ({ kind: stage.kind, approverIds: [...stage.approverIds] })) },
      });
      onNotice(`‘${request.aplnNm}’ 결재선을 ${existing ? '지금 결재선으로 바꿨습니다' : '저장했습니다'}.`);
      setName(''); setSaveOpen(false);
      requestAnimationFrame(() => toggleRef.current?.focus());
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      const { status, code } = responseError(error);
      if (fieldErrors?.aplnNm) validation.setFormErrors({ aplnNm: fieldErrors.aplnNm });
      else if (status === 409 && code === 'C014') {
        setServerError(`나의 결재선은 ${SAVED_LINE_LIMIT}개까지 저장할 수 있습니다. ‘나의 결재선’ 목록에서 쓰지 않는 결재선을 지운 뒤 다시 저장해 주세요.`);
      } else if (status === 409 && code === 'C008') {
        setServerError('같은 이름의 결재선이 방금 저장됐습니다. 목록을 다시 불러왔습니다. 다시 저장하면 그 결재선을 바꿀지 묻습니다.');
      } else if (status === 404) {
        setServerError('바꾸려던 결재선을 찾을 수 없습니다. 다른 곳에서 지웠을 수 있습니다. 목록을 다시 불러왔습니다. 다시 저장하면 새로 저장합니다.');
      } else setServerError(extractErrorMessage(error, '결재선을 저장하지 못했습니다. 작성 중인 결재선은 그대로입니다. 다시 시도해 주세요.'));
      void queryClient.invalidateQueries({ queryKey: approvalKeys.savedLines() });
    } finally { pendingRef.current = false; setSaving(false); }
  };

  const countLabel = savedLines.isSuccess ? ` (${lines.length}/${SAVED_LINE_LIMIT})` : '';
  return (
    <section aria-labelledby="approval-saved-lines-heading" className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="approval-saved-lines-heading" className="flex items-center gap-2 text-sm font-semibold"><ListChecks size={14} aria-hidden="true" /> 나의 결재선</h3>
        <div className="flex flex-wrap gap-2">
          <Button ref={toggleRef} type="button" size="sm" variant="outline" aria-expanded={open} aria-controls="approval-saved-lines-list" disabled={busy && !open} onClick={() => { setServerError(''); setOpen(current => !current); }}>
            {open ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}나의 결재선{countLabel}
          </Button>
          <Button type="button" size="sm" variant="outline" aria-expanded={saveOpen} aria-controls="approval-saved-line-save" disabled={busy && !saveOpen} onClick={() => {
            setServerError(''); validation.setFormErrors({}, false);
            setSaveOpen(current => { if (!current) requestAnimationFrame(() => nameRef.current?.focus()); return !current; });
          }}><Save aria-hidden="true" />이 결재선 저장</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">자주 쓰는 결재선에 이름을 붙여 {SAVED_LINE_LIMIT}개까지 저장합니다. 저장할 때와 가져올 때 결재자로 지정할 수 있는지 다시 확인하며, 그사이 사용 중지됐거나 결재 권한을 잃은 사람은 빼고 가져옵니다.</p>
      {serverError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive-emphasis">{serverError}</p>}
      {open && <div id="approval-saved-lines-list" className="space-y-2">
        {savedLines.isError ? (
          <div role="status" className="space-y-2 text-sm">
            <p>나의 결재선을 불러오지 못했습니다. 결재선은 그대로 지정할 수 있습니다.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => { void savedLines.refetch(); }}><RefreshCcw aria-hidden="true" /> 다시 불러오기</Button>
          </div>
        ) : savedLines.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">나의 결재선을 불러오는 중입니다.</p>
        ) : lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">저장한 결재선이 없습니다. 결재선을 지정한 뒤 ‘이 결재선 저장’ 으로 저장해 두면 다음 기안에서 가져올 수 있습니다.</p>
        ) : (
          <ul aria-label="나의 결재선 목록" className="max-h-48 space-y-1 overflow-y-auto">
            {lines.map(line => <li key={line.savedLineSn} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words">{line.aplnNm} · {line.stageCount ?? 0}단계 · 결재자 {line.approverCount ?? 0}명</span>
              <span className="flex gap-1">
                <Button type="button" size="sm" variant="outline" aria-label={`‘${line.aplnNm}’ 결재선 가져오기`} disabled={busy} aria-busy={loadingSn === line.savedLineSn || undefined} onClick={() => { void handleApplyLine(line); }}>{loadingSn === line.savedLineSn ? '가져오는 중…' : '가져오기'}</Button>
                <Button type="button" size="sm" variant="ghost" aria-label={`‘${line.aplnNm}’ 결재선 삭제`} disabled={busy} aria-busy={deletingSn === line.savedLineSn || undefined} onClick={() => { void handleDeleteLine(line); }}>{deletingSn === line.savedLineSn ? '삭제 중…' : '삭제'}</Button>
              </span>
            </li>)}
          </ul>
        )}
      </div>}
      {saveOpen && <div id="approval-saved-line-save" className="space-y-2">
        <FormErrorSummary errors={validation.errors} labels={{ aplnNm: '결재선 이름' }} onNavigate={validation.focusError} />
        <label htmlFor="approval-saved-line-name" className="text-sm font-semibold">결재선 이름</label>
        <div className="flex flex-wrap gap-2">
          <Input ref={nameRef} id="approval-saved-line-name" {...validation.fieldProps('aplnNm')} value={name} maxLength={200} disabled={saving} className="min-w-0 flex-1"
            placeholder="예: 팀장 결재 → 부서 합의" onChange={event => { validation.clearError('aplnNm'); setServerError(''); setName(event.target.value); }}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void handleSaveLine(); } }} />
          <Button type="button" size="sm" disabled={busy} aria-busy={saving || undefined} onClick={() => { void handleSaveLine(); }}>{saving ? '저장 중…' : '저장'}</Button>
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => { setSaveOpen(false); setName(''); validation.setFormErrors({}, false); requestAnimationFrame(() => toggleRef.current?.focus()); }}>취소</Button>
        </div>
        {validation.errors.aplnNm && <p {...validation.messageProps('aplnNm')} className="text-sm text-destructive-emphasis" />}
        <p className="text-xs text-muted-foreground">결재자가 없는 단계가 있으면 저장하지 않습니다. 같은 이름이 있으면 그 결재선을 바꿀지 묻습니다.</p>
      </div>}
    </section>
  );
}

export const DRAFT_LABELS = { taskSeCd: '업무 구분', docTtl: '제목', docCn: '본문', reqYmd: '신청일', stages: '결재선', references: '참조자' };
/** 결재선 단계(step 1)의 칸 — 결재선과 참조자. 서버 필드 오류가 이 칸이면 내용 작성 단계로 보내지 않는다. */
export function isLineField(key: string): boolean {
  return key === 'stages' || key.startsWith('stages.') || key.startsWith('stages[') || key === 'references' || key.startsWith('references');
}
/** 결재자가 없는 단계의 오류 — 상신과 나의 결재선 저장이 같은 자리(그 단계의 결재자 칸)에 같은 문구로 둔다. */
export const EMPTY_STAGE_MESSAGE = '이 단계의 결재자를 선택해 주세요.';

// 화면 편집 상태만 소유한다. API 요청과 응답은 생성 계약을 참조한다.
export type StageEditor = { key: number; kind: ApprovalStageRequest['kind']; users: UserSearchResult[] };
export type LineSuggestion = components['schemas']['ApprovalLineSuggestionDto'];

/** 한 사람이 둘 수 있는 기안 임시저장 수 — 서버(ApprovalTemporaryDraftService.MAX_DRAFTS)와 같은 값이다. */
export const TEMPORARY_DRAFT_LIMIT = 20;
/** 한 문서의 참조자 상한 — 서버(InformalSanctionService.MAX_REFERENCES)와 같은 값이다. 문서에 누적된 서로 다른 사람 수다. */
export const REFERENCE_LIMIT = 20;
/** 이름을 받지 못한 결재자. 식별자를 이름 자리에 보이지 않는다(DEC-OPS-141·193). */
export const UNKNOWN_USER = '알 수 없는 사용자';

/** 마지막으로 고른 업무 구분 — 이 브라우저에만 사용자별로 둔다. 쓸 수 없으면 기억하지 않을 뿐이다. */
const lastTaskKey = (esntlId?: string) => `approval.lastTaskType.${esntlId ?? 'anonymous'}`;
export function readLastTask(esntlId?: string): string {
  try { return window.localStorage.getItem(lastTaskKey(esntlId)) ?? ''; } catch { return ''; }
}
export function rememberTask(esntlId: string | undefined, taskSeCd: string) {
  try { window.localStorage.setItem(lastTaskKey(esntlId), taskSeCd); } catch { /* 저장소를 못 써도 상신은 이미 끝났다. */ }
}

export function stagesFrom(document?: InformalSanctionDto): StageEditor[] {
  if (!document?.stages?.length) return [{ key: 0, kind: 'APPROVAL', users: [] }];
  return document.stages.map((stage, index) => {
    const kind = stage.kind;
    if (kind !== 'APPROVAL' && kind !== 'AGREEMENT') throw new Error('결재 단계 유형을 확인할 수 없습니다. 문서 상세를 다시 불러와 주세요.');
    return { key: index, kind, users: (stage.approvers ?? []).map(person => ({ esntlId: person.userId, userNm: person.userNm })) };
  });
}

/**
 * 재상신·복제로 가져오는 참조자(D4) — 결재선처럼 원 문서의 <b>그 차수</b>에 지정된 참조자를 가져오고, 상신 때 서버가 다시 검사한다.
 * 참조는 차수마다 기록되므로 다시 보내면 새 차수의 지정이 된다(그 차수의 최종 결과 알림을 받는다). 더 이전 차수에만 지정된
 * 사람은 앞 차수에서 이미 다시 지정하지 않은 것이라 가져오지 않는다 — 그래도 문서는 계속 읽는다.
 * 원 문서 결재선에 든 사람과 본인은 뺀다(한 사람이 같은 차수에 결재자이면서 참조자일 수 없다).
 */
export function refereesFrom(document: InformalSanctionDto | undefined, selfId: string | undefined): UserSearchResult[] {
  const lineIds = new Set((document?.stages ?? []).flatMap(stage => (stage.approvers ?? []).map(person => person.userId)));
  const cycle = document?.atrzCycl ?? 1;
  const seen = new Set<string>();
  return (document?.references ?? []).filter((person): person is ApprovalReferee & { userId: string } => {
    const id = person.userId;
    if (!id || id === selfId || lineIds.has(id) || seen.has(id) || (person.atrzCycl ?? cycle) !== cycle) return false;
    seen.add(id);
    return true;
  }).map(person => ({ esntlId: person.userId, userNm: person.userNm || UNKNOWN_USER, deptNm: person.deptNm ?? undefined }));
}

export function describeLine(line: Pick<LineSuggestion, 'stages'>): string {
  return (line.stages ?? []).map((stage, index) => `${index + 1}단계 ${stage.kind === 'AGREEMENT' ? '합의' : '결재'} ${(stage.approvers ?? []).map(person => person.userNm || person.esntlId).join(', ')}`).join(' → ');
}

/** 서버 일시(시간대 없는 서버 시각)를 yyyy-MM-dd HH:mm 으로 읽는다. 브라우저 시간대로 바꾸지 않는다. */
export function savedAtLabel(value?: string | null): string {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value ?? '');
  return match ? `${match[1]} ${match[2]}` : '';
}

export function temporaryDraftLabel(draft: { docTtl?: string | null }): string {
  return draft.docTtl?.trim() || '제목 없는 기안';
}

/**
 * 목록 행을 부를 이름. 제목이 같은 임시저장('제목 없는 기안' 여러 건 등)이 있으면 저장 시각을 붙여 가른다 — 버튼 이름과
 * 삭제 확인이 같으면 보조기술 사용자가 어느 임시저장을 지우는지 알 수 없다.
 */
export function temporaryDraftNames(drafts: readonly ApprovalTemporaryDraftSummary[]): Map<number, string> {
  const counts = new Map<string, number>();
  for (const draft of drafts) counts.set(temporaryDraftLabel(draft), (counts.get(temporaryDraftLabel(draft)) ?? 0) + 1);
  const names = new Map<number, string>();
  for (const draft of drafts) {
    if (typeof draft.temporaryDraftSn !== 'number') continue;
    const label = temporaryDraftLabel(draft);
    names.set(draft.temporaryDraftSn, (counts.get(label) ?? 0) > 1
      ? `${label} · ${savedAtLabel(draft.mdfcnDt) || '저장 시각 미확인'}`
      : label);
  }
  return names;
}

export function ApprovalLatestDocumentDetails({ latestDocument }: { latestDocument: InformalSanctionDto }) {
  return (
    <details className="rounded-md border border-border p-3 text-sm">
      <summary>서버의 최신 문서 · {latestDocument.atrzCycl}차 · {latestDocument.docTtl}</summary>
      <p className="mt-2 whitespace-pre-wrap break-words">{latestDocument.docCn || '작성한 본문이 없습니다.'}</p>
      <p className="mt-2">결재선: {(latestDocument.stages ?? []).map(stage => `${stage.order}단계 ${stage.kind === 'AGREEMENT' ? '합의' : '결재'}: ${(stage.approvers ?? []).map(person => person.userNm || person.userId).join(', ')}`).join(' → ')}</p>
      {(latestDocument.references?.length ?? 0) > 0 && <p className="mt-2">참조자: {(latestDocument.references ?? []).map(person => person.userNm || UNKNOWN_USER).join(', ')}</p>}
    </details>
  );
}

export function ApprovalLineSuggestionsSection({
  lines,
  recentApprovers,
  onApplyLine,
  onAddRecent,
}: {
  lines: readonly LineSuggestion[];
  recentApprovers: readonly ApproverProfile[];
  onApplyLine: (line: LineSuggestion) => void;
  onAddRecent: (person: ApproverProfile) => void;
}) {
  if (lines.length === 0 && recentApprovers.length === 0) return null;
  return (
    <section aria-label="결재선 제안" className="space-y-3 rounded-md border border-border p-3">
      {lines.length > 0 && <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><History size={14} aria-hidden="true" /> 내가 썼던 결재선</h3>
        <ul className="space-y-1">
          {lines.map((line, index) => <li key={`${line.taskSeCd}-${index}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 break-words">{line.taskSeNm || line.taskSeCd} · {line.useCount}회 · {describeLine(line)}</span>
            <Button type="button" size="sm" variant="outline" aria-label={`${line.taskSeNm || line.taskSeCd} 결재선 가져오기: ${describeLine(line)}`} onClick={() => onApplyLine(line)}>가져오기</Button>
          </li>)}
        </ul>
      </div>}
      {recentApprovers.length > 0 && <div className="space-y-2">
        <h3 className="text-sm font-semibold">최근 결재자 · 누르면 마지막 단계에 더합니다</h3>
        <ul className="flex flex-wrap gap-2">
          {/* [2026-10-03] 지정할 수 없는 사람은 누를 수 없는 버튼 대신 사유를 보이는 글로 둔다. 사유가 aria-label 에만
              있어 화면에는 보이지 않았고, aria-label 이 '부재 중' 표시까지 덮었다. */}
          {recentApprovers.map(person => <li key={person.esntlId}>
            {person.eligible ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onAddRecent(person)}>
                {person.userNm || person.esntlId}{person.deptNm ? ` · ${person.deptNm}` : ''}
                {person.absent ? <>{' '}<AbsenceBadge absent /></> : null}
                {' '}<span className="sr-only">결재자로 더하기</span>
              </Button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground">
                {person.userNm || person.esntlId}{person.deptNm ? ` · ${person.deptNm}` : ''}
                {person.absent ? <>{' '}<AbsenceBadge absent /></> : null}
                <span>· 지정할 수 없음({INELIGIBLE_REASONS[person.ineligibleReason ?? ''] ?? '확인 필요'})</span>
              </span>
            )}
          </li>)}
        </ul>
      </div>}
    </section>
  );
}

export function ApprovalFinalReviewStep({
  blockedMessage,
  refereeBlockedMessage,
  docTtl,
  taskLabel,
  docCn,
  reqYmd,
  stages,
  absentById,
  refereeTotal,
  referees,
  earlierReferees,
  notifies,
}: {
  blockedMessage: string;
  refereeBlockedMessage: string;
  docTtl: string;
  taskLabel: string;
  docCn: string;
  reqYmd: string;
  stages: readonly StageEditor[];
  absentById: ReadonlyMap<string | undefined, boolean>;
  refereeTotal: number;
  referees: readonly UserSearchResult[];
  earlierReferees: readonly ApprovalReferee[];
  notifies: boolean;
}) {
  return (
    <>
      {blockedMessage && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis">{blockedMessage}</p>}
      {refereeBlockedMessage && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis">{refereeBlockedMessage}</p>}
      <dl className="space-y-3 rounded-md border border-border p-4"><div><dt className="text-sm text-muted-foreground">제목</dt><dd className="break-words font-semibold">{docTtl}</dd></div><div><dt className="text-sm text-muted-foreground">업무 구분</dt><dd>{taskLabel}</dd></div><div><dt className="text-sm text-muted-foreground">본문</dt><dd className="whitespace-pre-wrap break-words text-sm">{docCn || '작성한 본문이 없습니다.'}</dd></div><div><dt className="text-sm text-muted-foreground">신청일</dt><dd>{reqYmd.length === 8 ? `${reqYmd.slice(0, 4)}-${reqYmd.slice(4, 6)}-${reqYmd.slice(6, 8)}` : '신청일 미확인'}</dd></div></dl>
      <ol aria-label="상신 결재선 미리보기" className="space-y-2">{stages.map((stage, index) => <li key={stage.key} className="rounded-md border border-border p-3 text-sm"><p className="font-semibold">{index + 1}단계 · {stage.kind === 'AGREEMENT' ? '합의' : '결재'} · 전원 {stage.kind === 'AGREEMENT' ? '동의' : '승인'} ({stage.users.length}명)</p><p className="mt-1 flex flex-wrap items-center gap-1 break-words">{stage.users.map(person => <span key={person.esntlId} className="inline-flex items-center gap-1">{person.userNm || person.esntlId}<AbsenceBadge absent={absentById.get(person.esntlId)} /></span>)}</p></li>)}</ol>
      {[...absentById.values()].some(Boolean) && <p className="text-sm text-muted-foreground">부재 중인 결재자가 있습니다. 처리가 늦어질 수 있으며, 상신한 뒤에도 그 사람을 다른 결재자로 바꿀 수 있습니다.</p>}
      {refereeTotal > 0 && <section aria-label="상신 참조자 미리보기" className="space-y-1 rounded-md border border-border p-3 text-sm">
        <p className="font-semibold">참조자 · 읽기만 함 ({refereeTotal}명)</p>
        {referees.length > 0 && <p className="flex flex-wrap items-center gap-1 break-words">이번 차수 지정: {referees.map(person => <span key={person.esntlId} className="inline-flex items-center gap-1">{person.userNm || UNKNOWN_USER}<AbsenceBadge absent={person.absent} /></span>)}</p>}
        {earlierReferees.length > 0 && <p className="break-words text-muted-foreground">계속 읽는 이전 참조자: {earlierReferees.map(person => person.userNm || UNKNOWN_USER).join(', ')}</p>}
      </section>}
      {referees.length > 0 && <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">{notifies
        ? '이번 차수에 지정한 참조자는 이 차수가 최종 승인·반려되면 알림을 받고, 이 문서에 처음 지정되는 사람은 상신할 때도 알림을 받습니다. 지정은 되돌릴 수 없으며, 참조자는 문서가 반려·회수되어도, 다음 차수에도 결재 의견과 처리 이력을 포함한 이 문서의 모든 내용을 계속 읽습니다.'
        : '지정은 되돌릴 수 없으며, 참조자는 문서가 반려·회수되어도, 다음 차수에도 결재 의견과 처리 이력을 포함한 이 문서의 모든 내용을 계속 읽습니다.'}</p>}
      <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">각 단계의 전원이 승인해야 다음 단계가 시작됩니다. 누구든 한 명이 반려하면 문서 전체가 반려되어 남은 결재는 종료됩니다.</p>
    </>
  );
}

