/**
 * 공통코드 탐색기의 트리 노드(분류·그룹)와 드래그 표현.
 *
 * 선택·이동 저장은 CommonCodeClient 가 소유한다. 이 파일은 표시와 드래그 핸들만 둔다.
 */
import React from 'react';
import { defaultDropAnimationSideEffects, type Announcements, type DropAnimation, type ScreenReaderInstructions } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Fingerprint, GripVertical, History, Layers, Plus, Settings, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { cn } from '@/lib/utils';
import type { CmmnDetailCode } from '@/types/foundation/system';
import type { GroupCode } from '@/types/foundation/code';
import type { CodeChangeHistoryTarget } from './CommonCodeChangeHistoryDialog';
import type { FlattenedCodeNode } from './treeUtils';

const INDENTATION_WIDTH = 24;

export function formatClassificationLabel(name?: string): string {
  if (!name) return '알 수 없는 분류';
  return name.endsWith('분류') ? name : `${name} 분류`;
}

export const CODE_DND_SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable: '스페이스 또는 엔터 키로 코드 그룹 이동을 시작합니다. 방향키로 대상 분류를 찾고 스페이스 또는 엔터 키로 이동을 확정합니다. Escape 키로 취소합니다.',
};

export const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export function filterCodeNodes(nodes: FlattenedCodeNode[], query: string): FlattenedCodeNode[] {
  if (!query) return nodes;
  const lowerQuery = query.toLowerCase();
  const matches = new Set<string>();

  nodes.forEach((node) => {
    if (node.name.toLowerCase().includes(lowerQuery) || node.id.toLowerCase().includes(lowerQuery)) {
      matches.add(node.id);
      if (node.parentId) matches.add(node.parentId);
    }
  });

  return nodes.filter((node) => matches.has(node.id));
}

interface SortableCodeNodeProps {
  node: FlattenedCodeNode;
  isSelected: boolean;
  onClick: () => void;
  tabIndex: number;
  dragDisabled?: boolean;
  parentClassificationName?: string;
  /** 소속 분류를 바꿀 권한(CODE_UPDATE)이 없으면 끌기 핸들을 두지 않는다 — 저장할 수 없는 변경을 만들지 않는다. */
  reorderable?: boolean;
}

interface CodeNodeRowProps extends SortableCodeNodeProps {
  isOverlay?: boolean;
  nodeRef?: React.Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  isDragging?: boolean;
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}

const CodeNodeRow = ({
  node,
  isSelected,
  onClick,
  tabIndex,
  dragDisabled = false,
  parentClassificationName,
  reorderable = true,
  isOverlay = false,
  nodeRef,
  style,
  isDragging = false,
  dragHandleProps,
}: CodeNodeRowProps) => {
  const isCluster = node.type === 'cluster';

  return (
    <div
      ref={nodeRef}
      style={style}
      aria-hidden={isOverlay || undefined}
      className={cn(
        "group relative mb-1 flex items-stretch gap-1 outline-none",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "z-[9999] pointer-events-none"
      )}
    >
      {/* Hierarchy Line for Groups */}
      {!isCluster && !isOverlay && (
        <div className="absolute left-[11px] top-[-10px] bottom-1/2 w-px bg-border" />
      )}
      {!isCluster && !isOverlay && (
        <div className="absolute left-[11px] top-1/2 w-3 h-px bg-border" />
      )}

      {reorderable && (
        <button
          type="button"
          {...dragHandleProps}
          disabled={isOverlay || dragDisabled}
          tabIndex={isOverlay || dragDisabled || isCluster || !isSelected ? -1 : 0}
          aria-roledescription={!isCluster && !isOverlay ? '코드 그룹 소속 분류 이동 핸들' : undefined}
          aria-label={isCluster
            ? `${node.name} (${node.id}) 분류는 이동할 수 없음`
            : `${node.name} (${node.id}) 소속 분류 이동 핸들 — 현재 ${formatClassificationLabel(parentClassificationName)}`}
          className="flex w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={isOverlay}
        tabIndex={isOverlay ? -1 : tabIndex}
        data-a2-master-item={isOverlay ? undefined : ''}
        data-a2-master-item-type={isOverlay ? undefined : node.type}
        aria-current={isSelected ? 'true' : undefined}
        aria-label={`${node.name} (${node.id}) 선택`}
        className={cn(
          "relative flex min-w-0 flex-1 items-center justify-between overflow-hidden rounded-md border p-3 text-left transition-colors",
          isCluster
            ? "border-transparent bg-muted/50 hover:bg-muted"
            : "border-transparent hover:bg-muted",
          isSelected && "border-primary bg-primary text-primary-foreground hover:bg-primary",
          isOverlay && "border-primary bg-card shadow-lg"
        )}
      >
        <div className="flex items-center gap-3 truncate relative z-10 w-full">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-card text-muted-foreground"
          )}>
            {isCluster ? <Layers size={14} aria-hidden="true" /> : <Tag size={14} aria-hidden="true" />}
          </div>
          <div className="flex flex-col truncate items-start">
            {/* 선택 배경이 cluster=surface-inverse / group=primary 로 달라 전경 토큰도 짝을 맞춘다 */}
            <span className={cn(
              "truncate text-xs font-semibold leading-tight",
              isSelected ? "text-primary-foreground" : "text-foreground"
            )}>
              {node.name}
            </span>
            <span className={cn(
              "font-mono text-xs",
              isSelected ? "text-primary-foreground" : "text-muted-foreground"
            )}>
              {node.id}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
};

export const SortableCodeNode = ({
  node,
  isSelected,
  onClick,
  tabIndex,
  dragDisabled = false,
  parentClassificationName,
  reorderable = true,
}: SortableCodeNodeProps) => {
  const nodeDragDisabled = dragDisabled || !reorderable || node.type === 'cluster';
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    disabled: {
      draggable: nodeDragDisabled,
      droppable: dragDisabled || !reorderable,
    },
  });

  return (
    <CodeNodeRow
      node={node}
      isSelected={isSelected}
      onClick={onClick}
      tabIndex={tabIndex}
      dragDisabled={nodeDragDisabled}
      parentClassificationName={parentClassificationName}
      reorderable={reorderable}
      nodeRef={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        paddingLeft: `${node.depth * INDENTATION_WIDTH}px`,
      }}
      isDragging={isDragging}
      dragHandleProps={{ ...attributes, ...listeners } as React.ButtonHTMLAttributes<HTMLButtonElement>}
    />
  );
};

export const CodeNodeOverlay = ({ node }: { node: FlattenedCodeNode }) => (
  <CodeNodeRow
    node={node}
    isSelected={false}
    onClick={() => { }}
    tabIndex={-1}
    dragDisabled
    isOverlay
    style={{ paddingLeft: 0 }}
  />
);

export function buildCodeDndAnnouncements(flattenedNodes: FlattenedCodeNode[]): Announcements {
  const findNode = (id: string | number) => flattenedNodes.find((node) => node.id === String(id));
  const clusterName = (clusterId: string | null) => (
    flattenedNodes.find((node) => node.type === 'cluster' && node.id === clusterId)?.name ?? '알 수 없는'
  );
  const clusterLabel = (clusterId: string | null) => formatClassificationLabel(clusterName(clusterId));
  const targetParentId = (overId: string | number | undefined) => {
    if (overId == null) return null;
    const overNode = findNode(overId);
    return overNode?.type === 'cluster' ? overNode.id : overNode?.parentId ?? null;
  };

  return {
    onDragStart: ({ active }) => {
      const activeNode = findNode(active.id);
      if (!activeNode || activeNode.type !== 'group') return '코드 그룹 이동을 시작했습니다.';
      return `${activeNode.name} 그룹 이동을 시작했습니다. 현재 소속은 ${clusterLabel(activeNode.parentId)}입니다.`;
    },
    onDragOver: ({ active, over }) => {
      const activeNode = findNode(active.id);
      if (!activeNode || activeNode.type !== 'group') return undefined;
      const nextParentId = targetParentId(over?.id);
      if (!nextParentId) return `${activeNode.name} 그룹을 이동할 분류를 찾고 있습니다.`;
      if (nextParentId === activeNode.parentId) {
        return `${activeNode.name} 그룹은 현재 ${clusterLabel(nextParentId)} 위에 있습니다. 같은 분류 안의 순서는 저장되지 않습니다.`;
      }
      return `${activeNode.name} 그룹을 ${clusterLabel(nextParentId)}로 이동할 위치입니다.`;
    },
    onDragEnd: ({ active, over }) => {
      const activeNode = findNode(active.id);
      if (!activeNode || activeNode.type !== 'group') return '코드 그룹 이동이 끝났습니다.';
      const nextParentId = targetParentId(over?.id);
      if (!nextParentId || nextParentId === activeNode.parentId) {
        return `${activeNode.name} 그룹의 소속 분류는 변경되지 않았습니다.`;
      }
      return `${activeNode.name} 그룹을 ${clusterLabel(nextParentId)}로 이동했습니다. 변경 내용을 저장해야 반영됩니다.`;
    },
    onDragCancel: ({ active }) => {
      const activeNode = findNode(active.id);
      return `${activeNode?.name ?? '코드'} 그룹 이동을 취소했습니다.`;
    },
  };
}

/* 셀 py-4 오버라이드를 제거해 표 밀도를 --cell-py(밀도 축) 단일 소스로 되돌린다. */
export const COMMON_DETAIL_COLUMNS: Column<CmmnDetailCode>[] = [
  {
    header: '코드',
    accessor: (item: CmmnDetailCode) => <span className="font-black text-foreground tracking-tight text-xs">{item.dtlCd}</span>,
    className: 'w-24',
  },
  {
    header: '코드 명칭',
    accessor: (item: CmmnDetailCode) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-black text-foreground tracking-tighter text-sm">{item.dtlCdNm}</span>
        <span className="line-clamp-1 text-xs text-muted-foreground">{item.dtlCdExpln || '등록된 설명 없음'}</span>
      </div>
    ),
  },
  {
    header: '상태',
    accessor: (item: CmmnDetailCode) => (
      <HubStatusBadge status={item.useYn === 'Y' ? '사용 중' : '미사용'} variant={item.useYn === 'Y' ? 'success' : 'secondary'} />
    ),
    className: 'w-32',
  },
];

export function CommonCodeDetailActions({
  selectedGroup,
  selectedNode,
  canCreateCode,
  canUpdateCode,
  isDetailWritePending,
  isModalOpen,
  isStructureFormPending,
  onCreateDetail,
  onEditGroup,
  onEditCluster,
  onOpenHistory,
}: {
  selectedGroup: GroupCode | null;
  selectedNode: FlattenedCodeNode | null;
  canCreateCode: boolean;
  canUpdateCode: boolean;
  isDetailWritePending: boolean;
  isModalOpen: boolean;
  isStructureFormPending: boolean;
  onCreateDetail: () => void;
  onEditGroup: () => void;
  onEditCluster: () => void;
  onOpenHistory: (target: CodeChangeHistoryTarget) => void;
}) {
  if (selectedGroup) {
    /* 주 과업(상세 코드 등록)이 먼저다 — 목록에서 Tab 을 누르면 상세 액션의 첫 버튼으로 이동한다(A2 계약). */
    return (
      <div className="flex flex-wrap items-center gap-2">
        {canCreateCode && (
          <Button type="button" onClick={onCreateDetail} disabled={isDetailWritePending || isModalOpen} className="gap-2">
            <Plus size={16} aria-hidden="true" /> 신규 상세 코드 등록
          </Button>
        )}
        {canUpdateCode && (
          <Button type="button" variant="outline" onClick={onEditGroup} disabled={isStructureFormPending} className="gap-2">
            <Settings size={16} aria-hidden="true" /> 그룹 수정
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenHistory({ kind: 'group', id: selectedGroup.cdId, name: selectedGroup.cdIdNm || selectedGroup.cdId })}
          className="gap-2"
        >
          <History size={16} aria-hidden="true" /> 변경 이력
        </Button>
      </div>
    );
  }

  if (selectedNode?.type === 'cluster') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {canUpdateCode && (
          <Button type="button" variant="outline" onClick={onEditCluster} disabled={isStructureFormPending} className="gap-2">
            <Settings size={16} aria-hidden="true" /> 분류 수정
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenHistory({ kind: 'cluster', id: selectedNode.id, name: selectedNode.name || selectedNode.id })}
          className="gap-2"
        >
          <History size={16} aria-hidden="true" /> 변경 이력
        </Button>
      </div>
    );
  }

  return undefined;
}

export function CommonCodeDetailPanel({
  selectedNode,
  embedded,
  detailsLoading,
  detailList,
  detailsError,
  columns,
  groupCount,
  onRetryDetails,
}: {
  selectedNode: FlattenedCodeNode | null;
  embedded: boolean;
  detailsLoading: boolean;
  detailList: CmmnDetailCode[];
  detailsError: Error | null;
  columns: Column<CmmnDetailCode>[];
  groupCount: number;
  onRetryDetails: () => void;
}) {
  const DetailSubheading = embedded ? 'h4' : 'h3';

  if (selectedNode?.type === 'group') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted p-3">
          <div className="flex items-center gap-3">
            <Fingerprint size={18} className="text-primary" aria-hidden="true" />
            <div>
              <DetailSubheading className="text-sm font-semibold text-foreground">상세 코드</DetailSubheading>
              <p className="text-xs text-muted-foreground">{detailsLoading ? '불러오는 중…' : `총 ${detailList.length}건`}</p>
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <span>사용 / 미사용</span>
            <strong className="ml-2 tabular-nums text-foreground">
              {detailList.filter((detail) => detail.useYn === 'Y').length} / {detailList.filter((detail) => detail.useYn !== 'Y').length}
            </strong>
          </div>
        </div>
        <StandardDataTable<CmmnDetailCode>
          columns={columns}
          data={detailList}
          loading={detailsLoading && detailList.length === 0}
          error={detailsError}
          onRetry={onRetryDetails}
          keyField="dtlCd"
          emptyMessage="데이터가 존재하지 않습니다."
          className="border-none shadow-none bg-transparent"
        />
      </div>
    );
  }

  if (selectedNode?.type === 'cluster') {
    return (
      <section className="space-y-3" aria-labelledby="selected-code-classification-heading">
        <DetailSubheading id="selected-code-classification-heading" className="text-sm font-semibold text-foreground">코드 분류 정보</DetailSubheading>
        <dl className="grid gap-3 rounded-md bg-muted p-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">분류 코드</dt>
            <dd className="mt-1 font-mono text-sm font-semibold text-foreground">{selectedNode.id}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">포함 그룹</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {groupCount}개
            </dd>
          </div>
        </dl>
      </section>
    );
  }

  return undefined;
}

