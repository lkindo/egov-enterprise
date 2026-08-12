import { describe, expect, it } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import {
  buildTree,
  flattenTree,
  getProjection,
  insertItem,
  listToTree,
  removeItem,
} from '../treeUtils';

const menu = (menuNo: number, overrides: Partial<MenuInfo> = {}): MenuInfo => ({
  menuNo,
  menuNm: `menu-${menuNo}`,
  upperMenuId: 0,
  upMenuSn: 0,
  menuOrdr: menuNo,
  ...overrides,
});

describe('menu treeUtils', () => {
  it('평면 목록을 계층으로 만들고 루트와 자식을 순서대로 정렬한다', () => {
    const flat = [
      menu(1, { menuOrdr: 2 }),
      menu(2, { upperMenuId: 1, upMenuSn: 1, menuOrdr: 2 }),
      menu(3, { upperMenuId: 1, upMenuSn: 1, menuOrdr: 1 }),
      menu(4, { upperMenuId: 99, upMenuSn: 99, menuOrdr: 1 }),
    ];

    const tree = listToTree(flat);

    expect(tree.map((node) => node.menuNo)).toEqual([4, 1]);
    expect(tree[1].children?.map((node) => node.menuNo)).toEqual([3, 2]);
    expect(flat.every((node) => node.children === undefined)).toBe(true);
  });

  it('계층을 평탄화한 뒤 부모 관계를 보존해 다시 만든다', () => {
    const tree = [menu(1, { children: [menu(2), menu(3)] })];

    const flattened = flattenTree(tree);
    const rebuilt = buildTree(flattened);

    expect(flattened.map(({ menuNo, parentId, depth, index }) => ({ menuNo, parentId, depth, index })))
      .toEqual([
        { menuNo: 1, parentId: null, depth: 0, index: 0 },
        { menuNo: 2, parentId: 1, depth: 1, index: 0 },
        { menuNo: 3, parentId: 1, depth: 1, index: 1 },
      ]);
    expect(rebuilt[0].children?.map((node) => node.menuNo)).toEqual([2, 3]);
  });

  it('항목 제거 시 연속된 하위 트리만 함께 제거하고 원본은 보존한다', () => {
    const flattened = flattenTree([
      menu(1, { children: [menu(2, { children: [menu(3)] })] }),
      menu(4),
    ]);

    const removed = removeItem(flattened, 2);

    expect(removed.map((node) => node.menuNo)).toEqual([1, 4]);
    expect(flattened.map((node) => node.menuNo)).toEqual([1, 2, 3, 4]);
    expect(removeItem(flattened, 999)).toBe(flattened);
  });

  it('삽입과 수평 드래그 projection으로 새 부모를 계산한다', () => {
    const flattened = flattenTree([menu(1), menu(2)]);
    const inserted = insertItem(flattened, { ...menu(3), parentId: null, depth: 0, index: 2 }, 1);

    expect(inserted.map((node) => node.menuNo)).toEqual([1, 3, 2]);
    expect(flattened.map((node) => node.menuNo)).toEqual([1, 2]);
    expect(getProjection(flattened, 2, 2, 20, 20)).toEqual({ depth: 1, parentId: 1 });
    expect(getProjection(flattened, 2, 2, -40, 20)).toEqual({ depth: 0, parentId: null });
  });
});
