import { MenuInfo } from '@/types/foundation/menu';

export interface FlattenedItem extends MenuInfo {
  parentId: number | null;
  depth: number;
  index: number;
}

export const flattenTree = (
  items: MenuInfo[],
  parentId: number | null = null,
  depth = 0
): FlattenedItem[] => {
  return items.reduce<FlattenedItem[]>((acc, item, index) => {
    return [
      ...acc,
      { ...item, parentId, depth, index },
      ...flattenTree(item.children || [], item.menuNo, depth + 1),
    ];
  }, []);
};

export const buildTree = (flattenedItems: FlattenedItem[]): MenuInfo[] => {
  const rootItems: MenuInfo[] = [];
  const map: Record<number, MenuInfo> = {};

  flattenedItems.forEach((item) => {
    map[item.menuNo] = { ...item, children: [] };
  });

  flattenedItems.forEach((item) => {
    const node = map[item.menuNo];
    if (item.parentId === null || item.parentId === 0) {
      rootItems.push(node);
    } else {
      const parent = map[item.parentId];
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        rootItems.push(node);
      }
    }
  });

  return rootItems;
};

export const findId = (items: FlattenedItem[], id: number) => {
  return items.findIndex((item) => item.menuNo === id);
};

export const listToTree = (flatMenus: MenuInfo[]): MenuInfo[] => {
  const map: Record<number, MenuInfo> = {};
  const roots: MenuInfo[] = [];

  flatMenus.forEach((m) => {
    if (m && m.menuNo) {
      map[m.menuNo] = { ...m, children: [] };
    }
  });

  flatMenus.forEach((m) => {
    if (!m || !m.menuNo) return;
    const item = map[m.menuNo];
    const parentId = m.upperMenuNo ?? m.upperMenuId ?? 0;

    if (parentId === 0 || !map[parentId]) {
      roots.push(item);
    } else {
      const parent = map[parentId];
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(item);
      }
    }
  });

  // 정렬 순서(menuOrdr)에 따라 정렬
  const sortByOrder = (a: MenuInfo, b: MenuInfo) => (a.menuOrdr || 0) - (b.menuOrdr || 0);
  roots.sort(sortByOrder);
  
  const sortRecursive = (node: MenuInfo) => {
    if (node.children && node.children.length > 0) {
      node.children.sort(sortByOrder);
      node.children.forEach(sortRecursive);
    }
  };
  roots.forEach(sortRecursive);

  return roots;
};

export const removeItem = (items: FlattenedItem[], id: number) => {
  const index = findId(items, id);
  if (index === -1) return items;
  
  const newItems = [...items];
  const item = newItems[index];
  
  // 하위 아이템들도 함께 제거
  let count = 1;
  for (let i = index + 1; i < newItems.length; i++) {
    if (newItems[i].depth > item.depth) {
      count++;
    } else {
      break;
    }
  }
  
  newItems.splice(index, count);
  return newItems;
};

export const insertItem = (
  items: FlattenedItem[],
  item: FlattenedItem,
  index: number
) => {
  const newItems = [...items];
  newItems.splice(index, 0, item);
  return newItems;
};

export const getProjection = (
  items: FlattenedItem[],
  activeId: number,
  overId: number,
  dragOffset: number,
  indentationWidth: number
) => {
  const oldIndex = items.findIndex((m) => m.menuNo === activeId);
  const newIndex = items.findIndex((m) => m.menuNo === overId);
  const newItems = arrayMove(items, oldIndex, newIndex);
  
  const previousItem = newItems[newIndex - 1];
  const nextItem = newItems[newIndex + 1];
  const dragItem = newItems[newIndex];
  
  // 가로 오프셋에 따른 depth 계산
  const projectedDepth = dragItem.depth + Math.round(dragOffset / indentationWidth);
  
  // 유효한 depth 범위 제한 (최상위 ~ 이전 아이템 depth + 1)
  const minDepth = 0;
  const maxDepth = previousItem ? previousItem.depth + 1 : 0;
  const depth = Math.max(minDepth, Math.min(maxDepth, projectedDepth));
  
  // ParentId 결정
  let parentId: number | null = null;
  if (depth === 0) {
    parentId = null;
  } else if (previousItem) {
    if (depth === previousItem.depth + 1) {
      parentId = previousItem.menuNo;
    } else {
      // 위로 거슬러 올라가며 같은 depth의 부모를 찾음
      for (let i = newIndex - 1; i >= 0; i--) {
        if (newItems[i].depth === depth - 1) {
          parentId = newItems[i].menuNo;
          break;
        }
      }
    }
  }

  return { depth, parentId };
};

// Helper for arrayMove (if not imported from dnd-kit)
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice();
  newArray.splice(to, 0, newArray.splice(from, 1)[0]);
  return newArray;
}
