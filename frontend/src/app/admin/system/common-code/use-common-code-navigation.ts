'use client';

import { useMemo, useState } from 'react';
import type { CmmnClCode, CmmnCode } from '@/types/foundation/system';
import type { GroupCode } from '@/types/foundation/code';
import type { CodePickerSelection } from '@/app/components/ui/code-picker';
import { findGroupInClusters, flattenCodeTree, type FlattenedCodeNode } from './treeUtils';
import { useCodeHierarchyExplorer } from './CodeHierarchyExplorer';
import { filterCodeNodes } from './CodeTreeNode';

/*
 * [2026-11-27] 공통코드 관리의 선택·검색 — 분류·그룹 탐색기, 고른 분류·그룹, 주소의 그룹(selectedGroupId)과 목록 갱신에 맞춘
 *   선택 동기화, 검색 필터, 코드 선택기로 고른 그룹 열기. 종전에는 CommonCodeClient(1,006줄) 한 파일에 쓰기 폼·상세 표와 섞여
 *   있었다(품질 평가 A안 3번 시범 분해). 쓰기(분류·그룹·상세 저장, 그룹 소속 저장)와 그 잠금은 화면에 그대로 두고 — 폼 검증
 *   census 가 그 쓰기 경계를 화면 파일에서 본다 — 쓰기가 없는 선택 상태만 여기로 옮겼다. 동작은 바꾸지 않았다.
 */

type Toast = (message: string, type: 'info' | 'success' | 'error') => void;

interface UseCommonCodeNavigationOptions {
  clCodes: CmmnClCode[];
  groups: CmmnCode[];
  /** 주소로 받은 처음 고를 그룹. */
  selectedGroupId?: string | null;
  toast: Toast;
  /** 그룹 소속 저장 중에는 소속을 옮기지 않는다. */
  isSavingHierarchy: boolean;
}

export function useCommonCodeNavigation({
  clCodes,
  groups,
  selectedGroupId,
  toast,
  isSavingHierarchy,
}: UseCommonCodeNavigationOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupCode | null>(null);
  const [seedSync, setSeedSync] = useState<{
    selectedGroupId: string | null | undefined;
    hierarchySignature: string | undefined;
    resolved: boolean;
  }>({
    selectedGroupId: undefined,
    hierarchySignature: undefined,
    resolved: false,
  });

  const selectNode = (node: FlattenedCodeNode) => {
    if (node.type === 'cluster') {
      setSelectedClusterId(node.id);
      setSelectedGroup(null);
      return;
    }
    setSelectedClusterId(node.parentId);
    setSelectedGroup(node.data);
  };

  // 분류·그룹 탐색기(끌어다 소속 옮기기) — 상태와 트리는 CodeHierarchyExplorer, 저장은 화면의 handleSaveExplorerChanges.
  const explorer = useCodeHierarchyExplorer({
    clCodes,
    groups,
    toast,
    moveBlocked: Boolean(searchQuery) || isSavingHierarchy,
    onSelectNode: selectNode,
    onMovedToCluster: setSelectedClusterId,
  });
  const { initialClusters, hierarchySignature, flattenedNodes } = explorer;

  const selectedNodeId = selectedGroup?.cdId ?? selectedClusterId;
  const selectedNode = selectedNodeId
    ? flattenedNodes.find((node) => node.id === selectedNodeId) ?? null
    : null;

  /** 선택된 분류에 속한 코드 그룹 수. 미사용 전환 고지와 분류 상세의 '포함 그룹' 수에 쓴다. */
  const groupCountOf = (clsfCd: string) =>
    flattenedNodes.filter((node) => node.type === 'group' && node.parentId === clsfCd).length;

  /**
   * CodePicker 1호 소비처 — 팝업에서 고른 코드의 그룹을 탐색기에서 그대로 선택한다.
   * (상세 목록은 기존 useQuery 경로가 이어받는다. 신규 조회 경로를 만들지 않는다.)
   */
  const handlePickCode = ({ group, code }: CodePickerSelection) => {
    const found = findGroupInClusters(initialClusters, group.cdId);
    if (!found) {
      toast('선택한 코드 그룹을 현재 탐색기에서 찾을 수 없습니다. 데이터를 새로고침한 뒤 다시 시도해 주세요.', 'error');
      return;
    }
    setSearchQuery('');
    setSelectedClusterId(found.cluster.id);
    setSelectedGroup(found.group);
    toast(`‘${code.dtlCdNm}’(${code.dtlCd}) — ${group.cdIdNm} 그룹이 선택되었습니다.`, 'success');
  };

  // Synchronize initial state from props during render
  const nextSelectedGroupId = selectedGroupId ?? null;
  const previousSelectedGroupId = seedSync.selectedGroupId;
  const seedChanged = previousSelectedGroupId !== nextSelectedGroupId;
  const hierarchyChanged = seedSync.hierarchySignature !== hierarchySignature;
  if (seedChanged || hierarchyChanged) {
    const findGroup = (groupId: string) => findGroupInClusters(initialClusters, groupId);
    const revealSelectionIfHidden = (nodeId: string) => {
      if (!searchQuery) return;
      const nextVisibleNodes = filterCodeNodes(flattenCodeTree(initialClusters), searchQuery);
      if (!nextVisibleNodes.some((node) => node.id === nodeId)) setSearchQuery('');
    };

    if (!seedChanged) {
      let nextResolved = seedSync.resolved;
      if (selectedGroup) {
        const currentSelection = findGroup(selectedGroup.cdId);
        if (currentSelection) {
          revealSelectionIfHidden(currentSelection.group.cdId);
          setSelectedClusterId(currentSelection.cluster.id);
          setSelectedGroup(currentSelection.group);
        } else {
          if (selectedGroup.cdId === nextSelectedGroupId) nextResolved = false;
          setSelectedClusterId(null);
          setSelectedGroup(null);
        }
      } else if (selectedClusterId) {
        const clusterStillExists = initialClusters.some((cluster) => cluster.id === selectedClusterId);
        if (clusterStillExists) revealSelectionIfHidden(selectedClusterId);
        else setSelectedClusterId(null);
      } else if (!nextResolved && nextSelectedGroupId) {
        const lateSelection = findGroup(nextSelectedGroupId);
        if (lateSelection) {
          nextResolved = true;
          setSearchQuery('');
          setSelectedClusterId(lateSelection.cluster.id);
          setSelectedGroup(lateSelection.group);
        }
      }
      setSeedSync({
        selectedGroupId: nextSelectedGroupId,
        hierarchySignature,
        resolved: nextResolved,
      });
    } else if (!nextSelectedGroupId) {
      setSeedSync({
        selectedGroupId: nextSelectedGroupId,
        hierarchySignature,
        resolved: true,
      });
      if (previousSelectedGroupId !== undefined) {
        setSelectedClusterId(null);
        setSelectedGroup(null);
      }
    } else {
      const seededSelection = findGroup(nextSelectedGroupId);
      if (seededSelection) {
        setSeedSync({
          selectedGroupId: nextSelectedGroupId,
          hierarchySignature,
          resolved: true,
        });
        setSearchQuery('');
        setSelectedClusterId(seededSelection.cluster.id);
        setSelectedGroup(seededSelection.group);
      } else {
        setSeedSync({
          selectedGroupId: nextSelectedGroupId,
          hierarchySignature,
          resolved: false,
        });
        setSelectedClusterId(null);
        setSelectedGroup(null);
      }
    }
  }

  // Filtered Nodes
  const visibleNodes = useMemo(
    () => filterCodeNodes(flattenedNodes, searchQuery),
    [flattenedNodes, searchQuery],
  );

  const handleSearchChange = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    if (!selectedNodeId) return;
    if (filterCodeNodes(flattenedNodes, nextQuery).some((node) => node.id === selectedNodeId)) return;
    setSelectedClusterId(null);
    setSelectedGroup(null);
  };

  return {
    explorer,
    searchQuery,
    selectedGroup,
    selectedNode,
    visibleNodes,
    selectNode,
    groupCountOf,
    handlePickCode,
    handleSearchChange,
  };
}
