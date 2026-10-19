'use client';

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { SANCTION_STATUS, type InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';
import { approvalKeys, type ApprovalDecision, type ApprovalTab } from '@/queries/approval-query-options';
import { failureMessage } from '@/lib/safe-error-log';
import { isConflictError } from '@/lib/query/list-query-defaults';
import {
  APPROVAL_UNDO_MS,
  cancelApprovalCommit,
  commitApprovalNow,
  flushApprovalCommits,
  pendingApprovalCommits,
  queuedApprovalLabel,
  scheduleApprovalCommit,
  subscribeApprovalCommits,
} from './approval-undo-queue';
import { documentLabel, withObjectParticle } from './approval-decision';
import { NO_QUEUED, sanctionKey, type QueuedApproval } from './approval-hub-model';

/**
 * 결재 허브의 승인 되돌리기 대기열(2026-10-18 허브 분해 때 ApprovalHubClient 에서 옮겼다 — 상태·문구·포커스 이동 그대로).
 *
 * <p>단건 승인은 누른 순간이 아니라 {@link APPROVAL_UNDO_MS} 뒤에 끝난다. 그때의 탭·목록·작성 중 의견을 읽도록 ref 로 둔다.
 * 되돌리거나 실패한 승인의 의견은 그 문서로 되살리거나(다른 문서에 쓰는 글을 덮지 않도록) 맡아 두었다가 그 문서를 다시
 * 고를 때 채운다. 결재 의견 칸·고른 문서·선택은 허브의 상태이고, 이 훅은 허브가 넘긴 setter 로만 바꾼다.
 */
export function useApprovalUndoQueue({
  confirmMutation,
  queryClient,
  toast,
  activeTab,
  list,
  selectedListItem,
  selectedKey,
  rejectReason,
  opinionDocument,
  setRejectReason,
  setOpinionDocument,
  setSelectedItemId,
  setBulkSelected,
  setActionError,
  clearDecisionErrors,
  setAnnouncement,
  itemButtonRefs,
  moveAfter,
  reportDecisionFailure,
}: {
  confirmMutation: { mutateAsync: (decision: ApprovalDecision) => Promise<unknown> };
  queryClient: QueryClient;
  toast: (message: string, variant: 'success' | 'error') => void;
  activeTab: ApprovalTab;
  list: InformalSanctionDto[];
  /** 목록에서 고른 문서(상세를 불러오기 전 값). 맡아 둔 의견을 채울 때 본다. */
  selectedListItem: InformalSanctionDto | null;
  /** 지금 고른 문서의 키 — 처리 예정 행이 사라진 뒤 포커스를 둘 곳이다. */
  selectedKey: string;
  rejectReason: string;
  opinionDocument: InformalSanctionDto | null;
  setRejectReason: (reason: string) => void;
  setOpinionDocument: (item: InformalSanctionDto | null) => void;
  setSelectedItemId: (id: string | null) => void;
  setBulkSelected: Dispatch<SetStateAction<string[]>>;
  setActionError: (message: string) => void;
  /** 결재 의견의 필드 오류를 지운다(알리지 않는다). */
  clearDecisionErrors: () => void;
  setAnnouncement: (message: string) => void;
  itemButtonRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
  moveAfter: (item: InformalSanctionDto) => void;
  reportDecisionFailure: (error: unknown, actionNm: string) => void;
}) {
  const [committingIds, setCommittingIds] = useState<number[]>([]);
  const [queuedDocs, setQueuedDocs] = useState<Record<number, QueuedApproval>>({});
  // 되돌리거나 실패한 승인의 의견 — 다른 문서에 의견을 쓰는 중이라 덮지 않고 맡아 두었다가, 그 문서를 다시 열 때 채운다.
  const [parkedOpinions, setParkedOpinions] = useState<Record<string, string>>({});
  // 처리 예정 영역 밖에서 끝난 승인의 실패 — 지금 보고 있는 다른 문서의 상세에 붙이지 않는다.
  const [queueNotice, setQueueNotice] = useState('');
  const queueButtonRefs = useRef(new Map<number, HTMLButtonElement>());
  const queued = useSyncExternalStore(subscribeApprovalCommits, pendingApprovalCommits, () => NO_QUEUED);

  // 되돌리기 대기 중인 승인은 화면을 떠나면 바로 보낸다. 탭을 닫으려 하면 브라우저가 한 번 묻게 한다.
  useEffect(() => () => { void flushApprovalCommits(); }, []);
  useEffect(() => {
    if (queued.length === 0) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [queued.length]);

  // 맡아 둔 의견은 그 문서를 다시 고를 때 한 번 채운다. 고르는 순간에만 보므로, 채운 뒤 지운 글을 다시 채우지 않는다.
  const parkedKey = selectedListItem ? sanctionKey(selectedListItem) : '';
  const [parkCheckedKey, setParkCheckedKey] = useState('');
  if (parkedKey !== parkCheckedKey) {
    setParkCheckedKey(parkedKey);
    const parked = parkedOpinions[parkedKey];
    if (parked !== undefined && selectedListItem && !rejectReason.trim()) {
      setParkedOpinions((current) => {
        const next = { ...current };
        delete next[parkedKey];
        return next;
      });
      setOpinionDocument(selectedListItem);
      setRejectReason(parked);
    }
  }

  // 되돌리기 대기열의 승인은 누른 순간이 아니라 10초 뒤에 끝난다. 그때의 탭·목록·작성 중 의견을 읽도록 ref 로 둔다.
  const live = useRef({ activeTab, list, draft: '', draftKey: '' });
  useLayoutEffect(() => {
    live.current = { activeTab, list, draft: rejectReason, draftKey: opinionDocument ? sanctionKey(opinionDocument) : '' };
  });

  const forgetQueued = (id: number) => setQueuedDocs((current) => {
    const next = { ...current };
    delete next[id];
    return next;
  });

  /**
   * 되돌렸거나 보내지 못한 승인의 의견을 그 문서로 되살린다.
   * - 그 문서가 지금 대기함 목록에 있고 다른 문서에 쓰는 의견이 없으면: 그 문서를 열고 의견을 채운다(restored).
   * - 다른 문서에 의견을 쓰는 중이거나 그 문서가 지금 목록에 없으면: 쓰는 글을 덮지 않고 의견을 맡아 둔다(parked).
   *   그 문서를 다시 고르면 채운다.
   */
  const settleOpinion = (item: InformalSanctionDto, reason: string | undefined): 'restored' | 'parked' | 'kept' => {
    const key = sanctionKey(item);
    const { activeTab: currentTab, list: currentList, draft, draftKey } = live.current;
    const listed = currentTab === 'PENDING' && currentList.some(entry => sanctionKey(entry) === key);
    const otherDraft = draft.trim() !== '' && draftKey !== key;
    if (!listed || otherDraft) {
      if (!reason || draftKey === key) return 'kept';
      setParkedOpinions(current => ({ ...current, [key]: reason }));
      return 'parked';
    }
    setSelectedItemId(key);
    // 같은 문서에 새로 쓰기 시작한 글이 있으면 그 글이 더 최근의 뜻이다 — 덮지 않는다.
    if (reason && !draft.trim()) {
      setOpinionDocument(item);
      setRejectReason(reason);
    }
    return 'restored';
  };

  /** 처리 예정 행이 사라진 뒤 포커스를 둘 곳 — 남은 대기열의 다음 행, 없으면 지금 고른 문서. */
  const focusAfterQueueRow = (id: number) => {
    const index = queued.indexOf(id);
    const rest = queued.filter(entry => entry !== id);
    const next = rest[Math.min(Math.max(index, 0), rest.length - 1)];
    const fallbackKey = selectedKey;
    requestAnimationFrame(() => {
      const target = (next !== undefined ? queueButtonRefs.current.get(next) : undefined) ?? itemButtonRefs.current.get(fallbackKey);
      target?.focus();
    });
  };

  /**
   * 승인 — 확인 대화상자 없이 되돌리기 대기열에 올린다. 10초 안에 되돌리지 않으면 서버로 보낸다.
   * 의견은 그 순간의 값으로 묶어 두고 입력란은 다음 문서를 위해 비운다. 되돌리거나 실패하면 그 의견을 되살린다.
   */
  const scheduleApprove = (item: InformalSanctionDto, actionNm: string, reason: string | undefined) => {
    const id = item.ifmlAtrzSn;
    if (id === undefined) return;
    const title = documentLabel(item);
    const version = item.version;
    const accepted = scheduleApprovalCommit(id, async () => {
      setCommittingIds(current => [...current, id]);
      try {
        await confirmMutation.mutateAsync({ ifmlAtrzSn: id, status: SANCTION_STATUS.APPROVED, reason, version });
        toast(`‘${title}’ ${actionNm}했습니다.`, 'success');
      } catch (error) {
        // 10초 사이 사용자가 다른 문서에 의견을 쓰고 있을 수 있다 — 그 글을 덮거나 실패 안내를 그 문서에 붙이지 않는다.
        const outcome = settleOpinion(item, reason);
        if (outcome === 'restored') {
          reportDecisionFailure(error, actionNm);
        } else {
          if (isConflictError(error)) void queryClient.invalidateQueries({ queryKey: approvalKeys.all });
          setQueueNotice(`‘${title}’ ${actionNm}하지 못했습니다. ${failureMessage(error, `${actionNm} 처리 중 오류가 발생했습니다.`)}${
            outcome === 'parked' ? ' 작성 중인 의견은 그대로 두었고, 이 문서에 적었던 의견은 문서를 다시 열면 채웁니다.' : ''}`);
          toast(`결재를 ${actionNm}하지 못했습니다.`, 'error');
        }
      } finally {
        forgetQueued(id);
        setCommittingIds(current => current.filter(entry => entry !== id));
      }
    }, { label: { title, actionNm } });
    if (!accepted) return;
    setQueuedDocs(current => ({ ...current, [id]: { title, actionNm, item, reason } }));
    // 단건으로 처리한 문서는 여러 건 승인의 선택에서 뺀다 — 되돌려도 다시 고른 것으로 남지 않는다.
    setBulkSelected(current => current.filter(entry => entry !== String(id)));
    setRejectReason('');
    setActionError('');
    setQueueNotice('');
    clearDecisionErrors();
    setAnnouncement(`‘${title}’ ${withObjectParticle(actionNm)} ${APPROVAL_UNDO_MS / 1000}초 뒤 처리합니다. 되돌리려면 되돌리기를 누르세요.`);
    moveAfter(item);
  };

  const undoApprove = (id: number) => {
    // 알림 카드에서 올린 승인은 이 화면의 기록이 없다 — 대기열이 올릴 때 받은 이름을 취소 전에 읽어 둔다.
    const label = queuedApprovalLabel(id);
    if (!cancelApprovalCommit(id)) return;
    const entry = queuedDocs[id];
    forgetQueued(id);
    const title = entry?.title ?? label?.title ?? `#${id}`;
    const outcome = entry ? settleOpinion(entry.item, entry.reason) : 'kept';
    if (outcome === 'restored') {
      setAnnouncement(`‘${title}’ 처리를 되돌렸습니다. 문서는 그대로 대기 중입니다.${entry?.reason ? ' 적었던 의견을 다시 채웠습니다.' : ''}`);
      requestAnimationFrame(() => itemButtonRefs.current.get(String(id))?.focus());
      return;
    }
    setAnnouncement(`‘${title}’ 처리를 되돌렸습니다. 문서는 그대로 대기 중입니다.${
      outcome === 'parked' ? ' 작성 중인 의견을 덮지 않도록, 이 문서에 적었던 의견은 문서를 다시 열면 채웁니다.' : ''}`);
    focusAfterQueueRow(id);
  };

  /** ‘지금 처리’ — 기다리지 않고 보낸다. 그 행은 바로 사라지므로 포커스를 남은 행이나 고른 문서로 옮긴다. */
  const commitNow = (id: number) => {
    focusAfterQueueRow(id);
    void commitApprovalNow(id);
  };

  return { queued, committingIds, queuedDocs, queueNotice, setQueueNotice, queueButtonRefs, scheduleApprove, undoApprove, commitNow };
}
