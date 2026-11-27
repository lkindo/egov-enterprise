import { useCallback, useEffect, useMemo, useState, type SetStateAction } from 'react';

const EMPTY_SELECTED_IDS = new Set<unknown>();

interface StandardTableSelectionOptions<T> {
  data: T[];
  keyField: keyof T;
  /** 선택이 묶이는 범위 — 현재 페이지·적용 검색어·호출부의 selectionScope 중 하나라도 바뀌면 선택이 빈다. */
  currentPage: number | undefined;
  appliedKeyword: string;
  selectionScope: string | undefined;
  onSelectionCountChange?: (count: number) => void;
}

/**
 * StandardDataTable 의 행 선택 상태.
 *
 * 선택 집합은 페이지·적용 검색어·selectionScope 범위에 귀속한다. 범위가 바뀐 첫 렌더부터 빈 집합으로 보이므로 effect 의 후행
 * setState·추가 렌더 없이 이전 범위의 선택이 섞이지 않는다. 선택은 지금 보이는 행과의 교집합으로만 읽는다 — 일괄 삭제 뒤 목록을
 * 다시 읽어도 지워진 행의 키가 남으면 선택 수가 틀리고, 헤더 체크박스가 선택 수와 행 수가 우연히 같을 때 켜진다.
 */
export function useStandardTableSelection<T extends object>({
  data,
  keyField,
  currentPage,
  appliedKeyword,
  selectionScope,
  onSelectionCountChange,
}: StandardTableSelectionOptions<T>) {
  const [selectionState, setSelectionState] = useState<{
    currentPage: number | undefined;
    appliedKeyword: string;
    scope: string | undefined;
    ids: Set<unknown>;
  }>(() => ({ currentPage, appliedKeyword, scope: selectionScope, ids: new Set() }));
  const selectionMatchesScope = selectionState.currentPage === currentPage
    && selectionState.appliedKeyword === appliedKeyword
    && selectionState.scope === selectionScope;
  const scopedSelectedIds = selectionMatchesScope ? selectionState.ids : EMPTY_SELECTED_IDS;
  const setSelectedIds = useCallback((action: SetStateAction<Set<unknown>>) => {
    setSelectionState(previous => {
      const previousIds = previous.currentPage === currentPage
        && previous.appliedKeyword === appliedKeyword
        && previous.scope === selectionScope
        ? previous.ids
        : EMPTY_SELECTED_IDS;
      const ids = typeof action === 'function' ? action(previousIds) : action;
      return { currentPage, appliedKeyword, scope: selectionScope, ids };
    });
  }, [currentPage, appliedKeyword, selectionScope]);

  /** 지금 보이는 행 중 선택할 수 있는(키가 있는) 행의 키. */
  const rowKeys = useMemo(() => new Set<unknown>(
    (data || []).filter(item => item && item?.[keyField] !== undefined).map(item => item?.[keyField]),
  ), [data, keyField]);

  // 사라진 키는 저장된 선택에서도 지운다(렌더 중 조정) — 남겨 두면 같은 키의 행이 다시 나타날 때 선택된 채 돌아온다.
  const selectedIds = useMemo(() => {
    if ([...scopedSelectedIds].every((id) => rowKeys.has(id))) return scopedSelectedIds;
    return new Set([...scopedSelectedIds].filter((id) => rowKeys.has(id)));
  }, [scopedSelectedIds, rowKeys]);
  if (selectionMatchesScope && selectedIds !== scopedSelectedIds) {
    setSelectionState({ currentPage, appliedKeyword, scope: selectionScope, ids: selectedIds });
  }

  // 선택 수를 호출부에 알린다(opt-in). 렌더 중에 부모 상태를 바꾸지 않도록 effect 에서 부른다.
  const selectedCount = selectedIds.size;
  useEffect(() => {
    onSelectionCountChange?.(selectedCount);
  }, [selectedCount, onSelectionCountChange]);

  const selectedItems = useMemo(() =>
    (data || []).filter(item => item && selectedIds.has(item?.[keyField])),
    [data, selectedIds, keyField]
  );

  const allRowsSelected = rowKeys.size > 0 && selectedIds.size === rowKeys.size;
  const headerChecked: boolean | 'indeterminate' = allRowsSelected ? true : selectedIds.size > 0 ? 'indeterminate' : false;

  const toggleAll = useCallback(() => {
    setSelectedIds(allRowsSelected ? new Set() : new Set(rowKeys));
  }, [allRowsSelected, rowKeys, setSelectedIds]);

  const toggleOne = useCallback((id: unknown) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [setSelectedIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [setSelectedIds]);

  return { selectedIds, selectedItems, headerChecked, toggleAll, toggleOne, clearSelection };
}
