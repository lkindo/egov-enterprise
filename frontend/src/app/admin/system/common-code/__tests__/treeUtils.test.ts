import { describe, expect, it } from 'vitest';
import type { DomainCluster, GroupCode } from '@/types/foundation/code';
import { flattenCodeTree } from '../treeUtils';

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

  // [2026-10-07] 운영이 쓰지 않던 getCodeProjection 과 그 계약을 걷었다. 끌기 판정은 CommonCodeClient 가
  //   'cluster 면 그 id, 아니면 parentId' 로 직접 하며, 그 결과(다른 분류로 옮긴 그룹의 parentId)는
  //   CommonCodeClient.test.tsx 가 검증한다.
});
