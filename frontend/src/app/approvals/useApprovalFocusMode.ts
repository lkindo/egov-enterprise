'use client';

import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { SANCTION_STATUS, type InformalSanctionDto, type SanctionStatusCode } from '@/services/business/user/approval/ApprovalUserService';
import type { ApprovalTab } from '@/queries/approval-query-options';
import { hasOpenDialog, isTypingTarget, sanctionKey } from './approval-hub-model';

/**
 * 결재 허브의 집중 모드 — 키보드만으로 목록을 오가며 처리한다(2026-10-18 허브 분해 때 ApprovalHubClient 에서 옮겼다 — 키·
 * 안내 문구·판정 그대로). 최신 상태를 읽도록 처리기를 ref 로 둔다. 처리(승인·반려·보완 요청)와 문서 이동은 허브가 넘긴
 * 처리기로 한다 — 판정·차단은 버튼과 같다.
 */
export function useApprovalFocusMode({
  activeTab,
  isDraftOpen,
  list,
  selectedKey,
  selectedItem,
  canDecide,
  canAsk,
  decisionDisabled,
  rejectReason,
  rejectReasonRef,
  focusIntentRef,
  itemButtonRefs,
  pendingActionRef,
  setAnnouncement,
  selectDocument,
  handleAction,
  handleSupplementRequest,
}: {
  activeTab: ApprovalTab;
  isDraftOpen: boolean;
  list: InformalSanctionDto[];
  selectedKey: string;
  selectedItem: InformalSanctionDto | null;
  canDecide: boolean;
  canAsk: boolean;
  decisionDisabled: boolean;
  rejectReason: string;
  rejectReasonRef: MutableRefObject<HTMLTextAreaElement | null>;
  /** R·Q 로 의견 칸에 들어왔을 때 Ctrl+Enter 로 마칠 동작. */
  focusIntentRef: MutableRefObject<'REJECT' | 'ASK' | null>;
  itemButtonRefs: MutableRefObject<Map<string, HTMLButtonElement>>;
  pendingActionRef: MutableRefObject<boolean>;
  setAnnouncement: (message: string) => void;
  /** 작성 중 의견 확인을 거쳐 다른 문서를 고른다. */
  selectDocument: (key: string) => void;
  handleAction: (item: InformalSanctionDto, aprvYn: Extract<SanctionStatusCode, 'C' | 'R'>) => Promise<void>;
  handleSupplementRequest: (item: InformalSanctionDto) => Promise<void>;
}) {
  const [focusMode, setFocusMode] = useState(false);
  // 집중 모드는 대기함의 도구다. 탭을 옮기면(탭 전환·상신 직후·알림 링크) 끈다 — 토글 버튼도 대기함에만 있다.
  if (focusMode && activeTab !== 'PENDING') setFocusMode(false);

  const keyHandler = useRef<(event: KeyboardEvent) => void>(() => undefined);
  const handleFocusKey = (event: KeyboardEvent) => {
    // 대화상자(기안·확인·사람 고르기)가 열려 있으면 키는 그 대화상자의 것이다. 종전에는 기안 대화상자 안에서 누른 A 가
    //   뒤에 가려진 문서를 승인 대기열에 올렸다.
    if (isDraftOpen || hasOpenDialog()) return;
    // 의견 칸에서는 글자를 단축키로 보지 않는다. Esc 는 집중 모드를 끝내지 않고 목록으로 돌아가며,
    //   Ctrl+Enter(맥은 ⌘+Enter)는 R·Q 로 시작한 반려·보완 요청을 마친다 — 칸 안에서 R 을 다시 누르면 글자가 된다.
    if (event.target === rejectReasonRef.current) {
      if (event.key === 'Escape') {
        event.preventDefault();
        focusIntentRef.current = null;
        itemButtonRefs.current.get(selectedKey)?.focus();
        setAnnouncement('목록으로 돌아왔습니다. 집중 모드는 계속됩니다.');
        return;
      }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && focusIntentRef.current) {
        event.preventDefault();
        const intent = focusIntentRef.current;
        if (!selectedItem || !canDecide || decisionDisabled) return;
        focusIntentRef.current = null;
        if (intent === 'REJECT') void handleAction(selectedItem, SANCTION_STATUS.REJECTED);
        else if (canAsk) void handleSupplementRequest(selectedItem);
      }
      return;
    }
    if (event.key === 'Escape') {
      setFocusMode(false);
      setAnnouncement('집중 모드를 끝냈습니다.');
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;
    const key = event.key.toLowerCase();
    const index = list.findIndex(item => sanctionKey(item) === selectedKey);
    if (key === 'j' || key === 'k') {
      const target = list[index + (key === 'j' ? 1 : -1)];
      if (!target || pendingActionRef.current) return;
      event.preventDefault();
      selectDocument(sanctionKey(target));
      requestAnimationFrame(() => itemButtonRefs.current.get(sanctionKey(target))?.focus());
      return;
    }
    if (!selectedItem || !canDecide || decisionDisabled) return;
    if (key === 'a') { event.preventDefault(); void handleAction(selectedItem, SANCTION_STATUS.APPROVED); }
    else if (key === 'r' || key === 'q') {
      event.preventDefault();
      if (key === 'q' && !canAsk) {
        setAnnouncement('이 문서에는 지금 보완을 요청할 수 없습니다.');
        return;
      }
      if (!rejectReason.trim()) {
        focusIntentRef.current = key === 'r' ? 'REJECT' : 'ASK';
        rejectReasonRef.current?.focus();
        setAnnouncement(key === 'r'
          ? '반려 사유를 적은 뒤 Ctrl+Enter 를 누르면 반려합니다. Esc 를 누르면 목록으로 돌아갑니다.'
          : '보완 요청 내용을 적은 뒤 Ctrl+Enter 를 누르면 보냅니다. Esc 를 누르면 목록으로 돌아갑니다.');
        return;
      }
      if (key === 'r') void handleAction(selectedItem, SANCTION_STATUS.REJECTED);
      else void handleSupplementRequest(selectedItem);
    }
  };
  useLayoutEffect(() => { keyHandler.current = handleFocusKey; });
  useEffect(() => {
    if (!focusMode) return undefined;
    const listener = (event: KeyboardEvent) => keyHandler.current(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [focusMode]);

  /** 머리의 집중 모드 단추 — 켜고 끄며 바뀐 상태를 읽어 준다. */
  const toggleFocusMode = () => {
    setFocusMode(current => !current);
    setAnnouncement(focusMode ? '집중 모드를 끝냈습니다.' : '집중 모드입니다. J·K 로 문서를 옮기고 A 승인, R 반려, Q 보완 요청(의견을 적고 Ctrl+Enter), Esc 로 끝냅니다.');
  };

  return { focusMode, toggleFocusMode };
}
