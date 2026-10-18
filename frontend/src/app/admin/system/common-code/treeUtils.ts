import type { DomainCluster, GroupCode } from '@/types/foundation/code';
import type { CmmnClCode, CmmnCode } from '@/types/foundation/system';

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

export function buildInitialCodeClusters(
  clCodes: CmmnClCode[],
  groups: CmmnCode[],
): DomainCluster[] {
  const compareId = (left: string | undefined, right: string | undefined) => {
    const safeLeft = left ?? '';
    const safeRight = right ?? '';
    return safeLeft < safeRight ? -1 : safeLeft > safeRight ? 1 : 0;
  };
  const safeClCodes = Array.isArray(clCodes)
    ? [...clCodes.filter(Boolean)].sort((left, right) => compareId(left.clsfCd, right.clsfCd))
    : [];
  const safeGroups = Array.isArray(groups)
    ? [...groups.filter(Boolean)].sort((left, right) => compareId(left.cdId, right.cdId))
    : [];

  return safeClCodes.map((cl) => ({
    ...cl,
    id: cl.clsfCd || '',
    name: cl.clsfCdNm || '',
    groups: safeGroups
      .filter((g) => g.clsfCd === cl.clsfCd)
      .map((g) => ({
        ...g,
        details: [],
      })) as GroupCode[],
  })) as DomainCluster[];
}

export function findGroupInClusters(
  clusters: DomainCluster[],
  groupId: string,
): { cluster: DomainCluster; group: GroupCode } | null {
  const cluster = clusters.find((item) => (item.groups || []).some((group) => group?.cdId === groupId));
  const group = cluster ? (cluster.groups || []).find((item) => item?.cdId === groupId) : undefined;
  return cluster && group ? { cluster, group } : null;
}

export function moveGroupNodeToCluster(
  flattenedNodes: FlattenedCodeNode[],
  activeId: string | number,
  overId: string | number | undefined,
):
  | { kind: 'noop' }
  | { kind: 'same-cluster' }
  | { kind: 'moved'; nextNodes: FlattenedCodeNode[]; targetParentId: string } {
  const activeItem = flattenedNodes.find((node) => node.id === activeId);
  const overItem = overId == null ? null : flattenedNodes.find((node) => node.id === overId);
  if (!activeItem || activeItem.type !== 'group' || !overItem || activeId === overId) {
    return { kind: 'noop' };
  }

  const targetParentId = overItem.type === 'cluster' ? overItem.id : overItem.parentId;
  if (!targetParentId || targetParentId === activeItem.parentId) {
    return { kind: 'same-cluster' };
  }

  const remainingNodes = flattenedNodes.filter((node) => node.id !== activeItem.id);
  const targetClusterIndex = remainingNodes.findIndex(
    (node) => node.type === 'cluster' && node.id === targetParentId,
  );
  if (targetClusterIndex < 0) {
    return { kind: 'noop' };
  }

  let insertionIndex = targetClusterIndex + 1;
  while (
    insertionIndex < remainingNodes.length
    && remainingNodes[insertionIndex].type === 'group'
    && remainingNodes[insertionIndex].parentId === targetParentId
  ) {
    insertionIndex += 1;
  }
  const movedItem: FlattenedCodeNode = { ...activeItem, parentId: targetParentId };
  return {
    kind: 'moved',
    targetParentId,
    nextNodes: [
      ...remainingNodes.slice(0, insertionIndex),
      movedItem,
      ...remainingNodes.slice(insertionIndex),
    ],
  };
}

