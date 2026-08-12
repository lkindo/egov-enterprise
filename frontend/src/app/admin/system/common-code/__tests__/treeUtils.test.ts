import { describe, expect, it } from 'vitest';
import type { DomainCluster, GroupCode } from '@/types/foundation/code';
import { flattenCodeTree, getCodeProjection } from '../treeUtils';

const group = (cdId: string, cdIdNm: string): GroupCode => ({
  cdId,
  cdIdNm,
  cdIdExpln: '',
  clsfCd: 'CLASS',
  useYn: 'Y',
  details: [],
});

const cluster = (id: string, name: string, groups: GroupCode[] = []): DomainCluster => ({
  id,
  name,
  groups,
  clsfCd: id,
  clsfCdNm: name,
  clsfCdExpln: '',
  useYn: 'Y',
});

describe('common-code treeUtils', () => {
  it('분류와 그룹을 판별 가능한 평면 노드로 변환한다', () => {
    const source = [cluster('A', '분류 A', [group('A1', '그룹 A1')])];

    const flattened = flattenCodeTree(source);

    expect(flattened).toEqual([
      { id: 'A', parentId: null, name: '분류 A', type: 'cluster', data: source[0], depth: 0 },
      { id: 'A1', parentId: 'A', name: '그룹 A1', type: 'group', data: source[0].groups[0], depth: 1 },
    ]);
  });

  it('그룹은 over 위치 위의 가장 가까운 분류로만 이동한다', () => {
    const flattened = flattenCodeTree([
      cluster('A', '분류 A', [group('A1', '그룹 A1')]),
      cluster('B', '분류 B', [group('B1', '그룹 B1')]),
    ]);

    expect(getCodeProjection(flattened, 'A1', 'B1', 999, 1))
      .toEqual({ depth: 1, parentId: 'B' });
    expect(getCodeProjection(flattened, 'B', 'A1', -999, 1))
      .toEqual({ depth: 0, parentId: null });
  });

  it('존재하지 않는 active 노드는 projection을 만들지 않는다', () => {
    const flattened = flattenCodeTree([cluster('A', '분류 A')]);

    expect(getCodeProjection(flattened, 'MISSING', 'A', 0, 24)).toBeNull();
  });
});
