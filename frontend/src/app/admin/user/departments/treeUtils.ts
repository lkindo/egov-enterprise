import { Department } from '@/services/foundation/system/DeptAdminService';

/**
 * 서버가 이 부서의 상위로 지목했지만 **지금 로드된 목록에 없는** 상위 부서 ID.
 *
 * 부서 검색은 `ognzNm` 만 보므로 좁힌 결과에서 상위가 빠질 수 있다. 그 노드는 화면에 루트로
 * 그려지지만 그것은 "상위가 없다" 가 아니라 "상위를 지금 모른다" 이다. 이 구분을 버리면
 * 저장이 `up_ognz_id` 를 비워 실제 소속을 지운다(GAP-DEPT-001).
 *
 * 사용자가 그 노드를 직접 끌면 명시적 재배치이므로 `null` 로 해제한다.
 */
type UnloadedParent = { unloadedParentId: string | null };

export interface FlattenedDept extends Department, UnloadedParent {
  parentId: string | null;
  depth: number;
  index: number;
}

export interface DepartmentTreeNode extends Department, UnloadedParent {
  children: DepartmentTreeNode[];
}

export const flattenDeptTree = (
  items: readonly DepartmentTreeNode[],
  parentId: string | null = null,
  depth = 0
): FlattenedDept[] => {
  return items.reduce<FlattenedDept[]>((acc, item, index) => {
    const { children, ...department } = item;
    return [
      ...acc,
      { ...department, parentId, depth, index },
      ...flattenDeptTree(children, item.ognzId || null, depth + 1),
    ];
  }, []);
};

export const listToDeptTree = (flatDepts: Department[]): DepartmentTreeNode[] => {
  const map: Record<string, DepartmentTreeNode> = {};
  const roots: DepartmentTreeNode[] = [];

  // 1. 모든 노드를 맵에 등록 (id가 없으면 스킵)
  flatDepts.forEach((d) => {
    if (d && d.ognzId) {
      map[d.ognzId] = { ...d, children: [], unloadedParentId: null };
    }
  });

  // 2. 부모-자식 관계 구성.
  //    종전에는 물리 컬럼이 없어 존재하지 않는 upperOgnzId 를 @ts-ignore 로 읽었고(주석에 '시뮬레이션'이라
  //    적혀 있었다) 결과적으로 트리는 항상 전부 루트로 렌더됐다.
  //    V2_26 으로 up_ognz_id 가 생겨 실제 상위 부서를 그대로 쓴다.
  flatDepts.forEach((d) => {
    if (!d || !d.ognzId) return;
    const item = map[d.ognzId];

    const parentId = d.upOgnzId || null;

    if (!parentId || !map[parentId]) {
      // 상위가 있는데 목록에 없으면 루트로 그리되 그 사실을 들고 간다 — 저장이 지우지 않도록.
      if (parentId) item.unloadedParentId = parentId;
      roots.push(item);
    } else {
      const parent = map[parentId];
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(item);
      }
    }
  });

  return roots;
};

export const getDeptProjection = (
  items: FlattenedDept[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number
) => {
  const oldIndex = items.findIndex((m) => m.ognzId === activeId);
  const newIndex = items.findIndex((m) => m.ognzId === overId);
  const newItems = arrayMove(items, oldIndex, newIndex);
  
  const previousItem = newItems[newIndex - 1];
  const dragItem = newItems[newIndex];
  
  const projectedDepth = dragItem.depth + Math.round(dragOffset / indentationWidth);
  const minDepth = 0;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const depth = Math.max(minDepth, Math.min(maxDepth, projectedDepth));
  
  let parentId: string | null = null;
  if (depth === 0) {
    parentId = null;
  } else if (previousItem) {
    if (depth === previousItem.depth + 1) {
      parentId = previousItem.ognzId || null;
    } else {
      for (let i = newIndex - 1; i >= 0; i--) {
        if (newItems[i].depth === depth - 1) {
          parentId = newItems[i].ognzId || null;
          break;
        }
      }
    }
  }

  return { depth, parentId };
};

function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(to, 0, newArray.splice(from, 1)[0]);
  return newArray;
}

/** 계층 저장 요청의 한 행. `upOgnzId` 가 undefined 면 최상위다. */
export interface DeptHierarchyItem {
  ognzId: string;
  upOgnzId: string | undefined;
  sortOrdr: number;
}

/**
 * 화면 순서를 **형제 안 상대 순서**로 바꾼다(2026-09-26 DIP C5).
 *
 * 종전에는 평탄화 목록 전체의 순번(1..n)을 `sortOrdr` 로 보냈다. 검색으로 좁힌 화면에서 저장하면 서로 다른 상위의
 * 부서들이 1, 2, 3 을 나눠 가져 각 형제 집합 안의 실제 순서가 망가졌다. `sort_ordr` 는 같은 상위 아래의 순서다.
 * 상위를 모르는 노드(`unloadedParentId`)는 순서를 매기지 않는다 — 그 형제 집합 전체를 모르기 때문이다.
 */
export function siblingOrderedHierarchy(depts: readonly FlattenedDept[]): Map<string, DeptHierarchyItem> {
  const nextOrder = new Map<string | null, number>();
  const result = new Map<string, DeptHierarchyItem>();
  for (const dept of depts) {
    if (!dept.ognzId || dept.unloadedParentId) continue;
    const order = (nextOrder.get(dept.parentId) ?? 0) + 1;
    nextOrder.set(dept.parentId, order);
    result.set(dept.ognzId, { ognzId: dept.ognzId, upOgnzId: dept.parentId ?? undefined, sortOrdr: order });
  }
  return result;
}

/**
 * 기준선(서버에서 읽은 순서)과 달라진 부서만 고른다. 기준선이 없으면 전부다.
 * 안 만진 부서를 다시 보내면 검색으로 가려진 형제와 순번이 겹칠 수 있다 — 바뀐 것만 보낸다.
 */
export function changedDeptHierarchy(
  current: readonly FlattenedDept[],
  baseline?: readonly FlattenedDept[],
): DeptHierarchyItem[] {
  const next = siblingOrderedHierarchy(current);
  if (!baseline) return [...next.values()];
  const before = siblingOrderedHierarchy(baseline);
  return [...next.values()].filter((item) => {
    const previous = before.get(item.ognzId);
    return !previous || previous.upOgnzId !== item.upOgnzId || previous.sortOrdr !== item.sortOrdr;
  });
}

/** 부서와 그 하위 전부가 평탄화 목록에서 차지하는 구간 [start, end). */
function blockRange(items: readonly FlattenedDept[], start: number): [number, number] {
  const depth = items[start].depth;
  let end = start + 1;
  while (end < items.length && items[end].depth > depth) end += 1;
  return [start, end];
}

/**
 * [2026-10-01] 끌지 않고 상위 부서를 바꾼다 — 드래그의 키보드 대안이다. 기본 키보드 센서는 순서만 옮기고 깊이를
 * 바꾸지 못해, 키보드 사용자는 부서를 다른 부서 아래로 옮길 수 없었다. 하위 부서까지 함께 옮기며 새 상위의 마지막
 * 하위 뒤에 둔다. 자기 자신·자기 하위를 상위로 고르거나 상위가 그대로면 null 이다.
 */
export function reparentFlattened(
  items: readonly FlattenedDept[],
  ognzId: string,
  newParentId: string | null,
): FlattenedDept[] | null {
  const start = items.findIndex((n) => n.ognzId === ognzId);
  if (start < 0) return null;
  const node = items[start];
  if ((node.parentId ?? null) === newParentId && !node.unloadedParentId) return null;
  const [, end] = blockRange(items, start);
  const block = items.slice(start, end);
  if (newParentId !== null && block.some((n) => n.ognzId === newParentId)) return null;
  const rest = [...items.slice(0, start), ...items.slice(end)];
  let insertAt = rest.length;
  let newDepth = 0;
  if (newParentId !== null) {
    const parentIndex = rest.findIndex((n) => n.ognzId === newParentId);
    if (parentIndex < 0) return null;
    newDepth = rest[parentIndex].depth + 1;
    insertAt = blockRange(rest, parentIndex)[1];
  }
  const delta = newDepth - node.depth;
  const moved = block.map((n, i) => (i === 0
    ? { ...n, parentId: newParentId, depth: newDepth, unloadedParentId: null }
    : { ...n, depth: n.depth + delta }));
  return [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
}

/**
 * [2026-10-01] 같은 상위 아래에서 한 칸 위·아래로 옮긴다(하위 부서 포함) — 드래그의 키보드 대안이다. 옮길 형제가
 * 없거나, 상위가 조회 결과에 없어 형제를 알 수 없는 부서면 null 이다.
 */
export function shiftFlattened(
  items: readonly FlattenedDept[],
  ognzId: string,
  direction: 'up' | 'down',
): FlattenedDept[] | null {
  const start = items.findIndex((n) => n.ognzId === ognzId);
  if (start < 0) return null;
  const node = items[start];
  if (node.unloadedParentId) return null;
  const [, end] = blockRange(items, start);
  const isSibling = (n: FlattenedDept) => n.depth === node.depth && (n.parentId ?? null) === (node.parentId ?? null) && !n.unloadedParentId;
  if (direction === 'up') {
    let prev = start - 1;
    while (prev >= 0 && items[prev].depth > node.depth) prev -= 1;
    if (prev < 0 || !isSibling(items[prev])) return null;
    return [...items.slice(0, prev), ...items.slice(start, end), ...items.slice(prev, start), ...items.slice(end)];
  }
  if (end >= items.length || !isSibling(items[end])) return null;
  const [, nextEnd] = blockRange(items, end);
  return [...items.slice(0, start), ...items.slice(end, nextEnd), ...items.slice(start, end), ...items.slice(nextEnd)];
}
