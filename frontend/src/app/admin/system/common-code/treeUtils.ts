import { DomainCluster, GroupCode } from '@/types/foundation/code';
import { arrayMove } from '@dnd-kit/sortable';

export interface FlattenedCodeNode {
  id: string;
  parentId: string | null;
  name: string;
  type: 'cluster' | 'group';
  data: any;
  depth: number;
}

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
          id: (group as any).codeId || '',
          parentId: cluster.id,
          name: (group as any).codeIdNm || '',
          type: 'group',
          data: group,
          depth: 1
        });
      });
    }
  });

  return flattened;
}

export function rebuildCodeTree(flattened: FlattenedCodeNode[]): DomainCluster[] {
  const clusters: DomainCluster[] = [];
  const clusterMap = new Map<string, DomainCluster>();

  // First pass: extract clusters
  flattened.filter(node => node.type === 'cluster').forEach(node => {
    const cluster = { ...node.data, groups: [] };
    clusters.push(cluster);
    clusterMap.set(node.id, cluster);
  });

  // Second pass: assign groups to clusters
  flattened.filter(node => node.type === 'group').forEach(node => {
    const cluster = clusterMap.get(node.parentId || '');
    if (cluster) {
      cluster.groups.push({ ...node.data });
    }
  });

  return clusters;
}

export function getCodeProjection(
  items: FlattenedCodeNode[],
  activeId: string,
  overId: string,
  dragOffset: number,
  indentationWidth: number
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
