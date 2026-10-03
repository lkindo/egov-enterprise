'use client';

import { useRef, useState } from 'react';
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
  const [replacing, setReplacing] = useState<{ userId: string; userNm: string } | null>(null);
  const [pendingAction, setPendingAction] = useState<'ANSWER' | 'REMIND' | 'REPLACE' | null>(null);
  const pendingActionRef = useRef(false);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const docCnRef = useRef<HTMLTextAreaElement>(null);
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
  const canReplace = canWrite && Boolean(document.canReplaceApprover);
  if (!supplement && !canRemind && !canReplace && history.length === 0) return null;

  const refreshOnConflict = (error: unknown) => {
    if (isConflict(error)) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
  };

  const handleAnswer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingActionRef.current || id === undefined || version === undefined) return;
    const validated = answerValidation.validate({ answer, ...(revising ? { docCn } : {}) });
    if (!validated) return;
    pendingActionRef.current = true;
    setPendingAction('ANSWER');
    setAnswerError('');
    try {
      await answerMutation.mutateAsync({
        ifmlAtrzSn: id,
        answer: { answer: validated.answer, ...(revising && validated.docCn !== document.docCn ? { docCn: validated.docCn } : {}), version },
      });
      setAnswer('');
      setRevising(false);
      toast(revising ? '보완 답변과 고친 본문을 보냈습니다. 앞서 한 승인은 유지됩니다.' : '보완 답변을 보냈습니다.', 'success');
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
      const ok = await confirm({
        title: '결재자 바꾸기',
        message: `${from.userNm} 대신 ${to.userNm || '선택한 사람'}에게 이 결재를 맡깁니다. 앞서 처리한 결재는 그대로이며 두 사람 모두에게 알림이 갑니다.`,
        confirmText: '결재자 바꾸기',
      });
      if (!ok) return;
      await replaceMutation.mutateAsync({ ifmlAtrzSn: id, fromUserId: from.userId, toUserId: to.esntlId, version });
      toast(`결재자를 ${to.userNm || '선택한 사람'}(으)로 바꿨습니다.`, 'success');
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
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
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
                <input id="supplement-revise" type="checkbox" aria-label="본문도 고치기" checked={revising} disabled={busy} onChange={(event) => setRevising(event.target.checked)} />
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

      {canRemind || canReplace ? (
        <section aria-label="결재 진행 관리" className="space-y-3 rounded-md border border-border p-4">
          <h3 className="font-semibold text-foreground">결재 진행 관리</h3>
          {canRemind ? (
            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                disabled={busy || Boolean(document.remindedToday)}
                aria-busy={pendingAction === 'REMIND' || undefined}
                onClick={() => { void handleRemind(); }}
              >
                <BellRing aria-hidden="true" /> {document.remindedToday ? '오늘 재알림함' : '차례인 결재자에게 재알림'}
              </Button>
              <p className="text-xs text-muted-foreground">재알림은 하루 한 번 보낼 수 있습니다.</p>
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
                      onClick={() => setReplacing({ userId: person.userId ?? '', userNm: person.userNm || person.userId || '결재자' })}
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
          <h3 className="mb-2 font-semibold text-foreground">처리 기록</h3>
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
