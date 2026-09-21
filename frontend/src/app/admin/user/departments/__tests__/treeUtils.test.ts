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

  /*
    GAP-DEPT-001 — 루트로 그리는 것과 "상위가 없다" 는 다르다.

    부서 검색은 `ognzNm` 만 보므로 좁힌 결과에서 상위가 빠질 수 있다. 그 사실을 여기서 버리면
    평탄화가 parentId=null 을 주고 저장이 `up_ognz_id` 를 지운다. 세 갈래를 대조군으로 함께 고정한다.
  */
  it('상위가 로드 목록에 없으면 루트로 그리되 그 상위 ID를 표시로 남긴다', () => {
    const tree = listToDeptTree([
      department('ROOT'),
      department('CHILD', { upOgnzId: 'ROOT' }),
      department('ORPHAN', { upOgnzId: 'MISSING' }),
    ]);

    const byId = Object.fromEntries(
      [...tree, ...tree.flatMap((node) => node.children)].map((node) => [node.ognzId, node])
    );

    // 상위를 모르는 부서만 표시가 붙는다.
    expect(byId.ORPHAN.unloadedParentId).toBe('MISSING');
    // 진짜 최상위는 상위가 없는 것이지 모르는 것이 아니다 — 표시가 붙으면 저장이 막혀 버린다.
    expect(byId.ROOT.unloadedParentId).toBeNull();
    // 상위가 목록에 있는 부서도 표시가 없어야 정상 저장된다.
    expect(byId.CHILD.unloadedParentId).toBeNull();
  });

  it('평탄화가 그 표시를 편집 목록까지 옮긴다', () => {
    const flattened = flattenDeptTree(listToDeptTree([
      department('ROOT'),
      department('ORPHAN', { upOgnzId: 'MISSING' }),
    ]));

    expect(flattened.map(({ ognzId, parentId, unloadedParentId }) => ({ ognzId, parentId, unloadedParentId })))
      .toEqual([
        { ognzId: 'ROOT', parentId: null, unloadedParentId: null },
        // parentId 는 null 이지만 unloadedParentId 가 "비어서가 아니라 몰라서" 임을 말한다.
        { ognzId: 'ORPHAN', parentId: null, unloadedParentId: 'MISSING' },
      ]);
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
