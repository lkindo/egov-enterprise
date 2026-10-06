'use client';

import { useId, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { AbsenceBadge } from '@/app/components/ui/absence-badge';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { failureMessage } from '@/lib/safe-error-log';
import { isConflictError } from '@/lib/query/list-query-defaults';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import type { InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import { approvalKeys, approvalMutationOptions } from '@/queries/approval-query-options';
import { ApproverInlinePicker } from './ApproverInlinePicker';

/** 한 문서의 참조자 상한 — 서버(InformalSanctionService.MAX_REFERENCES)와 같은 값이다. */
const REFERENCE_LIMIT = 20;
/** 이름을 받지 못한 사람. 식별자를 이름 자리에 보이지 않는다(DEC-OPS-141·193). */
const UNKNOWN_USER = '알 수 없는 사용자';

interface ApprovalReferencePanelProps {
  /** 서버가 판정한 상세 — 참조자 목록과 결재자 추가 힌트(canAddReference)를 싣는다. */
  document: InformalSanctionDto;
  /** 다른 처리 중이거나 상세가 낡았으면 참조자를 더하지 않는다. */
  disabled: boolean;
}

/**
 * 결재 문서의 참조자(2026-10-04 결재 동선 개선 D4).
 *
 * <p>참조자는 결재하지 않고 문서를 읽기만 하는 사람이다. 숨은 참조가 아니다 — 문서를 읽을 수 있는 사람은 자기가 볼 수 있는
 * 차수에 지정된 참조자를 본다(목록은 서버가 그 범위로 잘라 보낸다). 한 번 지정되면 문서가 승인·반려·회수되어도 계속 읽는다.
 *
 * <p>기안자가 그 차수에 참조자를 한 명도 지정하지 않았으면 지금 차례인 결재자가 참조자를 더할 수 있다. 판정은 서버 힌트
 * (canAddReference)와 결재 권한으로만 한다 — 목록이 비었는지로 추론하지 않는다. 더한 참조자는 지울 수 없으므로 확인을 거치고,
 * 읽은 버전으로 보낸다. 다른 곳에서 문서가 바뀌었으면(409) 사유를 보이고 최신 상세를 다시 읽는다.
 */
export function ApprovalReferencePanel({ document, disabled }: ApprovalReferencePanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  // 확인 대화 함수. 이름을 `confirm` 으로 두지 않는다 — 쓰기 권한 census(축 3)가 결재 쿼리 모듈의 `confirm`(승인·반려)을
  // 이름으로 맞춘다(ApprovalDraftDialog 와 같은 이유).
  const askConfirm = useConfirm();
  const queryClient = useQueryClient();
  const headingId = useId();
  const addReferencesMutation = useMutation(approvalMutationOptions.addReferences(queryClient));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<UserSearchResult[]>([]);
  const [savingReferences, setSavingReferences] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pendingRef = useRef(false);
  const pickerButton = useRef<HTMLButtonElement>(null);

  const references = document.references ?? [];
  // 표시 판정일 뿐이다. 서버가 차례·기안자 지정 여부·20명을 다시 보고, 권한이 방금 회수된 낡은 상세라도 버튼이 남지 않게 한다.
  const canAdd = Boolean(document.canAddReference) && canPermission(user, 'APPROVAL_APPROVE');
  // 사람의 자격(사용 중·결재 조회 권한)을 묻는 확인 API 는 기안 권한이 있어야 부른다. 없으면 묻지 않고 지정할 때 서버가 본다.
  const canCheckEligibility = canPermission(user, 'APPROVAL_CREATE');
  const pickedIds = picked.map(person => person.esntlId ?? '');
  const lineIds = (document.stages ?? []).flatMap(stage => (stage.approvers ?? []).map(person => person.userId ?? ''));
  const referenceIds = references.map(person => person.userId ?? '');
  // 참조는 차수마다 기록된다. 이 차수에 이미 지정된 사람만 막는다 — 이전 차수에만 지정된 사람은 이 차수에 다시 지정할 수 있고,
  // 그러면 이 차수의 최종 결과 알림을 받는다(목록은 사람마다 보이는 가장 최근 지정을 싣는다).
  const currentCycle = document.atrzCycl ?? 1;
  const currentReferenceIds = references.filter(person => (person.atrzCycl ?? currentCycle) === currentCycle).map(person => person.userId ?? '');
  // 문서당 20명은 서로 다른 사람 수다 — 이미 참조된 사람을 다시 지정해도 늘지 않는다.
  const remaining = REFERENCE_LIMIT - new Set([...referenceIds, ...pickedIds]).size;
  // 자리가 없어도 이전 차수에만 지정된 사람은 이 차수에 다시 지정할 수 있다.
  const canRedesignate = referenceIds.some(id => !currentReferenceIds.includes(id) && !lineIds.includes(id) && !pickedIds.includes(id));
  const title = document.docTtl || `#${document.ifmlAtrzSn}`;

  if (references.length === 0 && !canAdd && !error) return null;

  const togglePicked = (person: UserSearchResult, selected: boolean) => {
    const id = person.esntlId;
    if (!id) { setNotice('사용자 식별자를 확인할 수 없어 추가하지 않았습니다.'); return; }
    setError('');
    if (!selected) {
      setPicked(current => current.filter(item => item.esntlId !== id));
      setNotice(`${person.userNm || '선택한 사용자'}를 추가할 참조자에서 뺐습니다.`);
      return;
    }
    if (lineIds.includes(id) || id === document.aplcntId || currentReferenceIds.includes(id) || pickedIds.includes(id)) return;
    if (!referenceIds.includes(id) && remaining <= 0) { setNotice(`참조자는 한 문서에 ${REFERENCE_LIMIT}명까지 지정할 수 있습니다.`); return; }
    setPicked(current => [...current, person]);
    setNotice(`${person.userNm || '선택한 사용자'}를 추가할 참조자에 넣었습니다. ‘참조자 지정’ 을 눌러야 지정됩니다.`);
  };

  /** 고른 사람을 참조자로 지정한다. 되돌릴 수 없으므로 이름을 밝힌 확인을 거치고, 확인을 기다리는 동안에도 다시 보내지 않는다. */
  const handleAddReferences = async () => {
    const ifmlAtrzSn = document.ifmlAtrzSn;
    if (pendingRef.current || picked.length === 0 || ifmlAtrzSn === undefined) return;
    const version = document.version;
    if (typeof version !== 'number') {
      setError('문서 버전을 확인할 수 없습니다. 최신 문서를 다시 불러온 뒤 지정해 주세요.');
      return;
    }
    pendingRef.current = true;
    setSavingReferences(true);
    try {
      const names = picked.map(person => person.userNm || UNKNOWN_USER).join(', ');
      const ok = await askConfirm({
        title: '참조자 지정',
        message: `‘${title}’ 문서에 ${picked.length}명을 참조자로 지정합니다: ${names}. 지정한 사람은 결재 의견과 처리 이력을 포함한 이 문서의 모든 차수를 계속 읽고, 이 차수가 최종 승인·반려되면 알림을 받습니다. 지정은 되돌릴 수 없습니다.`,
        confirmText: '참조자 지정',
      });
      if (!ok) return;
      const added = await addReferencesMutation.mutateAsync({ ifmlAtrzSn, references: pickedIds, version });
      setPicked([]);
      setPickerOpen(false);
      setError('');
      setNotice('');
      toast(added > 0
        ? `${added}명을 참조자로 지정했습니다. 이 문서에 처음 지정된 사람에게 알림이 갑니다.`
        : '고른 사람은 이미 이 차수의 참조자라 새로 지정하지 않았습니다.', 'success');
    } catch (failure) {
      // 그사이 기안자가 참조자를 지정했거나 다른 결재자가 처리해 버전이 바뀌었을 수 있다 — 서버가 말한 사유를 보이고 다시 읽는다.
      const conflict = isConflictError(failure);
      if (conflict) {
        void queryClient.invalidateQueries({ queryKey: approvalKeys.detail(ifmlAtrzSn) });
        void queryClient.invalidateQueries({ queryKey: approvalKeys.lists() });
      }
      setError(`${failureMessage(failure, '참조자를 지정하지 못했습니다.')} 고른 사람은 그대로 두었습니다.${conflict ? ' 최신 문서를 다시 불러왔습니다.' : ''}`);
    } finally {
      pendingRef.current = false;
      setSavingReferences(false);
    }
  };

  return (
    <section aria-labelledby={headingId} className="space-y-3 rounded-md border border-border p-4">
      <h3 id={headingId} className="text-[length:var(--font-size-body)] font-semibold text-foreground">참조자 ({references.length}명)</h3>
      {references.length > 0 ? (
        <ul aria-label="참조자 목록" className="space-y-1 text-sm">
          {references.map(person => (
            <li key={person.userId} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-semibold text-foreground">{person.userNm || UNKNOWN_USER}</span>
              {person.deptNm && <span className="text-xs text-muted-foreground">{person.deptNm}</span>}
              <span className="text-xs text-muted-foreground">
                {person.atrzCycl ? `${person.atrzCycl}차` : ''}{person.atrzCycl && person.designator ? ' · ' : ''}{person.designator === 'APPROVER' ? '결재자가 추가' : person.designator === 'DRAFTER' ? '기안자가 지정' : ''}
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">지정된 참조자가 없습니다.</p>}
      <p className="text-xs text-muted-foreground">참조자는 결재하지 않고 읽기만 합니다. 한 번 지정되면 문서가 승인·반려·회수되어도 계속 읽습니다.</p>
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-emphasis">{error}</p>}
      {canAdd && (
        <div className="space-y-2">
          <p className="text-sm">기안자가 이 차수에 참조자를 지정하지 않아 지금 차례인 결재자가 참조자를 더할 수 있습니다. 더한 참조자는 지울 수 없습니다.</p>
          <Button
            ref={pickerButton}
            type="button"
            variant="outline"
            aria-expanded={pickerOpen}
            disabled={disabled || savingReferences || (!pickerOpen && remaining <= 0 && !canRedesignate)}
            onClick={() => { setNotice(''); setPickerOpen(current => !current); }}
          >
            <UserPlus aria-hidden="true" /> 참조자 추가
          </Button>
          {pickerOpen && (
            <ApproverInlinePicker
              variant="reference"
              stageLabel="참조자"
              selectedIds={pickedIds}
              blockedReasons={new Map([
                ...lineIds.map(id => [id, '결재선에 있습니다'] as const),
                ...(document.aplcntId ? [[document.aplcntId, '기안자입니다'] as const] : []),
                ...currentReferenceIds.map(id => [id, '이미 이 차수의 참조자입니다'] as const),
              ])}
              selfId={user?.esntlId}
              remaining={remaining}
              uncountedIds={referenceIds}
              checkEligibility={canCheckEligibility}
              footerNote={canCheckEligibility
                ? '결재 조회 권한이 있는 사용 중인 사람만 고를 수 있습니다. 고른 사람은 ‘추가할 참조자’ 에 모이고, ‘참조자 지정’ 을 눌러야 지정됩니다.'
                : '고른 사람은 ‘추가할 참조자’ 에 모이고, ‘참조자 지정’ 을 눌러야 지정됩니다. 결재 조회 권한과 사용 여부는 지정할 때 서버가 확인합니다.'}
              onToggle={togglePicked}
              onClose={() => { setPickerOpen(false); requestAnimationFrame(() => pickerButton.current?.focus()); }}
            />
          )}
          {picked.length > 0 && (
            <ul aria-label="추가할 참조자" className="space-y-1">
              {picked.map(person => (
                <li key={person.esntlId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="inline-flex flex-wrap items-center gap-1">{person.userNm || UNKNOWN_USER}{person.deptNm ? ` · ${person.deptNm}` : ''}<AbsenceBadge absent={person.absent} /></span>
                  <Button type="button" variant="ghost" size="sm" disabled={savingReferences} aria-label={`${person.userNm || UNKNOWN_USER} 추가할 참조자에서 제외`} onClick={() => togglePicked(person, false)}>제외</Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            disabled={disabled || savingReferences || picked.length === 0}
            aria-busy={savingReferences || undefined}
            onClick={() => { void handleAddReferences(); }}
          >
            {savingReferences ? '참조자 지정 중…' : `참조자 지정 (${picked.length}명)`}
          </Button>
        </div>
      )}
      <p role="status" aria-live="polite" className="text-sm text-foreground">{notice}</p>
    </section>
  );
}
