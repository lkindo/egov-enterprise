'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { deptAdminService, Department } from '@/services/foundation/system/DeptAdminService';
import { PageResponse } from '@/types/foundation/system';
import { flattenDeptTree, listToDeptTree, getDeptProjection, FlattenedDept } from './departments/treeUtils';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { INDENTATION_WIDTH } from './UserOrgHubParts';

/**
 * 부서 목록 조회 크기.
 * 조직도(D&D 트리)와 '부서 이동' 모달의 대상 선택은 계층 전체가 있어야 성립한다 — 페이징과 상극이다.
 * 서버는 Spring Pageable(page/size, 0-based)을 그대로 받으므로 충분히 큰 size 로 전량을 끌어온다.
 * (종전 size:10 → 11번째 부서부터 트리에서도 모달에서도 보이지 않았다.)
 */
const DEPT_LIST_SIZE = 1000;
const DEPT_PAGE = 1;

/**
 * 사용자·조직 허브의 부서 조회와 조직도 드래그 상태.
 *
 * 조회·평탄화·드래그 투영만 둔다. 계층 저장·부서 삭제 같은 쓰기와 그 잠금은 UserOrgHubClient 가 소유한다.
 */
export function useDeptTree({
  deptKeyword,
  initialDepts,
  enabled,
  onDragSelect,
}: {
  /** 부서 탭에서만 검색어를 태운다 — 호출부가 결정한다. */
  deptKeyword: string;
  initialDepts: PageResponse<Department> | null;
  enabled: boolean;
  /** 드래그를 시작한 부서를 선택 상태로 만든다(선택은 허브가 소유한다). */
  onDragSelect: (ognzId: string) => void;
}) {
  /**
   * 서버 프리페치(page.tsx)는 size=10 으로 잘린 목록일 수 있다. 잘린 시드를 initialData 로 쓰면
   * 전역 staleTime(60s) 동안 재조회가 일어나지 않아 10건 절단이 그대로 유지된다.
   * 전량(total)을 담고 있을 때만 시드로 채택한다.
   */
  const initialDeptsSeed = useMemo(() => {
    const list = initialDepts?.list;
    const total = initialDepts?.total;
    return Array.isArray(list) && typeof total === 'number' && list.length >= total ? (initialDepts ?? undefined) : undefined;
  }, [initialDepts]);

  const { data: deptsData, isLoading: isDeptsLoading, isError: isDeptsError, error: deptsError, refetch: refetchDepts } = useQuery({
    queryKey: ['admin-depts', deptKeyword, DEPT_PAGE],
    // 서버는 keyword + Spring Pageable(page/size, 0-based)을 읽는다. 종전의 {pageNo, searchKeyword}는
    // ApiService 매핑 대상이 아니라 그대로 전달돼 무시됐고, 검색어가 서버에 닿지 않았다.
    queryFn: () => deptAdminService.getDeptList({ keyword: deptKeyword, page: DEPT_PAGE - 1, size: DEPT_LIST_SIZE }),
    // 부서 탭뿐 아니라 '부서 이동' 모달·사용자 등록/수정 폼(소속 부서 선택)에서도 목록이 필요하다.
    // 종전에는 DEPTS 탭에서만 조회해 USERS 탭의 모달이 항상 빈 상자였다.
    enabled,
    initialData: !deptKeyword ? initialDeptsSeed : undefined
  });

  // D&D States for Depts
  const [flattenedDepts, setFlattenedDepts] = useState<FlattenedDept[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  /** 드래그 중 가로 이동 거리. 이 값으로 계층(깊이)이 결정된다 — 없으면 순서만 바뀌고 계층은 그대로다. */
  const [deptOffsetLeft, setDeptOffsetLeft] = useState(0);
  /** 현재 드롭 대상. 메뉴 관리(MenuAdminClient)와 동일하게 실시간 투영을 계산하기 위해 추적한다. */
  const [overDeptId, setOverDeptId] = useState<string | null>(null);
  const [hasDeptChanges, setHasDeptChanges] = useState(false);

  /**
   * 드래그 중 투영(projection) — 지금 놓으면 어떤 깊이/부모가 되는지 실시간 계산한다.
   * 종전에는 onDragEnd 에서만 계산해, 끄는 동안 결과를 알 수 없었고 최상단 이동이나
   * 부모 전환이 의도대로 됐는지 놓아봐야만 알 수 있었다. (메뉴 관리와 동일한 패턴)
   */
  const deptProjected = useMemo(() => {
    if (!activeDeptId || !overDeptId) return null;
    return getDeptProjection(flattenedDepts, activeDeptId, overDeptId, deptOffsetLeft, INDENTATION_WIDTH);
  }, [flattenedDepts, activeDeptId, overDeptId, deptOffsetLeft]);

  /** 드래그 중인 노드에 투영 깊이를 입혀 들여쓰기가 즉시 보이게 한다. */
  const previewDepts = useMemo(
    () => flattenedDepts.map((n) =>
      n.ognzId === activeDeptId && deptProjected ? { ...n, depth: deptProjected.depth } : n
    ),
    [flattenedDepts, activeDeptId, deptProjected]
  );

  const departments = useMemo(() => {
    const list = deptsData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as Department[];
  }, [deptsData]);

  // 평탄화는 탭과 무관하게 수행한다. 종전에는 DEPTS 탭 조건이 걸려 있어 USERS 탭의
  // '부서 이동' 모달이 렌더하는 flattenedDepts 가 언제나 빈 배열이었다.
  //
  // ⚠ [2026-09-22] 렌더 중 파생 패턴은 **변화만** 처리한다. 초기값을 `useState(departments)` 로
  //   두면 첫 렌더 값과 같아 조건이 한 번도 성립하지 않는데, 이 훅은 `initialDepts`(서버
  //   프리페치 시드)를 initialData 로 쓰므로 **첫 렌더에 이미 데이터가 있다.** 그래서
  //   부서 트리가 빈 채로 렌더됐다(계약 4건 red 로 실측). useEffect 는 마운트 후 무조건
  //   한 번 돌아 이 차이가 없었다.
  //   sentinel(null)로 두면 첫 렌더에서도 반드시 한 번 동기화하면서 cascading render 는
  //   그대로 피한다 — 이 자리에서 setState 는 커밋 전에 즉시 재렌더된다.
  const [prevDepartments, setPrevDepartments] = useState<Department[] | null>(null);
  /** 서버에서 읽은 순서. 저장은 이것과 달라진 부서만 보낸다(DIP C5). */
  const [baselineDepts, setBaselineDepts] = useState<FlattenedDept[]>([]);
  /** 저장하지 않은 드래그가 있는 동안 서버 목록이 바뀌었는가. */
  const [deptListChangedWhileEditing, setDeptListChangedWhileEditing] = useState(false);
  if (departments !== prevDepartments) {
    setPrevDepartments(departments);
    /*
      [2026-09-26 DIP C5] 저장하지 않은 드래그가 있으면 재조회가 트리를 덮지 않는다. 종전에는 서버 목록으로
      다시 그려 드래그가 조용히 사라졌는데 '변경됨' 은 남아, 저장을 눌러도 아무것도 바뀌지 않았다.
      대신 목록이 바뀌었다는 사실을 알리고, 사용자가 저장하거나 변경을 취소하게 한다.
    */
    if (hasDeptChanges) {
      setDeptListChangedWhileEditing(true);
    } else {
      const flattened = flattenDeptTree(listToDeptTree(departments));
      setFlattenedDepts(flattened);
      setBaselineDepts(flattened);
      setDeptListChangedWhileEditing(false);
    }
  }

  /** 저장하지 않은 드래그를 버리고 서버 목록으로 되돌린다. */
  const discardDeptChanges = () => {
    const flattened = flattenDeptTree(listToDeptTree(departments));
    setFlattenedDepts(flattened);
    setBaselineDepts(flattened);
    setHasDeptChanges(false);
    setDeptListChangedWhileEditing(false);
  };

  /** 저장에 성공하면 지금 화면이 새 기준선이다. */
  const markDeptChangesSaved = () => {
    setBaselineDepts(flattenedDepts);
    setHasDeptChanges(false);
    setDeptListChangedWhileEditing(false);
  };

  // 저장하지 않은 계층 변경이 있으면 화면을 떠나기 전에 확인한다(DIP C5).
  useUnsavedChanges({ dirty: hasDeptChanges });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dragHandlers = {
    onDragStart: ({ active }: DragStartEvent) => {
      setActiveDeptId(active.id as string);
      onDragSelect(active.id as string);
      // 시작 시 드롭 대상을 자기 자신으로 두어야 첫 프레임부터 투영이 계산된다.
      setOverDeptId(active.id as string);
      setDeptOffsetLeft(0);
    },
    onDragOver: ({ over }: DragOverEvent) => setOverDeptId((over?.id as string) ?? null),
    // ⚠ 계층(깊이) 변경은 '가로' 드래그 거리로 결정된다. 종전에는 이 핸들러가 없어
    //    getDeptProjection 에 dragOffset=0 이 고정으로 들어갔고, 그 결과
    //    projectedDepth = dragItem.depth + Math.round(0 / indentationWidth) = 기존 깊이
    //    가 되어 아무리 끌어도 계층이 바뀌지 않고 순서만 바뀌었다.
    //    (메뉴 관리 화면 MenuAdminClient 는 이 패턴을 이미 갖추고 있다.)
    onDragMove: ({ delta }: DragMoveEvent) => setDeptOffsetLeft(delta.x),
    onDragEnd: ({ active, over }: DragEndEvent) => {
      // 제자리에 놓아도(active===over) 가로로 밀어 깊이만 바꾸는 경우가 있으므로
      // 위치 변경 여부가 아니라 투영 결과를 기준으로 반영한다.
      if (over && deptProjected) {
        /*
          ⚠ 잡았다 놓기만 해도 '변경됨' 이 되면 안 된다 — 저장 버튼이 켜지지만 바꿀 것이 없다(G10).
            종전에는 투영이 있다는 사실만 봐서, 가로로 밀지 않고 제자리에 놓아도 켜졌다.
            자리(순서)나 상위·깊이 중 하나라도 실제로 달라졌을 때만 켠다.
        */
        const before = flattenedDepts.find((n) => n.ognzId === active.id);
        const changed =
          active.id !== over.id ||
          !before ||
          before.parentId !== deptProjected.parentId ||
          before.depth !== deptProjected.depth;
        setFlattenedDepts((items) => {
          const oldIndex = items.findIndex(n => n.ognzId === active.id);
          const newIndex = items.findIndex(n => n.ognzId === over.id);
          const newItems = oldIndex === newIndex ? items.slice() : arrayMove(items, oldIndex, newIndex);
          const idx = newItems.findIndex(n => n.ognzId === active.id);
          // 끌었다는 것은 이 부서의 자리를 사용자가 직접 정했다는 뜻이다 — 상위를 모른다는 표시를
          // 해제해야 저장이 새 자리를 반영한다(해제하지 않으면 드래그가 조용히 무시된다).
          newItems[idx] = {
            ...newItems[idx],
            parentId: deptProjected.parentId,
            depth: deptProjected.depth,
            unloadedParentId: null,
          };
          return newItems;
        });
        if (changed) setHasDeptChanges(true);
      }
      setActiveDeptId(null);
      setOverDeptId(null);
      setDeptOffsetLeft(0);
    },
  };

  return {
    isDeptsLoading,
    isDeptsError,
    deptsError,
    refetchDepts,
    departments,
    /**
     * 서버가 말한 조회 결과 수.
     *
     * ⚠ 결과 툴바의 총 건수를 `flattenedDepts.length` 로 세면 안 된다 — 그 값은 effect 파생이라
     *   SSR 과 첫 클라이언트 렌더에서 항상 0 이고, 검색어가 바뀌어 재조회가 도는 동안에도 0 으로
     *   떨어진다. 화면은 데이터가 있는데 "총 0건" 이라고 말하게 된다. 조회 중에는 `undefined` 를
     *   내어 아무 수치도 주장하지 않는 편이 옳다(사용자 목록의 `usersData?.total` 과 같은 규칙).
     */
    deptTotal: deptsData?.total,
    flattenedDepts,
    activeDeptId,
    hasDeptChanges,
    setHasDeptChanges,
    baselineDepts,
    deptListChangedWhileEditing,
    discardDeptChanges,
    markDeptChangesSaved,
    previewDepts,
    sensors,
    dragHandlers,
  };
}
