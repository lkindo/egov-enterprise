'use client';

import { useEffect, type RefObject } from 'react';
import {
  addMenu,
  addOperations,
  editMenu,
  startDraft,
  groupGrants,
  markDeleted,
  menuLabel,
  moveMenu,
  parentPathLabel,
  removeNewMenu,
  revertGroup,
  revertPlacement,
  revertProperties,
  setNavigation,
  shiftMenu,
  type MenuEditableField,
  type MenuGroup,
  type MenuParentKey,
  type MenuPropertyPatch,
} from './menuDraft';
import { areaOf, pasteTarget, resolveBoardDrop, type BoardDropTarget } from './menuBoardModel';
import type { MenuMovePosition } from './MenuMoveDialog';
import { takeMenuUndo } from './menuUndo';
import { FIELD_LABEL, isTextEntry, placementText } from './menuAdminModel';
import type { MenuDraftState } from './useMenuDraftState';

/**
 * 시스템 메뉴 관리의 초안 연산(2026-10-18 화면 분해 때 MenuAdminClient 에서 옮겼다 — 동작 변경 없음).
 *
 * <p>옮기기(한 칸·끌어 놓기·잘라 붙이기·대화상자), 새 메뉴, 속성 수정, 삭제 표시, 그룹 메뉴 표시·진입 권한, 직전 변경
 * 되돌리기(Ctrl+Z)와 변경 목록의 항목·전체 되돌리기다. 모두 초안만 바꾼다 — 서버에 보내는 것은 화면의 '변경 저장' 하나다.
 * 쓰기 단추 노출과 같은 권한으로 다시 막는다(표시 판정일 뿐 서버가 같은 권한을 집행한다).
 */
export function useMenuDraftOperations(state: MenuDraftState, {
  canUpdate,
  canCreate,
  canDelete,
  canGrant,
  locked,
  groups,
  rootRef,
  confirm,
  savePendingRef,
  changeCount,
}: {
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
  canGrant: boolean;
  /** 저장·다시 불러오기 중이면 초안을 바꾸지 않는다. */
  locked: boolean;
  groups: readonly MenuGroup[];
  /** Ctrl+Z 를 받는 화면 뿌리 요소. */
  rootRef: RefObject<HTMLDivElement | null>;
  confirm: (options: { title: string; message: string; confirmText: string; variant: 'destructive' }) => Promise<boolean>;
  /** 저장 요청의 동기 잠금 — 저장 중에는 '모두 되돌리기' 를 하지 않는다. */
  savePendingRef: RefObject<boolean>;
  /** 변경 목록 항목 수(도구 막대의 '변경 n건' 과 같은 원천). */
  changeCount: number;
}) {
  const {
    baseline,
    draft,
    baseItems,
    summary,
    hasChanges,
    undoHistory,
    setUndoHistory,
    setDraft,
    selectedMenuNo,
    setSelectedMenuNo,
    setActiveArea,
    cutMenuNo,
    setCutMenuNo,
    moveDialog,
    setMoveDialog,
    draggingRef,
    focusAfterMoveRef,
    requestFocus,
    announce,
    focusBoard,
    commit,
    select,
    apply,
  } = state;

  const handleShift = (menuNo: number, direction: -1 | 1, fromKeyboard: boolean) => {
    if (!canUpdate || locked) return;
    const where = direction < 0 ? '위로' : '아래로';
    const name = menuLabel(draft.items, menuNo);
    apply(
      shiftMenu(draft, menuNo, direction),
      `${name} 한 칸 ${where}`,
      (next) => `${menuLabel(next.items, menuNo)} 메뉴를 한 칸 ${where} 옮겼습니다(${placementText(next.items, menuNo)}). 변경 저장을 눌러야 반영됩니다.`,
      fromKeyboard,
    );
  };

  const handleDrop = (activeNo: number, target: BoardDropTarget) => {
    if (!canUpdate || locked) return;
    const result = resolveBoardDrop(draft.items, draft.deleted, activeNo, target);
    const name = menuLabel(draft.items, activeNo);
    if (result.kind === 'none') return;
    if (result.kind === 'reject') {
      announce(`${name} 메뉴를 그 자리로 옮길 수 없습니다. ${result.reason}`);
      return;
    }
    apply(
      moveMenu(draft, activeNo, result.parent, result.index),
      `${name} 옮기기`,
      (next) => `${name} 메뉴를 옮겼습니다(${placementText(next.items, activeNo)}). 변경 저장을 눌러야 반영됩니다.`,
    );
  };

  const handleCut = (menuNo: number) => {
    if (draft.deleted.has(menuNo)) {
      announce('삭제 예정 메뉴는 옮길 수 없습니다. 삭제를 먼저 취소하세요.');
      return;
    }
    setCutMenuNo(menuNo);
    announce(`${menuLabel(draft.items, menuNo)} 메뉴를 잘라 냈습니다. 놓을 곳을 고른 뒤 Ctrl+V 를 누르세요. 취소는 Esc 입니다.`);
  };

  const cancelCut = () => {
    if (cutMenuNo === null) return;
    setCutMenuNo(null);
    announce('잘라내기를 취소했습니다.');
  };

  const handlePaste = (targetNo: number) => {
    if (cutMenuNo === null || !canUpdate || locked) return;
    const name = menuLabel(draft.items, cutMenuNo);
    const target = pasteTarget(draft.items, targetNo);
    if (!target || targetNo === cutMenuNo) {
      announce(`${name} 메뉴 자신에는 붙여 넣을 수 없습니다. 다른 곳을 고르세요.`);
      return;
    }
    const result = resolveBoardDrop(draft.items, draft.deleted, cutMenuNo, target);
    if (result.kind === 'reject') {
      announce(`${name} 메뉴를 그 자리로 옮길 수 없습니다. ${result.reason}`);
      return;
    }
    const moved = cutMenuNo;
    setCutMenuNo(null);
    if (result.kind === 'none') {
      announce(`${name} 메뉴는 이미 그 자리에 있습니다.`);
      return;
    }
    apply(
      moveMenu(draft, moved, result.parent, result.index),
      `${name} 붙여넣기`,
      (next) => `${name} 메뉴를 붙여 넣었습니다(${placementText(next.items, moved)}). 변경 저장을 눌러야 반영됩니다.`,
      true,
    );
  };

  const handleItemKeyDown = (menuNo: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (event.altKey && !modifier && !event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      if (!canUpdate) return;
      event.preventDefault();
      handleShift(menuNo, event.key === 'ArrowUp' ? -1 : 1, true);
      return;
    }
    if (modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'x') {
      if (!canUpdate) return;
      event.preventDefault();
      handleCut(menuNo);
      return;
    }
    if (modifier && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'v') {
      if (!canUpdate || cutMenuNo === null) return;
      event.preventDefault();
      handlePaste(menuNo);
      return;
    }
    if (event.key === 'Escape' && cutMenuNo !== null) {
      event.preventDefault();
      cancelCut();
    }
  };

  const handleAdd = (parent: MenuParentKey) => {
    if (!canCreate || locked) return;
    const result = addMenu(draft, parent, Number.POSITIVE_INFINITY);
    if (apply(result, `${parentPathLabel(draft.items, parent)} 새 메뉴 만들기`,
      (next) => `새 메뉴를 ${parentPathLabel(next.items, parent)} 맨 끝에 만들었습니다. 이름을 입력하세요.`)
      && result.ok && result.menuNo !== undefined) {
      requestFocus(result.menuNo, 'menuNm');
    }
  };

  const handleMoveConfirm = (parent: MenuParentKey, position: MenuMovePosition) => {
    const mode = moveDialog;
    setMoveDialog(null);
    if (!mode || locked) return;
    const index = position === 'first' ? 0 : Number.POSITIVE_INFINITY;
    if (mode.kind === 'create') {
      if (!canCreate) return;
      const at = position === 'first' ? '맨 앞에' : '맨 뒤에';
      const result = addMenu(draft, parent, index, { menuNm: mode.label ?? '', modernRoute: mode.route });
      if (apply(result, `${mode.label ?? '새'} 메뉴 만들기`,
        (next) => `${mode.label ?? '새'} 메뉴를 ${parentPathLabel(next.items, parent)} ${at} 만들었습니다. 이름을 확인하고 변경 저장을 누르세요.`)
        && result.ok && result.menuNo !== undefined) {
        requestFocus(result.menuNo, 'menuNm');
      }
      return;
    }
    if (!canUpdate) return;
    const name = menuLabel(draft.items, mode.menuNo);
    const result = moveMenu(draft, mode.menuNo, parent, index);
    if (result.ok && result.draft === draft) {
      announce(`${name} 메뉴는 이미 그 자리에 있습니다.`);
      return;
    }
    const to = position === 'first' ? '맨 앞으로' : '맨 뒤로';
    apply(result, `${name} 옮기기`, (next) => `${name} 메뉴를 ${parentPathLabel(next.items, parent)} ${to} 옮겼습니다. 변경 저장을 눌러야 반영됩니다.`);
  };

  const handleMoveCancel = () => {
    const mode = moveDialog;
    setMoveDialog(null);
    if (mode?.kind === 'create') announce('화면을 메뉴에 추가하지 않았습니다.');
  };

  /**
   * 속성을 바꾼다. typing(글자를 이어 넣는 칸 — 이름·설명·경로 직접 입력)이면 같은 칸을 이어 친 것을 한 단계로 묶는다. 화면
   * 목록에서 고르기·연결 해제·사용 여부는 누를 때마다 한 단계다 — 화면 A 를 고른 뒤 B 를 고르고 되돌리면 A 로 돌아간다.
   */
  const handleEdit = (menuNo: number, patch: MenuPropertyPatch, typing = false) => {
    if (!canUpdate || locked) return;
    const result = editMenu(draft, menuNo, patch);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    const fields = Object.keys(patch) as MenuEditableField[];
    commit(
      result.draft,
      `${menuLabel(draft.items, menuNo)} ${fields.map((field) => FIELD_LABEL[field]).join('·')} 수정`,
      typing && fields.length === 1 ? `edit:${menuNo}:${fields[0]}` : null,
    );
  };

  const handleDelete = (menuNo: number, deleted: boolean) => {
    if (!canDelete || locked) return;
    const name = menuLabel(draft.items, menuNo);
    apply(markDeleted(draft, menuNo, deleted), deleted ? `${name} 삭제 표시` : `${name} 삭제 취소`, () => (deleted
      ? `${name} 메뉴를 삭제 예정으로 표시했습니다. 변경 저장을 눌러야 지워집니다.`
      : `${name} 메뉴의 삭제를 취소했습니다.`));
  };

  /**
   * 새 메뉴를 초안에서 지운다. 지운 메뉴를 고르고 있었으면 바로 앞 메뉴(없으면 뒤 메뉴)를 고른다 — 상세가 통째로 사라지면
   * 누른 단추와 함께 포커스가 문서 밖으로 빠진다. 상세에서 지웠으면 고른 메뉴의 보드 항목으로 포커스를 옮기고, 변경 목록에서
   * 되돌렸으면 포커스는 변경 목록이 맡는다(focusBoardItem=false).
   */
  const handleRemoveNew = (menuNo: number, focusBoardItem = true) => {
    if (!canCreate || locked) return;
    const name = menuLabel(draft.items, menuNo);
    const index = draft.items.findIndex((item) => item.menuNo === menuNo);
    const result = removeNewMenu(draft, menuNo);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    commit(result.draft, `${name} 새 메뉴 지우기`);
    if (selectedMenuNo === menuNo) {
      const neighbor = result.draft.items[Math.max(0, index - 1)] ?? null;
      if (neighbor) {
        select(neighbor.menuNo, result.draft.items);
        if (focusBoardItem) focusAfterMoveRef.current = neighbor.menuNo;
      } else {
        setSelectedMenuNo(null);
      }
    }
    if (cutMenuNo === menuNo) setCutMenuNo(null);
    announce(`${name}을(를) 초안에서 지웠습니다.`);
  };

  const handleToggleNavigation = (groupCode: string, menuNo: number, checked: boolean) => {
    const group = groups.find((candidate) => candidate.code === groupCode);
    if (!group || !canGrant || locked) return;
    const before = groupGrants(draft, group);
    const result = setNavigation(draft, group, menuNo, checked);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    const after = groupGrants(result.draft, group);
    const extra = checked
      ? [...after].filter((key) => !before.has(key)).length > 1 ? ' 상위 메뉴 표시도 함께 켰습니다.' : ''
      : [...before].filter((key) => !after.has(key)).length > 1 ? ' 하위 메뉴 표시도 함께 껐습니다.' : '';
    const name = menuLabel(draft.items, menuNo);
    commit(result.draft, `${group.name} 그룹 ${name} 메뉴 표시 ${checked ? '켜기' : '끄기'}`);
    announce(`${group.name} 그룹에 ${name} 메뉴 표시를 ${checked ? '켰' : '껐'}습니다.${extra} 변경 저장을 눌러야 반영됩니다.`);
  };

  const handleAddOperations = (groupCode: string, codes: readonly string[]) => {
    const group = groups.find((candidate) => candidate.code === groupCode);
    if (!group || !canGrant || locked || codes.length === 0) return;
    const result = addOperations(draft, group, codes);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    commit(result.draft, `${group.name} 그룹 진입 권한 추가`);
    announce(`${group.name} 그룹에 진입 권한(${codes.join(', ')})을 추가했습니다. 변경 저장을 눌러야 반영됩니다.`);
  };

  /**
   * 직전 변경을 되돌린다(도구 막대 '되돌리기'·Ctrl+Z). 되돌린 뒤에도 고른 메뉴가 있으면 계속 고르고 그 메뉴의 영역을 연다 —
   * 옮기기를 되돌리면 메뉴가 원래 영역으로 돌아가므로, 지금 탭에 남아 있으면 상세가 이유 없이 닫힌다.
   */
  const handleUndo = () => {
    if (!canUpdate || locked) return;
    if (draggingRef.current) {
      announce('끌기를 마치거나 취소한 뒤 되돌리세요.');
      return;
    }
    const taken = takeMenuUndo(undoHistory);
    if (!taken) {
      announce('되돌릴 변경이 없습니다.');
      return;
    }
    const restored = taken.step.draft;
    setUndoHistory(taken.history);
    setDraft(restored);
    if (cutMenuNo !== null && !restored.items.some((item) => item.menuNo === cutMenuNo)) setCutMenuNo(null);
    if (selectedMenuNo !== null) {
      const area = areaOf(restored.items, selectedMenuNo);
      if (area === null) setSelectedMenuNo(null);
      else setActiveArea(area);
    }
    announce(`직전 변경(${taken.step.label})을 되돌렸습니다.`);
    // 되돌린 일로 포커스가 있던 항목(새 메뉴 등)이 사라졌으면 보드의 고른 항목으로 옮긴다.
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body || !active.isConnected) focusBoard();
    }, 0);
  };

  /*
    Ctrl+Z(맥은 Cmd+Z) — 이 화면 안에서 직전 변경을 되돌린다. 글자를 넣는 칸에서는 브라우저의 입력 되돌리기에 맡긴다. 화면
    밖(머리글 검색 등)과 포털로 그린 대화상자에서 누른 키는 이 요소를 거치지 않는다(DOM 이벤트가 이 요소로 올라오지 않는다).
    렌더마다 최신 처리기로 다시 단다(처리기가 지금 초안·이력을 본다). 보드에서 끄는 중(키보드 끌기 포함)에는 키를 그대로
    두고 되돌리지 않는다 — 끄는 메뉴를 만든 단계를 되돌리면 놓을 때 판정과 끌기 안내가 어긋난다.
  */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.shiftKey || !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== 'z' || isTextEntry(event.target) || !canUpdate || draggingRef.current) return;
      event.preventDefault();
      handleUndo();
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  });

  const handleRevertAll = async () => {
    if (savePendingRef.current || locked || !hasChanges || !baseline) return;
    // 도구 막대의 '변경 n건' 과 같은 원천에서 센다(변경 목록 항목은 요약의 다섯 배열을 한 건씩 옮긴 것이다).
    const total = changeCount;
    const confirmed = await confirm({
      title: '변경 모두 되돌리기',
      message: `저장하지 않은 변경 ${total.toLocaleString()}건을 모두 되돌립니다. 바로 뒤라면 도구 막대의 '되돌리기'(Ctrl+Z)로 다시 살릴 수 있습니다.`,
      confirmText: '모두 되돌리기',
      variant: 'destructive',
    });
    if (!confirmed) return;
    commit(startDraft(baseline.items), '변경 모두 되돌리기');
    setCutMenuNo(null);
    setSelectedMenuNo((current) => (current !== null && baseline.items.some((item) => item.menuNo === current) ? current : null));
    announce('저장하지 않은 변경을 모두 되돌렸습니다.');
    // 변경 목록이 통째로 사라져 누른 단추도 없다 — 확인 대화상자가 닫힌 다음 차례에 보드 항목으로 포커스를 옮긴다.
    window.setTimeout(focusBoard, 0);
  };

  /** 변경 목록의 항목 하나를 되돌린다. 항목 키는 '종류:대상'(new·del·place·props 는 메뉴 번호, group 은 그룹 코드)이다. */
  const handleRevertChange = (id: string) => {
    if (locked) return;
    const at = id.indexOf(':');
    const kind = id.slice(0, at);
    const value = id.slice(at + 1);
    if (kind === 'group') {
      const name = summary.groups.find((group) => group.code === value)?.name ?? value;
      commit(revertGroup(draft, value), `${name} 그룹 배정 되돌리기`);
      announce(`${name} 그룹의 배정 변경을 되돌렸습니다.`);
      return;
    }
    const menuNo = Number(value);
    const name = menuLabel(draft.items, menuNo);
    if (kind === 'new') handleRemoveNew(menuNo, false);
    else if (kind === 'del') apply(markDeleted(draft, menuNo, false), `${name} 삭제 취소`, () => `${name} 메뉴의 삭제를 취소했습니다.`);
    else if (kind === 'place') apply(revertPlacement(draft, baseItems, menuNo), `${name} 위치 되돌리기`, () => `${name} 메뉴의 위치를 되돌렸습니다.`);
    else if (kind === 'props') apply(revertProperties(draft, baseItems, menuNo), `${name} 속성 되돌리기`, () => `${name} 메뉴의 속성을 되돌렸습니다.`);
  };

  return {
    handleShift,
    handleDrop,
    cancelCut,
    handleItemKeyDown,
    handleAdd,
    handleMoveConfirm,
    handleMoveCancel,
    handleEdit,
    handleDelete,
    handleRemoveNew,
    handleToggleNavigation,
    handleAddOperations,
    handleUndo,
    handleRevertAll,
    handleRevertChange,
  };
}
