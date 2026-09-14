/**
 * 공통코드 탐색기의 트리 노드(분류·그룹)와 드래그 표현.
 *
 * 선택·이동 저장은 CommonCodeClient 가 소유한다. 이 파일은 표시와 드래그 핸들만 둔다.
 */
import React from 'react';
import { defaultDropAnimationSideEffects, type DropAnimation, type ScreenReaderInstructions } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Layers, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
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
}: SortableCodeNodeProps) => {
 const nodeDragDisabled = dragDisabled || node.type === 'cluster';
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
 droppable: dragDisabled,
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
 onClick={() => {}}
 tabIndex={-1}
 dragDisabled
 isOverlay
 style={{ paddingLeft: 0 }}
 />
);
