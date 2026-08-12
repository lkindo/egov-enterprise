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


export function getCodeProjection(
  items: FlattenedCodeNode[],
  activeId: string,
  overId: string,
  _dragOffset: number,
  _indentationWidth: number
) {
  const overItemIndex = items.findIndex((item) => item.id === overId);
  const activeItemIndex = items.findIndex((item) => item.id === activeId);
  const activeItem = items[activeItemIndex];
  
  if (!activeItem) return null;

  // For Common Code, we only allow groups to be moved into clusters.
  // We don't allow clusters to become groups or vice versa via depth.
  // So depth is strictly fixed by type.
  
  const projectedDepth = activeItem.type === 'cluster' ? 0 : 1;
  
  // If moving a group, determine which cluster it's currently "over" in the flattened list
  let projectedParentId: string | null = activeItem.parentId;
  
  if (activeItem.type === 'group') {
    // Find the nearest cluster above the 'over' position
    for (let i = overItemIndex; i >= 0; i--) {
      if (items[i].type === 'cluster') {
        projectedParentId = items[i].id;
        break;
      }
    }
  }

  return {
    depth: projectedDepth,
    parentId: projectedParentId
  };
}
