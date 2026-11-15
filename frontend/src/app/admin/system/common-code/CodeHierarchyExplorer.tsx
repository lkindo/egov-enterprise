'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  MeasuringStrategy,
  type Announcements,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import { CmmnClCode, CmmnCode } from '@/types/foundation/system';
import {
  buildInitialCodeClusters,
  flattenCodeTree,
  FlattenedCodeNode,
  moveGroupNodeToCluster,
} from './treeUtils';
import {
  buildCodeDndAnnouncements,
  CODE_DND_SCREEN_READER_INSTRUCTIONS,
  CodeNodeOverlay,
  dropAnimation,
  SortableCodeNode,
} from './CodeTreeNode';

/*
 * [2026-11-16] 공통코드 관리의 분류·그룹 탐색기 — 코드 그룹을 끌어다 다른 분류로 옮기는 상태와 트리 화면이다.
 *   종전에는 CommonCodeClient(1,138줄) 한 파일에 쓰기 폼·상세 표와 섞여 있었다. 저장(그룹 소속 저장)·폼은 화면에 그대로 두고
 *   — 폼 검증 census 가 그 쓰기 경계를 화면 파일에서 본다 — 끌어 놓기 상태와 트리만 여기로 옮겼다. 동작은 바꾸지 않았다.
 */

type Toast = (message: string, type: 'info') => void;

interface UseCodeHierarchyExplorerOptions {
  clCodes: CmmnClCode[];
  groups: CmmnCode[];
  toast: Toast;
  /** 검색 중·저장 중에는 소속을 옮기지 않는다. */
  moveBlocked: boolean;
  /** 끌기 시작한 그룹을 고른다. */
  onSelectNode: (node: FlattenedCodeNode) => void;
  /** 옮긴 그룹의 새 분류를 고른다. */
  onMovedToCluster: (clusterId: string) => void;
}

export function useCodeHierarchyExplorer({
  clCodes,
  groups,
  toast,
  moveBlocked,
  onSelectNode,
  onMovedToCluster,
}: UseCodeHierarchyExplorerOptions) {
  const initialClusters = useMemo(
    () => buildInitialCodeClusters(clCodes, groups),
    [clCodes, groups],
  );

  const hierarchySignature = useMemo(
    () => JSON.stringify(initialClusters),
    [initialClusters],
  );

  // D&D States
  const [flattenedNodes, setFlattenedNodes] = useState<FlattenedCodeNode[]>(
    () => flattenCodeTree(initialClusters),
  );
  const [syncedHierarchySignature, setSyncedHierarchySignature] = useState(hierarchySignature);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasExplorerChanges, setHasExplorerChanges] = useState(false);
  const hierarchyRevisionRef = useRef(0);
  const hierarchySeedSignatureRef = useRef<string | undefined>(undefined);
  const hasExplorerChangesRef = useRef(false);

  if (syncedHierarchySignature !== hierarchySignature) {
    setSyncedHierarchySignature(hierarchySignature);
    setFlattenedNodes(flattenCodeTree(initialClusters));
    if (hasExplorerChanges) {
      setHasExplorerChanges(false);
      setActiveId(null);
    }
  }

  useEffect(() => {
    const previousSignature = hierarchySeedSignatureRef.current;
    if (previousSignature === hierarchySignature) return;
    hierarchySeedSignatureRef.current = hierarchySignature;
    if (previousSignature !== undefined && hasExplorerChangesRef.current) {
      hierarchyRevisionRef.current += 1;
      toast('서버의 코드 구조가 갱신되어 저장되지 않은 소속 분류 변경을 취소했습니다.', 'info');
    }
  }, [hierarchySignature, toast]);

  useEffect(() => {
    hasExplorerChangesRef.current = hasExplorerChanges;
  }, [hasExplorerChanges]);

  // D&D Handlers
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const dndAnnouncements = useMemo<Announcements>(
    () => buildCodeDndAnnouncements(flattenedNodes),
    [flattenedNodes],
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (moveBlocked) return;
    const nextActiveId = event.active.id as string;
    const activeNode = flattenedNodes.find((node) => node.id === nextActiveId);
    if (!activeNode || activeNode.type !== 'group') return;
    setActiveId(nextActiveId);
    onSelectNode(activeNode);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (moveBlocked) {
      setActiveId(null);
      return;
    }
    const { active, over } = event;
    const outcome = moveGroupNodeToCluster(flattenedNodes, active.id, over?.id);
    if (outcome.kind === 'same-cluster') {
      toast('같은 분류 안의 순서는 저장되지 않습니다. 다른 분류로 이동해 주세요.', 'info');
      setActiveId(null);
      return;
    }
    if (outcome.kind !== 'moved') {
      setActiveId(null);
      return;
    }

    setFlattenedNodes(outcome.nextNodes);
    onMovedToCluster(outcome.targetParentId);
    hierarchyRevisionRef.current += 1;
    setHasExplorerChanges(true);
    toast('코드 그룹의 소속 분류가 변경되었습니다.', 'info');
    setActiveId(null);
  };

  return {
    initialClusters,
    hierarchySignature,
    flattenedNodes,
    activeId,
    setActiveId,
    hasExplorerChanges,
    setHasExplorerChanges,
    hierarchyRevisionRef,
    sensors,
    dndAnnouncements,
    handleDragStart,
    handleDragEnd,
  };
}

type CodeHierarchyExplorer = ReturnType<typeof useCodeHierarchyExplorer>;

interface CodeHierarchyTreeProps {
  explorer: CodeHierarchyExplorer;
  visibleNodes: FlattenedCodeNode[];
  selectedNode: FlattenedCodeNode | null;
  dragDisabled: boolean;
  reorderable: boolean;
  onSelectNode: (node: FlattenedCodeNode) => void;
}

export function CodeHierarchyTree({
  explorer,
  visibleNodes,
  selectedNode,
  dragDisabled,
  reorderable,
  onSelectNode,
}: CodeHierarchyTreeProps) {
  const { flattenedNodes, activeId, setActiveId, sensors, dndAnnouncements, handleDragStart, handleDragEnd } = explorer;
  const activeNode = activeId ? flattenedNodes.find(n => n.id === activeId) : null;
  return (
    <DndContext
      sensors={sensors}
      accessibility={{
        announcements: dndAnnouncements,
        screenReaderInstructions: CODE_DND_SCREEN_READER_INSTRUCTIONS,
      }}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={visibleNodes.map((node) => node.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1">
          {visibleNodes.map((node, index) => {
            const isSelected = selectedNode?.id === node.id;
            return (
              <SortableCodeNode
                key={node.id}
                node={node}
                isSelected={isSelected}
                tabIndex={isSelected || (!selectedNode && index === 0) ? 0 : -1}
                dragDisabled={dragDisabled}
                reorderable={reorderable}
                parentClassificationName={node.type === 'group'
                  ? flattenedNodes.find((candidate) => candidate.type === 'cluster' && candidate.id === node.parentId)?.name
                  : undefined}
                onClick={() => onSelectNode(node)}
              />
            );
          })}
        </div>
      </SortableContext>

      {typeof document !== 'undefined' && createPortal(
        <DragOverlay dropAnimation={dropAnimation}>
          {activeId && activeNode ? (
            <CodeNodeOverlay node={activeNode} />
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
