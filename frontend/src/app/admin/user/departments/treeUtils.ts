import { Department } from '@/services/foundation/system/DeptAdminService';

export interface FlattenedDept extends Department {
  parentId: string | null;
  depth: number;
  index: number;
}

export const flattenDeptTree = (
  items: (Department & { children?: Department[] })[],
  parentId: string | null = null,
  depth = 0
): FlattenedDept[] => {
  return items.reduce<FlattenedDept[]>((acc, item, index) => {
    return [
      ...acc,
      { ...item, parentId, depth, index } as FlattenedDept,
      ...flattenDeptTree(item.children || [], item.ognzId || null, depth + 1),
    ];
  }, []);
};

export const listToDeptTree = (flatDepts: Department[]): any[] => {
  const map: Record<string, any> = {};
  const roots: any[] = [];

  // 1. 모든 노드를 맵에 등록 (id가 없으면 스킵)
  flatDepts.forEach((d) => {
    if (d && d.ognzId) {
      map[d.ognzId] = { ...d, children: [] };
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
