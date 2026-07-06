import { DeptDto } from '@/services/foundation/user/DeptAdminService';

export interface FlattenedDept extends DeptDto {
  parentId: string | null;
  depth: number;
  index: number;
}

export const flattenDeptTree = (
  items: (DeptDto & { children?: DeptDto[] })[],
  parentId: string | null = null,
  depth = 0
): FlattenedDept[] => {
  return items.reduce<FlattenedDept[]>((acc, item, index) => {
    return [
      ...acc,
      { ...item, parentId, depth, index } as FlattenedDept,
      ...flattenDeptTree((item as any).children || [], item.ognzId || null, depth + 1),
    ];
  }, []);
};

export const listToDeptTree = (flatDepts: DeptDto[]): any[] => {
  const map: Record<string, any> = {};
  const roots: any[] = [];

  // 1. 모든 노드를 맵에 등록 (id가 없으면 스킵)
  flatDepts.forEach((d) => {
    if (d && d.ognzId) {
      map[d.ognzId] = { ...d, children: [] };
    }
  });

  // 2. 부모-자식 관계 구성 (상황에 따라 시뮬레이션 필요)
  // 실제 DB에 upperOgnzId가 없을 경우를 대비해, 
  // 여기서는 ognzId 패턴이나 특정 규칙으로 시뮬레이션할 수도 있음.
  // 우선은 DeptDto에 upperOgnzId가 있다고 가정하거나 확장해서 처리.
  flatDepts.forEach((d) => {
    if (!d || !d.ognzId) return;
    const item = map[d.ognzId];
    
    // @ts-ignore - 시뮬레이션을 위해 upperOgnzId 필드 사용
    const parentId = (d as any).upperOgnzId || null;

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
