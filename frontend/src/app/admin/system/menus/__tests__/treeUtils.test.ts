import { describe, expect, it } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { flattenTree, listToTree } from '../treeUtils';

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

  it('계층을 평탄화하며 부모·깊이·형제 순번을 보존한다', () => {
    const tree = [menu(1, { children: [menu(2), menu(3)] })];

    const flattened = flattenTree(tree);

    expect(flattened.map(({ menuNo, parentId, depth, index }) => ({ menuNo, parentId, depth, index })))
      .toEqual([
        { menuNo: 1, parentId: null, depth: 0, index: 0 },
        { menuNo: 2, parentId: 1, depth: 1, index: 0 },
        { menuNo: 3, parentId: 1, depth: 1, index: 1 },
      ]);
  });

  /*
    [2026-10-07] 구 트리 끌기 헬퍼(buildTree·removeItem·insertItem·getProjection)와 그 계약을 걷었다.
    DEC-OPS-209 보드 재작성 뒤 끌기·놓을 곳 판정은 menuBoardModel 과 menuDraft(moveBlock·placementProblem)가
    맡고 menuBoardModel.test.ts·menuDraft.test.ts 가 검증한다.
  */

  it('[2026-10-02] 같은 정렬 순서는 메뉴 번호로 정해 같은 데이터를 늘 같은 순서로 그린다', () => {
    const tree = listToTree([menu(9, { menuOrdr: 1 }), menu(3, { menuOrdr: 1 }), menu(5, { menuOrdr: 0 })]);
    expect(tree.map((node) => node.menuNo)).toEqual([5, 3, 9]);
  });
});
