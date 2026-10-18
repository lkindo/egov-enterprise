'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MenuStructure } from '@/services/foundation/system/MenuAdminService';
import type { FlattenedItem } from './treeUtils';
import {
  menuBadges,
  startDraft,
  summarizeDraft,
  type DraftResult,
  type MenuDraft,
  type MenuGroup,
} from './menuDraft';
import { areaOf } from './menuBoardModel';
import type { MenuFocusField, MenuFocusRequest } from './MenuInspector';
import type { MenuMoveDialogMode } from './MenuMoveDialog';
import { EMPTY_MENU_UNDO, endMenuUndoGroup, recordMenuUndo, type MenuUndoHistory } from './menuUndo';
import { NO_ITEMS, firstArea, toBaseline, type Baseline } from './menuAdminModel';

/**
 * 시스템 메뉴 관리의 초안 상태(2026-10-18 화면 분해 때 MenuAdminClient 에서 옮겼다 — 동작 변경 없음).
 *
 * <p>기준선(서버 구조)·초안·되돌리기 이력·고른 메뉴·열린 영역·잘라 낸 메뉴·옮기기 대화상자·결과 안내를 갖고, 초안을 바꾸는
 * 공통 연산(commit·apply·select·activateArea)과 서버 구조를 다시 받는 adopt 를 낸다. 저장·다시 불러오기(서버 요청)는 화면이
 * 소유한다.
 */
export function useMenuDraftState({ loadedStructure, groups }: {
  loadedStructure: MenuStructure | null;
  /** 그룹 권한을 알 때의 그룹(모르면 빈 배열) — 저장 전 숨김 검사와 그룹 배정 요약에 쓴다. */
  groups: readonly MenuGroup[];
}) {
  const [initial] = useState<Baseline | null>(() => (loadedStructure ? toBaseline(loadedStructure) : null));
  const [baseline, setBaseline] = useState<Baseline | null>(initial);
  const [draft, setDraft] = useState<MenuDraft>(() => startDraft(initial?.items ?? NO_ITEMS));
  /** 직전 변경 되돌리기 이력(저장·다시 불러오기에서 비운다). */
  const [undoHistory, setUndoHistory] = useState<MenuUndoHistory>(EMPTY_MENU_UNDO);
  const [selectedMenuNo, setSelectedMenuNo] = useState<number | null>(null);
  const [activeArea, setActiveArea] = useState<number | null>(() => firstArea(initial?.items ?? NO_ITEMS));
  const [cutMenuNo, setCutMenuNo] = useState<number | null>(null);
  const [moveDialog, setMoveDialog] = useState<MenuMoveDialogMode | null>(null);
  /** 보드에서 끄는 중인가 — 끄는 동안 Ctrl+Z·되돌리기로 초안을 바꾸면 끄는 메뉴가 사라지거나 놓을 자리 판정이 어긋난다. */
  const draggingRef = useRef(false);
  /** 상세의 칸으로 한 번만 포커스를 옮기는 요청(새 메뉴의 이름 칸, 입력 오류의 '고치기'). 상세가 쓰고 지운다. */
  const [focusRequest, setFocusRequest] = useState<MenuFocusRequest | null>(null);
  const requestFocus = (menuNo: number, field: MenuFocusField) => {
    setFocusRequest((current) => ({ menuNo, field, seq: (current?.seq ?? 0) + 1 }));
  };
  const clearFocusRequest = useCallback(() => setFocusRequest(null), []);
  /*
    옮기기·만들기·되돌리기·찾기 결과 문장. 화면의 aria-live 영역 하나가 말한다. 문장마다 번호를 매겨 새 요소로 그린다 — 같은
    문장을 다시 넣으면 React 가 DOM 을 건드리지 않아, 같은 방향으로 두 번 옮기거나 끝에서 거듭 누를 때 두 번째부터 읽히지 않는다.
  */
  const [announcement, setAnnouncement] = useState<{ text: string; seq: number }>({ text: '', seq: 0 });
  const announce = (text: string) => setAnnouncement((current) => ({ text, seq: current.seq + 1 }));
  /** 저장하지 않은 변경이 있는 동안 서버 구조가 다시 읽혔는가(DIP C5). */
  const [reloadedWhileEditing, setReloadedWhileEditing] = useState(false);
  /** 옮긴 줄에 포커스를 되돌린다 — 줄이 자리를 바꾸면 포커스가 사라질 수 있다. */
  const focusAfterMoveRef = useRef<number | null>(null);
  /** 찾기로 고른 메뉴를 보이게 스크롤한다. */
  const revealRef = useRef<number | null>(null);
  /** 누른 단추가 사라지고 옮길 곳도 없을 때 — 보드의 고른 항목(없으면 탭 순서에 든 항목)으로 포커스를 옮긴다. */
  const focusBoard = () => {
    const item = document.querySelector<HTMLElement>('[data-a2-master-item][aria-current="true"]')
      ?? document.querySelector<HTMLElement>('[data-a2-master-item][tabindex="0"]');
    item?.focus();
  };

  const baseItems = baseline?.items ?? NO_ITEMS;
  const summary = useMemo(() => summarizeDraft(baseItems, draft, groups), [baseItems, draft, groups]);
  const badges = useMemo(() => menuBadges(summary), [summary]);
  const hasChanges = summary.hasChanges;

  const adopt = (structure: MenuStructure, keep: number | null) => {
    const next = toBaseline(structure);
    setBaseline(next);
    setDraft(startDraft(next.items));
    // 쌓인 초안은 옛 기준선의 것이다 — 저장·다시 불러오기 뒤에는 되돌릴 단계가 없다.
    setUndoHistory(EMPTY_MENU_UNDO);
    setCutMenuNo(null);
    setReloadedWhileEditing(false);
    const kept = keep !== null && next.items.some((item) => item.menuNo === keep) ? keep : null;
    setSelectedMenuNo(kept);
    setActiveArea((current) => (kept !== null
      ? areaOf(next.items, kept)
      : next.items.some((item) => item.depth === 0 && item.menuNo === current) ? current : firstArea(next.items)));
  };

  /*
    [DIP C5] 서버 구조가 다시 읽혔을 때(router.refresh) 저장하지 않은 변경이 있으면 초안을 덮지 않고 알린다. 지금 기준선과 같은
    버전이면(방금 저장한 결과가 돌아온 것) 아무것도 하지 않는다. 변경이 없으면 최신 구조를 그대로 받는다.
  */
  const [prevLoaded, setPrevLoaded] = useState(loadedStructure);
  if (loadedStructure !== prevLoaded) {
    setPrevLoaded(loadedStructure);
    if (loadedStructure && loadedStructure.version !== baseline?.version) {
      if (hasChanges) setReloadedWhileEditing(true);
      else adopt(loadedStructure, selectedMenuNo);
    }
  } else if (reloadedWhileEditing && !hasChanges && loadedStructure) {
    // 배너가 떠 있는 동안 변경을 하나씩 되돌려 0 이 되면 지킬 초안이 없다 — 최신 구조로 맞춘다.
    adopt(loadedStructure, selectedMenuNo);
  }

  const areas = draft.items.filter((item) => item.depth === 0);
  const currentArea = areas.some((item) => item.menuNo === activeArea) ? activeArea : areas[0]?.menuNo ?? null;
  const selectedItem = selectedMenuNo !== null && areaOf(draft.items, selectedMenuNo) === currentArea
    ? draft.items.find((item) => item.menuNo === selectedMenuNo) ?? null
    : null;
  const selectedNo = selectedItem?.menuNo ?? null;
  /*
    다른 메뉴를 고르면 '이어 입력' 묶음을 끝낸다 — 묶음 키에는 메뉴 번호가 들어 있지만, B 를 골랐다가 A 로 돌아와 다시 친 이름은
    앞의 입력과 다른 일이다(그 사이 기록이 없으면 키가 같아 한 단계로 붙었다).
  */
  const [undoGroupMenu, setUndoGroupMenu] = useState<number | null>(null);
  if (selectedNo !== undoGroupMenu) {
    setUndoGroupMenu(selectedNo);
    const ended = endMenuUndoGroup(undoHistory);
    if (ended !== undoHistory) setUndoHistory(ended);
  }
  const cutItem = cutMenuNo === null ? null : draft.items.find((item) => item.menuNo === cutMenuNo) ?? null;

  useEffect(() => {
    const menuNo = focusAfterMoveRef.current;
    if (menuNo === null) return;
    focusAfterMoveRef.current = null;
    const row = document.querySelector<HTMLElement>(`[data-a2-master-item][data-menu-no="${menuNo}"]`);
    if (row && document.activeElement !== row) row.focus();
  }, [draft, currentArea]);

  useEffect(() => {
    const menuNo = revealRef.current;
    if (menuNo === null) return;
    revealRef.current = null;
    document.querySelector<HTMLElement>(`[data-a2-master-item][data-menu-no="${menuNo}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [selectedMenuNo, currentArea]);

  /**
   * 초안을 바꾼다. 바꾸기 전 초안을 '직전 변경 되돌리기' 이력에 쌓는다(label 은 되돌렸다는 안내에 쓴다). coalesceKey 가 직전
   * 기록과 같으면(같은 칸을 이어 입력) 새 단계를 쌓지 않는다.
   */
  const commit = (next: MenuDraft, label: string, coalesceKey: string | null = null) => {
    if (next === draft) return;
    setUndoHistory((history) => recordMenuUndo(history, draft, label, coalesceKey));
    setDraft(next);
  };

  /** 영역 탭을 연다. 고른 메뉴가 그 영역에 없으면 선택을 푼다. */
  const activateArea = (areaNo: number) => {
    setActiveArea(areaNo);
    setSelectedMenuNo((current) => (current !== null && areaOf(draft.items, current) === areaNo ? current : null));
  };

  /** 메뉴를 고른다. 그 메뉴의 영역 탭을 연다. */
  const select = (menuNo: number, items: readonly FlattenedItem[] = draft.items) => {
    setSelectedMenuNo(menuNo);
    const area = areaOf(items, menuNo);
    if (area !== null) setActiveArea(area);
  };

  /**
   * 바꾼 초안에서 '저장하면 메뉴가 숨겨지는 그룹'이 늘었으면 그 사실을 말하는 문장(결과 안내 뒤에 붙인다). 변경 목록을 저절로
   * 펼치지 않으므로, 옮긴 직후 저장이 막힌 이유를 여기서 말한다. 그룹 권한을 모르면(summary 가 빈 그룹으로 계산) 늘지 않는다.
   */
  const conflictNotice = (next: MenuDraft): string => {
    const after = summarizeDraft(baseItems, next, groups).conflicts.length;
    const added = after - summary.conflicts.length;
    return added > 0
      ? ` 그 결과 메뉴가 숨겨지는 그룹이 ${added.toLocaleString()}건 생겨 저장할 수 없습니다 — '변경' 목록에서 해결하세요.`
      : '';
  };

  /** 초안 연산 결과를 반영한다. 바꾼 메뉴를 고르고(영역을 열고), 결과 문장을 말한다. 바뀐 것이 없으면 false. */
  const apply = (result: DraftResult, label: string, message?: (next: MenuDraft) => string, focus = false): boolean => {
    if (!result.ok) {
      announce(result.reason);
      return false;
    }
    if (result.draft === draft) return false;
    commit(result.draft, label);
    if (result.menuNo !== undefined) {
      select(result.menuNo, result.draft.items);
      if (focus) focusAfterMoveRef.current = result.menuNo;
    }
    const text = `${message ? message(result.draft) : ''}${conflictNotice(result.draft)}`.trim();
    if (text) announce(text);
    return true;
  };

  return {
    baseline,
    baseItems,
    draft,
    setDraft,
    undoHistory,
    setUndoHistory,
    selectedMenuNo,
    setSelectedMenuNo,
    setActiveArea,
    cutMenuNo,
    setCutMenuNo,
    cutItem,
    moveDialog,
    setMoveDialog,
    draggingRef,
    focusRequest,
    requestFocus,
    clearFocusRequest,
    announcement,
    announce,
    reloadedWhileEditing,
    focusAfterMoveRef,
    revealRef,
    focusBoard,
    summary,
    badges,
    hasChanges,
    adopt,
    currentArea,
    selectedItem,
    selectedNo,
    commit,
    activateArea,
    select,
    apply,
  };
}

export type MenuDraftState = ReturnType<typeof useMenuDraftState>;
