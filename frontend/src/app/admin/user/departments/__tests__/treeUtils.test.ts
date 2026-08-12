import { describe, expect, it } from 'vitest';
import type { Department } from '@/services/foundation/system/DeptAdminService';
import { flattenDeptTree, getDeptProjection, listToDeptTree } from '../treeUtils';

const department = (ognzId: string, overrides: Partial<Department> = {}): Department => ({
  ognzId,
  ognzNm: `dept-${ognzId}`,
  ...overrides,
});

describe('department treeUtils', () => {
  it('부모-자식과 고아 부서를 구분하고 입력 객체를 변경하지 않는다', () => {
    const flat = [
      department('ROOT'),
      department('CHILD', { upOgnzId: 'ROOT' }),
      department('ORPHAN', { upOgnzId: 'MISSING' }),
    ];

    const tree = listToDeptTree(flat);

    expect(tree.map((node) => node.ognzId)).toEqual(['ROOT', 'ORPHAN']);
    expect(tree[0].children.map((node) => node.ognzId)).toEqual(['CHILD']);
    expect(flat.every((node) => !('children' in node))).toBe(true);
  });

  it('계층을 depth·parentId·형제 index가 있는 편집 목록으로 평탄화한다', () => {
    const flattened = flattenDeptTree(listToDeptTree([
      department('ROOT'),
      department('A', { upOgnzId: 'ROOT' }),
      department('B', { upOgnzId: 'ROOT' }),
    ]));

    expect(flattened.map(({ ognzId, parentId, depth, index }) => ({ ognzId, parentId, depth, index })))
      .toEqual([
        { ognzId: 'ROOT', parentId: null, depth: 0, index: 0 },
        { ognzId: 'A', parentId: 'ROOT', depth: 1, index: 0 },
        { ognzId: 'B', parentId: 'ROOT', depth: 1, index: 1 },
      ]);
  });

  it('드래그 offset을 유효 깊이로 제한하고 바로 앞 노드를 부모로 선택한다', () => {
    const flattened = flattenDeptTree(listToDeptTree([
      department('ROOT'),
      department('NEXT'),
    ]));

    expect(getDeptProjection(flattened, 'NEXT', 'NEXT', 24, 24))
      .toEqual({ depth: 1, parentId: 'ROOT' });
    expect(getDeptProjection(flattened, 'NEXT', 'NEXT', -48, 24))
      .toEqual({ depth: 0, parentId: null });
  });
});
