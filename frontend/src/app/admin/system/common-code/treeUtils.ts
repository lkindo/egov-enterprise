import type { DomainCluster, GroupCode } from '@/types/foundation/code';

interface FlattenedCodeNodeBase {
  id: string;
  name: string;
}

export interface FlattenedClusterNode extends FlattenedCodeNodeBase {
  parentId: null;
  type: 'cluster';
  data: DomainCluster;
  depth: 0;
}

export interface FlattenedGroupNode extends FlattenedCodeNodeBase {
  parentId: string;
  type: 'group';
  data: GroupCode;
  depth: 1;
}

export type FlattenedCodeNode = FlattenedClusterNode | FlattenedGroupNode;

export function flattenCodeTree(clusters: DomainCluster[]): FlattenedCodeNode[] {
  const flattened: FlattenedCodeNode[] = [];

  clusters.forEach(cluster => {
    flattened.push({
      id: cluster.id,
      parentId: null,
      name: cluster.name,
      type: 'cluster',
      data: cluster,
      depth: 0
    });

    if (cluster.groups) {
      cluster.groups.forEach(group => {
        flattened.push({
          id: group.cdId,
          parentId: cluster.id,
          name: group.cdIdNm,
          type: 'group',
          data: group,
          depth: 1
        });
      });
    }
  });

  return flattened;
}
