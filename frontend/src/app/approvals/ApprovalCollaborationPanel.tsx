'use client';

import { useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, MessageSquareReply, UserRoundCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormErrorSummary } from '@/components/ui/form';
import { UserPicker } from '@/app/components/ui/user-picker';
import { AbsenceBadge } from '@/app/components/ui/absence-badge';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { failureMessage } from '@/lib/safe-error-log';
import { toDisplayDateTime } from '@/lib/format-date';
import { ApprovalSupplementAnswerRequestSchema } from '@/types/generated-zod';
import type { InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import { approvalKeys, approvalMutationOptions } from '@/queries/approval-query-options';

const ANSWER_LABELS = { answer: '보완 답변', docCn: '고친 본문' };
// 버전은 화면이 상세에서 채운다. 사람이 입력하는 두 칸만 검증한다.
const answerSchema = ApprovalSupplementAnswerRequestSchema.pick({ answer: true, docCn: true }).extend({
  answer: ApprovalSupplementAnswerRequestSchema.shape.answer.trim().min(1, '보완 답변을 입력해 주세요.').max(4000, '답변은 4000자 이내로 입력해 주세요.'),
  docCn: ApprovalSupplementAnswerRequestSchema.shape.docCn.unwrap().max(4000, '본문은 4000자 이내로 입력해 주세요.').optional(),
});

const PROCESS_LABELS: Record<string, string> = {
  REPLACE: '결재자 변경',
  ASK: '보완 요청',
  ANSWER: '보완 답변',
  REVISE: '본문 수정',
  REMIND: '재알림',
};

function isConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'response' in error
    && (error as { response?: { status?: number } }).response?.status === 409;
}

interface ApprovalCollaborationPanelProps {
  document: InformalSanctionDto;
  /** 화면이 기능 권한으로 한 번 더 가린 결과. 서버 힌트와 함께 참이어야 버튼이 보인다. */
  canWrite: boolean;
  /** 상세가 낡았거나 다른 처리가 진행 중이면 쓰기를 막는다. */
  disabled: boolean;
}

/**
 * 진행 중인 결재를 기안자가 따라가는 도구(2026-10-03 결재 동선 개선 — 추적).
 *
 * <p>보완 요청에 답하기(본문을 함께 고칠 수 있고 앞서 한 승인은 유지된다), 차례인 결재자에게 다시 알리기(하루 한 번),
 * 아직 처리하지 않은 결재자를 다른 사람으로 바꾸기, 그리고 그 모든 처리의 기록을 한곳에 둔다.
 * 각 버튼은 서버가 내려준 힌트(canAnswerSupplement·canRemind·canReplaceApprover)로만 보인다.
 */
export function ApprovalCollaborationPanel({ document, canWrite, disabled }: ApprovalCollaborationPanelProps) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const remindMutation = useMutation(approvalMutationOptions.remind(queryClient));
  const replaceMutation = useMutation(approvalMutationOptions.replaceApprover(queryClient));
  const answerMutation = useMutation(approvalMutationOptions.answerSupplement(queryClient));
  const [answer, setAnswer] = useState('');
  const [revising, setRevising] = useState(false);
  const [docCn, setDocCn] = useState(document.docCn ?? '');
  const [answerError, setAnswerError] = useState('');
  const [remindError, setRemindError] = useState('');
  const [replaceError, setReplaceError] = useState('');
  const [replacing, setReplacing] = useState<{ userId: string; userNm: string; active: boolean } | null>(null);
  const [pendingAction, setPendingAction] = useState<'ANSWER' | 'REMIND' | 'REPLACE' | null>(null);
  const pendingActionRef = useRef(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const docCnRef = useRef<HTMLTextAreaElement>(null);
  const remindRef = useRef<HTMLButtonElement>(null);
  const manageHeadingRef = useRef<HTMLHeadingElement>(null);
  const historyHeadingRef = useRef<HTMLHeadingElement>(null);
  const supplementHeadingRef = useRef<HTMLHeadingElement>(null);
  const remindHelpId = useId();
  const answerValidation = useManualFormValidation(answerSchema, {
    labels: ANSWER_LABELS,
    focusTargets: { answer: () => answerRef.current, docCn: () => docCnRef.current },
  });

  const id = document.ifmlAtrzSn;
  const version = document.version;
  const supplement = document.openSupplement;
  const history = document.processHistory ?? [];
  const waitingApprovers = (document.stages ?? []).flatMap(stage => (stage.approvers ?? [])
    .filter(person => person.status === 'WAITING' || person.status === 'ACTIVE')
    .map(person => ({ stage: stage.order, person })));
  const canAnswer = canWrite && Boolean(document.canAnswerSupplement) && supplement !== undefined;
  const canRemind = canWrite && Boolean(document.canRemind);
  // [2026-10-03] 오늘 이미 보냈으면 서버는 canRemind 를 끄고 remindedToday 를 켠다. 종전에는 canRemind 로만 버튼을 그려
  //   보낸 순간 버튼과 '하루 한 번' 안내가 함께 사라졌다 — 막힌 버튼과 사유를 남긴다.
  const remindedToday = canWrite && Boolean(document.remindedToday);
  const showRemind = canRemind || remindedToday;
  const canReplace = canWrite && Boolean(document.canReplaceApprover);
  if (!supplement && !showRemind && !canReplace && history.length === 0) return null;

  const refreshOnConflict = (error: unknown) => {
    if (isConflict(error)) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
  };

  /**
   * 처리가 끝나면 누른 컨트롤(답변 폼·바꾼 결재자의 행)이 다시 읽은 상세에서 사라진다. 포커스가 문서 처음으로 빠지지 않게
   * 남는 곳으로 옮긴다 — 앞의 것이 없으면 다음 것. 그 사이 사용자가 다른 곳으로 옮긴 포커스는 빼앗지 않는다.
   */
  const focusStable = (...targets: Array<React.RefObject<HTMLElement | null>>) => {
    requestAnimationFrame(() => {
      const active = window.document.activeElement;
      if (active && active !== window.document.body && active.isConnected && !targets.some(target => target.current === active)) return;
      targets.map(target => target.current).find(Boolean)?.focus();
    });
  };

  const handleAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingActionRef.current || id === undefined || version === undefined) return;
    const validated = answerValidation.validate({ answer, ...(revising ? { docCn } : {}) });
    if (!validated) return;
    pendingActionRef.current = true;
    setPendingAction('ANSWER');
    setAnswerError('');
    // 본문은 실제로 바뀌었을 때만 보낸다. 알림도 보낸 것만 말한다 — 체크만 하고 고치지 않았으면 본문은 그대로다.
    const sendsBody = revising && validated.docCn !== undefined && validated.docCn !== (document.docCn ?? '');
    try {
      await answerMutation.mutateAsync({
        ifmlAtrzSn: id,
        answer: { answer: validated.answer, ...(sendsBody ? { docCn: validated.docCn } : {}), version },
      });
      setAnswer('');
      setRevising(false);
      setDocCn(document.docCn ?? '');
      toast(sendsBody
        ? '보완 답변과 고친 본문을 보냈습니다. 앞서 한 승인은 유지됩니다.'
        : revising ? '보완 답변을 보냈습니다. 본문은 고친 내용이 없어 그대로 두었습니다.' : '보완 답변을 보냈습니다.', 'success');
      focusStable(historyHeadingRef, manageHeadingRef, supplementHeadingRef);
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) answerValidation.setFormErrors(fieldErrors);
      refreshOnConflict(error);
      setAnswerError(`${failureMessage(error, '보완 답변을 보내지 못했습니다.')} 입력한 답변은 유지됩니다.`);
      toast('보완 답변을 보내지 못했습니다.', 'error');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  const handleRemind = async () => {
    if (pendingActionRef.current || id === undefined) return;
    pendingActionRef.current = true;
    setPendingAction('REMIND');
    setRemindError('');
    try {
      const notified = await remindMutation.mutateAsync({ ifmlAtrzSn: id });
      toast(`지금 차례인 ${notified}명에게 다시 알렸습니다.`, 'success');
      // 버튼은 '오늘 재알림함' 으로 남는다(aria-disabled 라 포커스를 받을 수 있다).
      focusStable(remindRef, manageHeadingRef, historyHeadingRef);
    } catch (error) {
      refreshOnConflict(error);
      setRemindError(failureMessage(error, '재알림을 보내지 못했습니다.'));
      toast('재알림을 보내지 못했습니다.', 'error');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  const handleReplace = async (to: { esntlId?: string; userNm?: string }) => {
    const from = replacing;
    setReplacing(null);
    if (!from || !to.esntlId || id === undefined || version === undefined || pendingActionRef.current) return;
    pendingActionRef.current = true;
    setPendingAction('REPLACE');
    setReplaceError('');
    try {
      // 서버는 빠지는 사람에게는 늘 알리고, 새 결재자에게는 바꾼 자리가 지금 차례일 때만 바로 알린다
      //   (아직 차례가 아니면 그 단계가 시작될 때 '결재 순서 도래' 로 알린다).
      const toNm = to.userNm || '선택한 사람';
      const ok = await confirm({
        title: '결재자 바꾸기',
        message: `${from.userNm} 대신 ${toNm}에게 이 결재를 맡깁니다. 앞서 처리한 결재는 그대로입니다. `
          + (from.active
            ? `${from.userNm}에게는 결재선에서 빠졌다고, ${toNm}에게는 지금 차례라고 알립니다.`
            : `${from.userNm}에게는 결재선에서 빠졌다고 알리고, ${toNm}에게는 그 단계 차례가 되면 알립니다.`),
        confirmText: '결재자 바꾸기',
      });
      if (!ok) return;
      await replaceMutation.mutateAsync({ ifmlAtrzSn: id, fromUserId: from.userId, toUserId: to.esntlId, version });
      toast(`결재자를 ${toNm}(으)로 바꿨습니다.`, 'success');
      focusStable(manageHeadingRef, historyHeadingRef);
    } catch (error) {
      refreshOnConflict(error);
      setReplaceError(failureMessage(error, '결재자를 바꾸지 못했습니다.'));
      toast('결재자를 바꾸지 못했습니다.', 'error');
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  const busy = disabled || pendingAction !== null;
  return (
    <>
      {supplement ? (
        <section aria-label="보완 요청" className="space-y-3 rounded-md border border-warning/40 bg-warning/10 p-4">
          <h3 ref={supplementHeadingRef} tabIndex={-1} className="flex items-center gap-2 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <MessageSquareReply size={16} aria-hidden="true" /> 보완 요청
          </h3>
          <p className="text-sm text-muted-foreground">
            {supplement.askedByNm || '결재자'}
            {supplement.askedAt ? <> · <time dateTime={supplement.askedAt}>{toDisplayDateTime(new Date(supplement.askedAt))}</time></> : null}
            {' '}· 답변을 받으면 같은 결재자가 이어서 처리합니다.
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">{supplement.question}</p>
          {canAnswer ? (
            <form onSubmit={(event) => { void handleAnswer(event); }} noValidate aria-label="보완 답변" className="space-y-3">
              <FormErrorSummary errors={answerValidation.errors} labels={ANSWER_LABELS} onNavigate={answerValidation.focusError} />
              {answerError && <p role="alert" className="text-sm text-destructive-emphasis">{answerError}</p>}
              <label htmlFor="supplement-answer" className="block text-sm font-semibold">보완 답변 (필수)</label>
              <textarea
                id="supplement-answer"
                ref={answerRef}
                {...answerValidation.fieldProps('answer')}
                value={answer}
                maxLength={4000}
                rows={3}
                disabled={busy}
                onChange={(event) => { answerValidation.clearError('answer'); setAnswer(event.target.value); }}
                className="w-full rounded-md border border-border bg-background p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
              />
              {answerValidation.errors.answer ? <p {...answerValidation.messageProps('answer')} className="text-xs font-bold text-destructive-emphasis" /> : null}
              <label htmlFor="supplement-revise" className="flex items-center gap-2 text-sm">
                <input id="supplement-revise" type="checkbox" aria-label="본문도 고치기" checked={revising} disabled={busy} onChange={(event) => {
                  // 켤 때마다 지금 문서의 본문에서 시작한다. 앞서 체크를 풀어 버린 수정이나 다른 곳에서 고치기 전 본문이
                  // 남아 있다가 '고친 본문' 으로 보내지지 않게 한다.
                  if (event.target.checked) setDocCn(document.docCn ?? '');
                  setRevising(event.target.checked);
                }} />
                본문도 고치기 (고치기 전 본문은 처리 기록에 남습니다)
              </label>
              {revising ? (
                <>
                  <label htmlFor="supplement-doc" className="block text-sm font-semibold">고친 본문</label>
                  <textarea
                    id="supplement-doc"
                    ref={docCnRef}
                    {...answerValidation.fieldProps('docCn')}
                    value={docCn}
                    maxLength={4000}
                    rows={6}
                    disabled={busy}
                    onChange={(event) => { answerValidation.clearError('docCn'); setDocCn(event.target.value); }}
                    className="w-full rounded-md border border-border bg-background p-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"
                  />
                  {answerValidation.errors.docCn ? <p {...answerValidation.messageProps('docCn')} className="text-xs font-bold text-destructive-emphasis" /> : null}
                </>
              ) : null}
              <Button type="submit" disabled={busy} aria-busy={pendingAction === 'ANSWER' || undefined}>
                {pendingAction === 'ANSWER' ? '보내는 중…' : '보완 답변 보내기'}
              </Button>
            </form>
          ) : null}
        </section>
      ) : null}

      {showRemind || canReplace ? (
        <section aria-label="결재 진행 관리" className="space-y-3 rounded-md border border-border p-4">
          <h3 ref={manageHeadingRef} tabIndex={-1} className="font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">결재 진행 관리</h3>
          {showRemind ? (
            <div className="space-y-1">
              {/* 오늘 보낸 상태는 disabled 대신 aria-disabled 로 둔다 — 보낸 직후 포커스가 이 버튼에 남고 사유를 함께 읽는다. */}
              <Button
                ref={remindRef}
                type="button"
                variant="outline"
                disabled={busy}
                aria-disabled={remindedToday || undefined}
                aria-describedby={remindHelpId}
                aria-busy={pendingAction === 'REMIND' || undefined}
                className={remindedToday ? 'cursor-not-allowed opacity-60' : undefined}
                onClick={() => { if (!remindedToday) void handleRemind(); }}
              >
                <BellRing aria-hidden="true" /> {remindedToday ? '오늘 재알림함' : '차례인 결재자에게 재알림'}
              </Button>
              <p id={remindHelpId} className="text-xs text-muted-foreground">
                {remindedToday
                  ? '오늘 이미 재알림을 보냈습니다. 재알림은 하루(한국 날짜 기준) 한 번이라 내일 다시 보낼 수 있습니다.'
                  : '재알림은 하루(한국 날짜 기준) 한 번 보낼 수 있습니다.'}
              </p>
              {remindError && <p role="alert" className="text-sm text-destructive-emphasis">{remindError}</p>}
            </div>
          ) : null}
          {canReplace && waitingApprovers.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">아직 처리하지 않은 결재자를 다른 사람으로 바꿀 수 있습니다. 부재 중인 결재자가 있을 때 쓰세요.</p>
              <ul aria-label="바꿀 수 있는 결재자" className="space-y-1">
                {waitingApprovers.map(({ stage, person }) => (
                  <li key={person.userId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      {stage}단계 · {person.userNm || person.userId}
                      <AbsenceBadge absent={person.absent} />
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      aria-busy={pendingAction === 'REPLACE' || undefined}
                      aria-label={`${person.userNm || person.userId} 결재자 바꾸기`}
                      onClick={() => setReplacing({ userId: person.userId ?? '', userNm: person.userNm || person.userId || '결재자', active: person.status === 'ACTIVE' })}
                    >
                      <UserRoundCog aria-hidden="true" /> 바꾸기
                    </Button>
                  </li>
                ))}
              </ul>
              {replaceError && <p role="alert" className="text-sm text-destructive-emphasis">{replaceError}</p>}
            </div>
          ) : null}
        </section>
      ) : null}

      {history.length > 0 ? (
        <section aria-label="처리 기록" className="rounded-md border border-border p-4">
          <h3 ref={historyHeadingRef} tabIndex={-1} className="mb-2 font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-ring">처리 기록</h3>
          <ol className="space-y-2 text-sm">
            {history.map((entry, index) => (
              <li key={`${entry.type}-${entry.at}-${index}`} className="space-y-1">
                <p className="text-foreground">
                  <span className="font-semibold">{PROCESS_LABELS[entry.type ?? ''] ?? entry.type}</span>
                  {' · '}{entry.actorNm || '알 수 없는 사용자'}
                  {entry.type === 'REPLACE' ? ` · ${entry.beforeNm || '이전 결재자'} → ${entry.targetNm || '새 결재자'}` : ''}
                  {entry.atrzCycl ? ` · ${entry.atrzCycl}차` : ''}
                </p>
                {entry.at && <p className="text-xs text-muted-foreground"><time dateTime={entry.at}>{toDisplayDateTime(new Date(entry.at))}</time></p>}
                {entry.content && entry.type !== 'REVISE' && <p className="whitespace-pre-wrap break-words">{entry.content}</p>}
                {entry.content && entry.type === 'REVISE' && (
                  <details><summary className="cursor-pointer text-xs">고치기 전 본문 보기</summary><p className="mt-1 whitespace-pre-wrap break-words">{entry.content}</p></details>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <UserPicker
        isOpen={replacing !== null}
        onClose={() => setReplacing(null)}
        title={replacing ? `${replacing.userNm} 대신 결재할 사람 선택` : '결재자 선택'}
        onSelect={(person) => { void handleReplace(person); }}
      />
    </>
  );
}
