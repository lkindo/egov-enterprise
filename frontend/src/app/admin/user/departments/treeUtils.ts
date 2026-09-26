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
