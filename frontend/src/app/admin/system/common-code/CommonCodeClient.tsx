import { DndContext, 
 closestCenter, 
 KeyboardSensor, 
 PointerSensor, 
 useSensor, 
 useSensors, 
 DragOverlay, 
 defaultDropAnimationSideEffects, 
 DragStartEvent, 
 DragEndEvent, 
 MeasuringStrategy, 
 DropAnimation,
 type Announcements,
 type ScreenReaderInstructions } from '@dnd-kit/core';
import {
 SortableContext,
 sortableKeyboardCoordinates,
 verticalListSortingStrategy,
 useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { flattenCodeTree, FlattenedCodeNode } from './treeUtils';
import { cn } from '@/lib/utils';
import { Layers,  
 Tag,  
 Search,  
 SearchSlash,  
 Plus,  
 Settings,  
 Trash2, 
 Fingerprint, 
 Save,
 Loader2,
 GripVertical } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppForm } from '@/hooks/useAppForm';
import { 
 Form, 
 FormControl, 
 FormErrorSummary,
 FormField as ShadcnFormField, 
 FormItem, 
 FormLabel, 
 FormMessage 
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { CodePicker, CodePickerSelection } from '@/app/components/ui/code-picker';
import { codeAdminService } from '@/services/foundation/system/CodeAdminService';
import { z } from 'zod';
import { 
 saveCodeDetail, 
 deleteCodeDetail,
 saveCmmnCodeHierarchyAction,
 saveClCodeAction,
 saveCmmnCodeAction
} from '@/app/actions/codeActions';
import { 
 CmmnClCode, 
 CmmnCode, 
 CmmnDetailCode 
} from '@/types/foundation/system';
import { DomainCluster, GroupCode } from '@/types/foundation/code';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';

const INDENTATION_WIDTH = 24;

function formatClassificationLabel(name?: string): string {
 if (!name) return '알 수 없는 분류';
 return name.endsWith('분류') ? name : `${name} 분류`;
}

const CODE_DND_SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
 draggable: '스페이스 또는 엔터 키로 코드 그룹 이동을 시작합니다. 방향키로 대상 분류를 찾고 스페이스 또는 엔터 키로 이동을 확정합니다. Escape 키로 취소합니다.',
};

import { CmmnClCodeDtoSchema, CmmnCodeDtoSchema, CmmnDetailCodeDtoSchema } from '@/types/generated-zod';

export const codeDetailFormSchema = CmmnDetailCodeDtoSchema.extend({
 dtlCd: CmmnDetailCodeDtoSchema.shape.dtlCd
  .unwrap()
  .trim()
  .min(1, '코드 식별자를 입력해 주세요.')
  .max(12, '코드 식별자는 12자 이하여야 합니다.'),
 dtlCdNm: CmmnDetailCodeDtoSchema.shape.dtlCdNm
  .unwrap()
  .trim()
  .min(1, '표기 레이블을 입력해 주세요.')
  .max(100, '표기 레이블은 100자 이하여야 합니다.'),
 dtlCdExpln: CmmnDetailCodeDtoSchema.shape.dtlCdExpln
  .unwrap()
  .trim()
  .max(4000, '설명은 4000자 이하여야 합니다.'),
 useYn: z.enum(['Y', 'N']).default('Y'),
});

const CODE_DETAIL_FIELD_LABELS = {
 dtlCd: '코드 식별자',
 dtlCdNm: '표기 레이블',
 dtlCdExpln: '메타데이터 컨텍스트 설명',
 useYn: '활성 상태',
 'root.server': '저장 요청',
};

/**
 * 코드 분류(cluster) 폼.
 *
 * 서버 DTO(CmmnClCodeDto)는 clsfCd·clsfCdNm 을 @Size 로만 제한하지만, 둘 다 비면
 * insertCmmnClCode 의 required(...) 가 500 계열로 죽는다. 화면에서 먼저 막는다.
 */
const codeClusterFormSchema = CmmnClCodeDtoSchema.extend({
 clsfCd: CmmnClCodeDtoSchema.shape.clsfCd
  .unwrap()
  .trim()
  .min(1, '분류 코드를 입력해 주세요.')
  .max(12, '분류 코드는 12자 이하여야 합니다.'),
 clsfCdNm: CmmnClCodeDtoSchema.shape.clsfCdNm
  .unwrap()
  .trim()
  .min(1, '분류명을 입력해 주세요.')
  .max(100, '분류명은 100자 이하여야 합니다.'),
 clsfCdExpln: CmmnClCodeDtoSchema.shape.clsfCdExpln
  .unwrap()
  .trim()
  .max(4000, '설명은 4000자 이하여야 합니다.'),
 useYn: z.enum(['Y', 'N']).default('Y'),
});

const CODE_CLUSTER_FIELD_LABELS = {
 clsfCd: '분류 코드',
 clsfCdNm: '분류명',
 clsfCdExpln: '분류 설명',
 useYn: '사용 여부',
 'root.server': '저장 요청',
};

/**
 * 코드 그룹 폼.
 *
 * clsfCd(소속 분류)는 **등록할 때만** 반영된다 — 서버의 updateCmmnCode 는 명칭·설명·사용여부만
 * 갱신하고 소속 분류는 건드리지 않는다(CommonCodeGroup#update). 그래서 수정 화면에서는 읽기
 * 전용으로 보여 주고, 분류 간 이동은 탐색기 드래그앤드롭 + '그룹 소속 저장' 경로가 담당한다.
 */
const codeGroupFormSchema = CmmnCodeDtoSchema.extend({
 cdId: CmmnCodeDtoSchema.shape.cdId
  .unwrap()
  .trim()
  .min(1, '그룹 코드를 입력해 주세요.')
  .max(20, '그룹 코드는 20자 이하여야 합니다.'),
 cdIdNm: CmmnCodeDtoSchema.shape.cdIdNm
  .unwrap()
  .trim()
  .min(1, '그룹명을 입력해 주세요.')
  .max(100, '그룹명은 100자 이하여야 합니다.'),
 cdIdExpln: CmmnCodeDtoSchema.shape.cdIdExpln
  .unwrap()
  .trim()
  .max(4000, '설명은 4000자 이하여야 합니다.'),
 clsfCd: CmmnCodeDtoSchema.shape.clsfCd
  .unwrap()
  .trim()
  .min(1, '소속 분류를 선택해 주세요.')
  .max(12, '분류 코드는 12자 이하여야 합니다.'),
 useYn: z.enum(['Y', 'N']).default('Y'),
});

const CODE_GROUP_FIELD_LABELS = {
 cdId: '그룹 코드',
 cdIdNm: '그룹명',
 cdIdExpln: '그룹 설명',
 clsfCd: '소속 분류',
 useYn: '사용 여부',
 'root.server': '저장 요청',
};

const dropAnimation: DropAnimation = {
 sideEffects: defaultDropAnimationSideEffects({
 styles: {
 active: {
 opacity: '0.5',
 },
 },
 }),
};

function filterCodeNodes(nodes: FlattenedCodeNode[], query: string): FlattenedCodeNode[] {
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

const SortableCodeNode = ({
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

const CodeNodeOverlay = ({ node }: { node: FlattenedCodeNode }) => (
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

interface CommonCodeClientProps {
 clCodes: CmmnClCode[];
 groups: CmmnCode[];
 details: CmmnDetailCode[];
 selectedGroupId?: string | null;
 notice?: React.ReactNode;
 loadFailed?: boolean;
 embedded?: boolean;
}

export default function CommonCodeClient({
 clCodes,
 groups,
 details,
 selectedGroupId,
 notice,
 loadFailed = false,
 embedded = false,
}: CommonCodeClientProps) {
 const router = useRouter();
 const queryClient = useQueryClient();
 const { toast } = useToast();
 const confirm = useConfirm();

 // --- State ---
 const [searchQuery, setSearchQuery] = useState('');
 const [isPickerOpen, setIsPickerOpen] = useState(false);
 const [isModalOpen, setIsOpen] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const hierarchySavePendingRef = React.useRef(false);
 const detailSubmitAttemptRef = React.useRef(false);
 const detailSavePendingRef = React.useRef(false);
 const detailDeletePendingRef = React.useRef(false);
 const [isDetailSaving, setIsDetailSaving] = useState(false);
 const [deletingDetailKey, setDeletingDetailKey] = useState<string | null>(null);
 const [editingDetail, setEditingDetail] = useState<CmmnDetailCode | null>(null);
 const [modalTargetGroup, setModalTargetGroup] = useState<Pick<GroupCode, 'cdId' | 'cdIdNm'> | null>(null);

 /**
  * 구조(분류·그룹) 편집 모달 상태.
  *
  * 종전에는 상세 코드만 등록·수정할 수 있었고 그 상위인 분류·그룹은 화면에서 만들 수도 고칠 수도
  * 없었다 — 서버와 프런트 서비스에는 CRUD 6종이 전부 살아 있는데 배선만 없었다. 그래서 새 코드
  * 체계를 도입하려면 DB 를 직접 건드려야 했다.
  */
 const [structureModal, setStructureModal] = useState<
  { kind: 'cluster' | 'group'; mode: 'create' | 'edit' } | null
 >(null);
 const [isStructureSaving, setIsStructureSaving] = useState(false);
 const structureSubmitAttemptRef = React.useRef(false);
 const structureSavePendingRef = React.useRef(false);
 
 // D&D States
 const [flattenedNodes, setFlattenedNodes] = useState<FlattenedCodeNode[]>([]);
 const [activeId, setActiveId] = useState<string | null>(null);
 const [hasExplorerChanges, setHasExplorerChanges] = useState(false);
 const hierarchyRevisionRef = React.useRef(0);

 const form = useAppForm<
  typeof codeDetailFormSchema,
  z.infer<typeof codeDetailFormSchema>
 >(codeDetailFormSchema, {
 defaultValues: {
 dtlCd: '',
 dtlCdNm: '',
 useYn: 'Y',
 dtlCdExpln: ''
 }
 });
 const resetForm = form.reset;
 const isDetailFormPending = isDetailSaving || form.formState.isSubmitting;
 const isDetailWritePending = isDetailFormPending || deletingDetailKey !== null;

 // 구조(분류·그룹) 폼. 두 종류가 필드 집합이 다르므로 폼을 각각 둔다.
 const clusterForm = useAppForm<
  typeof codeClusterFormSchema,
  z.infer<typeof codeClusterFormSchema>
 >(codeClusterFormSchema, {
 defaultValues: { clsfCd: '', clsfCdNm: '', clsfCdExpln: '', useYn: 'Y' }
 });
 const groupForm = useAppForm<
  typeof codeGroupFormSchema,
  z.infer<typeof codeGroupFormSchema>
 >(codeGroupFormSchema, {
 defaultValues: { cdId: '', cdIdNm: '', cdIdExpln: '', clsfCd: '', useYn: 'Y' }
 });
 const isStructureFormPending = isStructureSaving
  || clusterForm.formState.isSubmitting
  || groupForm.formState.isSubmitting;

 useEffect(() => {
 if (isModalOpen) {
 if (editingDetail) {
 resetForm({
 dtlCd: editingDetail.dtlCd,
 dtlCdNm: editingDetail.dtlCdNm,
 useYn: (editingDetail.useYn as 'Y' | 'N') || 'Y',
 dtlCdExpln: editingDetail.dtlCdExpln || ''
 });
 } else {
 resetForm({
 dtlCd: '',
 dtlCdNm: '',
 useYn: 'Y',
 dtlCdExpln: ''
 });
 }
 }
 }, [editingDetail, isModalOpen, resetForm]);

 const initialClusters = React.useMemo(() => {
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

 return safeClCodes.map(cl => ({
 ...cl,
 id: cl.clsfCd || '',
 name: cl.clsfCdNm || '',
 groups: safeGroups
 .filter(g => g.clsfCd === cl.clsfCd)
 .map(g => ({
 ...g,
 details: []
 })) as GroupCode[]
 })) as DomainCluster[];
 }, [clCodes, groups]);

 const hierarchySignature = React.useMemo(
 () => JSON.stringify(initialClusters),
 [initialClusters],
 );
 const hierarchySeedSignatureRef = React.useRef<string | undefined>(undefined);

 useEffect(() => {
 const previousSignature = hierarchySeedSignatureRef.current;
 if (previousSignature === hierarchySignature) return;
 hierarchySeedSignatureRef.current = hierarchySignature;
 setFlattenedNodes(flattenCodeTree(initialClusters));
 if (previousSignature !== undefined && hasExplorerChanges) {
 hierarchyRevisionRef.current += 1;
 setHasExplorerChanges(false);
 setActiveId(null);
 toast('서버의 코드 구조가 갱신되어 저장되지 않은 소속 분류 변경을 취소했습니다.', 'info');
 }
 }, [hasExplorerChanges, hierarchySignature, initialClusters, toast]);

 const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
 const [selectedGroup, setSelectedGroup] = useState<GroupCode | null>(null);
 const previousSelectedGroupIdRef = React.useRef<string | null | undefined>(undefined);
 const selectedGroupSeedResolvedRef = React.useRef(false);
 const selectedGroupSeedHierarchyRef = React.useRef<string | undefined>(undefined);

 const selectNode = (node: FlattenedCodeNode) => {
 if (node.type === 'cluster') {
 setSelectedClusterId(node.id);
 setSelectedGroup(null);
 return;
 }
 setSelectedClusterId(node.parentId);
 setSelectedGroup(node.data);
 };

 const selectedNodeId = selectedGroup?.cdId ?? selectedClusterId;
 const selectedNode = selectedNodeId
 ? flattenedNodes.find((node) => node.id === selectedNodeId) ?? null
 : null;

 /*
  * [P1-1] 상세코드 조회를 useQuery 로 옮긴다.
  * 종전에는 catch→toast 후 직전 목록이 그대로 남아 "조회 성공"처럼 보였고 재시도 수단이 없었다.
  * 이제 실패는 StandardDataTable 의 error/onRetry 로 화면에 드러난다.
  */
 const selectedCdId = selectedGroup?.cdId ?? null;
 const {
 data: detailRows,
 isFetching: detailsLoading,
 error: detailsError,
 refetch: refetchDetails,
 } = useQuery({
 queryKey: ['cmmn-detail-codes', selectedCdId],
 enabled: !!selectedCdId,
 queryFn: async () => {
 const res = await codeAdminService.getDetailCodeList({
 cdId: selectedCdId as string,
 searchKeyword: selectedCdId as string,
 searchCondition: '1',
 pageUnit: 999
 });
 // 페일세이프: 백엔드가 전체를 반환하는 경우를 대비해 클라이언트에서도 그룹으로 한 번 더 거른다.
 return (res.list || []).filter(item => item && item.cdId === selectedCdId);
 },
 /*
  * SSR 로 이미 받아 둔 상세 목록만 자리표시자로 재사용한다.
  * 직전 그룹의 데이터(prev)를 넘기면 다른 그룹의 코드가 잠깐 노출되므로 쓰지 않는다.
  */
 placeholderData: selectedCdId && selectedCdId === selectedGroupId
 ? details.filter((item): item is CmmnDetailCode => Boolean(item) && item.cdId === selectedCdId)
 : undefined,
 });

 const detailList: CmmnDetailCode[] = detailRows ?? [];

 // D&D Handlers
 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
 useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 const dndAnnouncements = React.useMemo<Announcements>(() => {
 const findNode = (id: string | number) => flattenedNodes.find((node) => node.id === String(id));
 const clusterName = (clusterId: string | null) => (
 flattenedNodes.find((node) => node.type === 'cluster' && node.id === clusterId)?.name ?? '알 수 없는'
 );
 const clusterLabel = (clusterId: string | null) => {
 const name = clusterName(clusterId);
 return formatClassificationLabel(name);
 };
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
 }, [flattenedNodes]);

 const handleDragStart = (event: DragStartEvent) => {
 if (searchQuery || isSaving) return;
 const nextActiveId = event.active.id as string;
 const activeNode = flattenedNodes.find((node) => node.id === nextActiveId);
 if (!activeNode || activeNode.type !== 'group') return;
 setActiveId(nextActiveId);
 selectNode(activeNode);
 };

 const handleDragEnd = (event: DragEndEvent) => {
 if (searchQuery || isSaving) {
 setActiveId(null);
 return;
 }
 const { active, over } = event;
 const activeItem = flattenedNodes.find((node) => node.id === active.id);
 const overId = over?.id;
 const overItem = overId == null ? null : flattenedNodes.find((node) => node.id === overId);
 if (!activeItem || activeItem.type !== 'group' || !overItem || active.id === overId) {
 setActiveId(null);
 return;
 }

 const targetParentId = overItem.type === 'cluster' ? overItem.id : overItem.parentId;
 if (!targetParentId || targetParentId === activeItem.parentId) {
 toast('같은 분류 안의 순서는 저장되지 않습니다. 다른 분류로 이동해 주세요.', 'info');
 setActiveId(null);
 return;
 }

 const remainingNodes = flattenedNodes.filter((node) => node.id !== activeItem.id);
 const targetClusterIndex = remainingNodes.findIndex(
 (node) => node.type === 'cluster' && node.id === targetParentId,
 );
 if (targetClusterIndex < 0) {
 setActiveId(null);
 return;
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
 setFlattenedNodes([
 ...remainingNodes.slice(0, insertionIndex),
 movedItem,
 ...remainingNodes.slice(insertionIndex),
 ]);
 setSelectedClusterId(targetParentId);
 hierarchyRevisionRef.current += 1;
 setHasExplorerChanges(true);
 toast('코드 그룹의 소속 분류가 변경되었습니다.', 'info');

 setActiveId(null);
 };

 /** 선택된 분류에 속한 코드 그룹 수. 미사용 전환 고지에 쓴다. */
 const groupCountOf = (clsfCd: string) =>
  flattenedNodes.filter((node) => node.type === 'group' && node.parentId === clsfCd).length;

 const openCreateCluster = () => {
 clusterForm.reset({ clsfCd: '', clsfCdNm: '', clsfCdExpln: '', useYn: 'Y' });
 setStructureModal({ kind: 'cluster', mode: 'create' });
 };

 const openEditCluster = () => {
 if (selectedNode?.type !== 'cluster') return;
 const source = clCodes.find((cl) => cl.clsfCd === selectedNode.id);
 clusterForm.reset({
 clsfCd: selectedNode.id,
 clsfCdNm: source?.clsfCdNm ?? selectedNode.name,
 clsfCdExpln: source?.clsfCdExpln ?? '',
 useYn: (source?.useYn as 'Y' | 'N') ?? 'Y',
 });
 setStructureModal({ kind: 'cluster', mode: 'edit' });
 };

 /** 새 그룹은 반드시 분류에 속한다 — 서버가 clsfCd 를 필수로 요구한다. */
 const openCreateGroup = () => {
 const defaultCluster = selectedNode?.type === 'cluster'
 ? selectedNode.id
 : selectedNode?.type === 'group'
 ? selectedNode.parentId ?? ''
 : clCodes[0]?.clsfCd ?? '';
 groupForm.reset({ cdId: '', cdIdNm: '', cdIdExpln: '', clsfCd: defaultCluster, useYn: 'Y' });
 setStructureModal({ kind: 'group', mode: 'create' });
 };

 const openEditGroup = () => {
 if (selectedNode?.type !== 'group') return;
 const source = groups.find((g) => g.cdId === selectedNode.id);
 groupForm.reset({
 cdId: selectedNode.id,
 cdIdNm: source?.cdIdNm ?? selectedNode.name,
 cdIdExpln: source?.cdIdExpln ?? '',
 clsfCd: selectedNode.parentId ?? source?.clsfCd ?? '',
 useYn: (source?.useYn as 'Y' | 'N') ?? 'Y',
 });
 setStructureModal({ kind: 'group', mode: 'edit' });
 };

 const closeStructureModal = () => {
 if (structureSubmitAttemptRef.current || structureSavePendingRef.current) return;
 setStructureModal(null);
 };

 const onSubmitCluster = async (values: z.infer<typeof codeClusterFormSchema>) => {
 if (structureSavePendingRef.current) return;
 const isNew = structureModal?.mode === 'create';

 /*
  * 분류를 미사용으로 바꾸면 **소속 코드 그룹이 전부 목록에서 사라진다** —
  * 코드그룹 조회가 commonCodeCategory.useYn.eq("Y") 로 조인 필터를 걸기 때문이다
  * (CommonCodeGroupRepositoryImpl). 되돌릴 수는 있지만 사용자에게는 데이터가 없어진 것처럼
  * 보이므로, 저장 전에 결과를 그대로 말한다.
  */
 if (!isNew && values.useYn === 'N') {
 const affected = groupCountOf(values.clsfCd);
 if (affected > 0) {
 const ok = await confirm({
 title: '분류를 미사용으로 전환',
 message: '이 분류를 미사용으로 바꾸면 소속 코드 그룹 ' + affected + '개가 목록에서 함께 사라집니다. 그룹과 상세 코드가 지워지는 것은 아니며, 분류를 다시 사용으로 되돌리면 그대로 나타납니다.',
 confirmText: '미사용으로 전환',
 });
 if (!ok) return;
 }
 }

 structureSavePendingRef.current = true;
 setIsStructureSaving(true);
 try {
 const res = await saveClCodeAction(null, { ...values, isNew });
 if (res.success) {
 toast(res.message, 'success');
 setStructureModal(null);
 router.refresh();
 } else if (!clusterForm.applyServerErrors(res)) {
 toast(res.message, 'error');
 }
 } catch (error) {
 if (!clusterForm.applyServerErrors(error)) {
 toast('서버 통신 중 오류가 발생했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.', 'error');
 }
 } finally {
 structureSavePendingRef.current = false;
 structureSubmitAttemptRef.current = false;
 setIsStructureSaving(false);
 }
 };

 const onSubmitGroup = async (values: z.infer<typeof codeGroupFormSchema>) => {
 if (structureSavePendingRef.current) return;
 const isNew = structureModal?.mode === 'create';
 structureSavePendingRef.current = true;
 setIsStructureSaving(true);
 try {
 const res = await saveCmmnCodeAction(null, { ...values, isNew });
 if (res.success) {
 toast(res.message, 'success');
 setStructureModal(null);
 router.refresh();
 } else if (!groupForm.applyServerErrors(res)) {
 toast(res.message, 'error');
 }
 } catch (error) {
 if (!groupForm.applyServerErrors(error)) {
 toast('서버 통신 중 오류가 발생했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.', 'error');
 }
 } finally {
 structureSavePendingRef.current = false;
 structureSubmitAttemptRef.current = false;
 setIsStructureSaving(false);
 }
 };

 const submitStructureForm = (event?: React.BaseSyntheticEvent) => {
 if (structureSubmitAttemptRef.current || structureSavePendingRef.current) {
 event?.preventDefault();
 return;
 }
 structureSubmitAttemptRef.current = true;
 const activeForm = structureModal?.kind === 'cluster' ? clusterForm : groupForm;
 const handler = structureModal?.kind === 'cluster'
 ? activeForm.handleSubmit(onSubmitCluster as never, () => { structureSubmitAttemptRef.current = false; })
 : activeForm.handleSubmit(onSubmitGroup as never, () => { structureSubmitAttemptRef.current = false; });
 void handler(event).catch(() => {
 structureSubmitAttemptRef.current = false;
 structureSavePendingRef.current = false;
 setIsStructureSaving(false);
 });
 };

 const handleSaveExplorerChanges = async () => {
 if (hierarchySavePendingRef.current || !hasExplorerChanges || !selectedNode || isSaving || isModalOpen || isPickerOpen) return;
 hierarchySavePendingRef.current = true;
 const savingRevision = hierarchyRevisionRef.current;
 setIsSaving(true);
 try {
 const res = await saveCmmnCodeHierarchyAction(flattenedNodes);
 if (res.success) {
 toast(res.message, 'success');
 if (hierarchyRevisionRef.current === savingRevision) {
 setHasExplorerChanges(false);
 router.refresh();
 } else {
 toast('저장 중 추가된 소속 분류 변경이 남아 있습니다. 다시 저장해 주세요.', 'info');
 }
 } else {
 toast(res.message, 'error');
 }
 } catch {
 toast('그룹 소속 저장 중 오류 발생', 'error');
 } finally {
 hierarchySavePendingRef.current = false;
 setIsSaving(false);
 }
 };

 /**
  * CodePicker 1호 소비처 — 팝업에서 고른 코드의 그룹을 탐색기에서 그대로 선택한다.
  * (상세 목록은 기존 useQuery 경로가 이어받는다. 신규 조회 경로를 만들지 않는다.)
  */
 const handlePickCode = ({ group, code }: CodePickerSelection) => {
 const cluster = initialClusters.find(c => (c.groups || []).some(g => g?.cdId === group.cdId));
 const treeGroup = cluster ? (cluster.groups || []).find(g => g?.cdId === group.cdId) : null;
 if (!cluster || !treeGroup) {
 toast('선택한 코드 그룹을 현재 탐색기에서 찾을 수 없습니다. 데이터를 새로고침한 뒤 다시 시도해 주세요.', 'error');
 return;
 }
 setSearchQuery('');
 setSelectedClusterId(cluster.id);
 setSelectedGroup(treeGroup);
 toast(`‘${code.dtlCdNm}’(${code.dtlCd}) — ${group.cdIdNm} 그룹이 선택되었습니다.`, 'success');
 };

 // Synchronize initial state from props
 useEffect(() => {
 const nextSelectedGroupId = selectedGroupId ?? null;
 const previousSelectedGroupId = previousSelectedGroupIdRef.current;
 const seedChanged = previousSelectedGroupId !== nextSelectedGroupId;
 const hierarchyChanged = selectedGroupSeedHierarchyRef.current !== hierarchySignature;
 if (!seedChanged && !hierarchyChanged) return;
 previousSelectedGroupIdRef.current = nextSelectedGroupId;
 selectedGroupSeedHierarchyRef.current = hierarchySignature;

 const findGroup = (groupId: string) => {
 const cluster = initialClusters.find((item) => item.groups.some((group) => group.cdId === groupId));
 const group = cluster?.groups.find((item) => item.cdId === groupId);
 return cluster && group ? { cluster, group } : null;
 };
 const revealSelectionIfHidden = (nodeId: string) => {
 if (!searchQuery) return;
 const nextVisibleNodes = filterCodeNodes(flattenCodeTree(initialClusters), searchQuery);
 if (!nextVisibleNodes.some((node) => node.id === nodeId)) setSearchQuery('');
 };

 if (!seedChanged) {
 if (selectedGroup) {
 const currentSelection = findGroup(selectedGroup.cdId);
 if (currentSelection) {
 revealSelectionIfHidden(currentSelection.group.cdId);
 setSelectedClusterId(currentSelection.cluster.id);
 setSelectedGroup(currentSelection.group);
 return;
 }
 if (selectedGroup.cdId === nextSelectedGroupId) selectedGroupSeedResolvedRef.current = false;
 setSelectedClusterId(null);
 setSelectedGroup(null);
 return;
 }

 if (selectedClusterId) {
 const clusterStillExists = initialClusters.some((cluster) => cluster.id === selectedClusterId);
 if (clusterStillExists) revealSelectionIfHidden(selectedClusterId);
 else setSelectedClusterId(null);
 return;
 }

 if (selectedGroupSeedResolvedRef.current || !nextSelectedGroupId) return;
 const lateSelection = findGroup(nextSelectedGroupId);
 if (!lateSelection) return;
 selectedGroupSeedResolvedRef.current = true;
 setSearchQuery('');
 setSelectedClusterId(lateSelection.cluster.id);
 setSelectedGroup(lateSelection.group);
 return;
 }

 selectedGroupSeedResolvedRef.current = false;

 if (!nextSelectedGroupId) {
 selectedGroupSeedResolvedRef.current = true;
 if (previousSelectedGroupId !== undefined) {
 setSelectedClusterId(null);
 setSelectedGroup(null);
 }
 return;
 }

 const seededSelection = findGroup(nextSelectedGroupId);
 if (seededSelection) {
 selectedGroupSeedResolvedRef.current = true;
 setSearchQuery('');
 setSelectedClusterId(seededSelection.cluster.id);
 setSelectedGroup(seededSelection.group);
 return;
 }
 setSelectedClusterId(null);
 setSelectedGroup(null);
 }, [
 hierarchySignature,
 initialClusters,
 selectedClusterId,
 selectedGroup,
 selectedGroupId,
 searchQuery,
 ]);

 // Filtered Nodes
 const visibleNodes = React.useMemo(
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

 const handleEditDetail = (detail: CmmnDetailCode) => {
 if (!selectedGroup || isModalOpen || detailSubmitAttemptRef.current
 || detailSavePendingRef.current || detailDeletePendingRef.current) return;
 setModalTargetGroup({ cdId: selectedGroup.cdId, cdIdNm: selectedGroup.cdIdNm });
 setEditingDetail(detail);
 setIsOpen(true);
 };

 /** [P1-9] 확인 본문에 대상 식별자(코드·명칭)를 노출해 오삭제를 막는다. */
 const handleDeleteDetail = async (detail: CmmnDetailCode) => {
 if (!selectedGroup || isModalOpen || detailSubmitAttemptRef.current
 || detailSavePendingRef.current || detailDeletePendingRef.current) return;
 detailDeletePendingRef.current = true;
 const targetGroup = selectedGroup;
 const targetGroupId = targetGroup.cdId;
 setDeletingDetailKey(`${targetGroupId}:${detail.dtlCd}`);

 try {
 const ok = await confirm({
 title: '상세 코드 삭제',
 message: `‘${detail.dtlCdNm}’(코드 ${detail.dtlCd}) 를 ${targetGroup.cdIdNm} 그룹에서 영구히 삭제합니다. 되돌릴 수 없습니다.`,
 variant: 'destructive',
 confirmText: '삭제'
 });

 if (!ok) return;

 const res = await deleteCodeDetail(null, { cdId: targetGroupId, dtlCd: detail.dtlCd });
 if (res.success) {
 toast(res.message, 'success');
 await queryClient.invalidateQueries({ queryKey: ['cmmn-detail-codes', targetGroupId] });
 } else {
 toast(res.message, 'error');
 }
 } catch {
 toast('네트워크 오류가 발생했습니다.', 'error');
 } finally {
 detailDeletePendingRef.current = false;
 setDeletingDetailKey(null);
 }
 };

 const handleCreateDetail = () => {
 if (isModalOpen || detailSubmitAttemptRef.current
 || detailSavePendingRef.current || detailDeletePendingRef.current) return;
 if (!selectedGroup) {
 toast('코드 명세를 등록할 그룹 코드를 먼저 선택하십시오.', 'info');
 return;
 }
 setModalTargetGroup({ cdId: selectedGroup.cdId, cdIdNm: selectedGroup.cdIdNm });
 setEditingDetail(null);
 setIsOpen(true);
 };

 const forceCloseDetailModal = () => {
 setIsOpen(false);
 setEditingDetail(null);
 setModalTargetGroup(null);
 };

 const closeDetailModal = () => {
 if (detailSubmitAttemptRef.current || detailSavePendingRef.current
 || detailDeletePendingRef.current || form.formState.isSubmitting) return;
 forceCloseDetailModal();
 };

 const onSubmit = async (values: z.infer<typeof codeDetailFormSchema>) => {
 if (detailSavePendingRef.current || detailDeletePendingRef.current) return;
 if (!modalTargetGroup) {
 const message = '저장할 코드 그룹을 확인할 수 없습니다. 창을 닫고 다시 시도해 주세요.';
 form.setError('root.server', { type: 'server', message });
 void form.focusError('root.server', 'server');
 detailSubmitAttemptRef.current = false;
 return;
 }
 const targetGroupId = modalTargetGroup.cdId;
 detailSavePendingRef.current = true;
 setIsDetailSaving(true);
 try {
 const res = await saveCodeDetail(null, {
 ...values,
 useYn: values.useYn as 'Y' | 'N',
 cdId: targetGroupId,
 isNew: !editingDetail
 });

 if (res.success) {
 toast(res.message, 'success');
 await queryClient.invalidateQueries({ queryKey: ['cmmn-detail-codes', targetGroupId] });
 forceCloseDetailModal();
 } else {
 if (!form.applyServerErrors(res)) {
 toast(res.message, 'error');
 }
 }
 } catch (error) {
 if (!form.applyServerErrors(error)) {
 toast('서버 통신 중 오류가 발생했습니다. 입력 내용은 유지되므로 잠시 후 다시 시도해 주세요.', 'error');
 }
 } finally {
 detailSavePendingRef.current = false;
 detailSubmitAttemptRef.current = false;
 setIsDetailSaving(false);
 }
 };

 const submitDetailForm = (event?: React.BaseSyntheticEvent) => {
 if (detailSubmitAttemptRef.current || detailSavePendingRef.current || detailDeletePendingRef.current) {
 event?.preventDefault();
 return;
 }
 detailSubmitAttemptRef.current = true;
 const submit = form.handleSubmit(onSubmit, () => {
 detailSubmitAttemptRef.current = false;
 });
 void submit(event).catch(() => {
 detailSubmitAttemptRef.current = false;
 detailSavePendingRef.current = false;
 setIsDetailSaving(false);
 });
 };

 /* 셀 py-4 오버라이드를 제거해 표 밀도를 --cell-py(밀도 축) 단일 소스로 되돌린다. */
 const columns: Column<CmmnDetailCode>[] = [
 {
 header: '코드',
 accessor: (item: CmmnDetailCode) => <span className="font-black text-foreground tracking-tight text-xs">{item.dtlCd}</span>,
 className: 'w-24'
 },
 {
 header: '코드 명칭',
 accessor: (item: CmmnDetailCode) => (
 <div className="flex flex-col gap-0.5">
 <span className="font-black text-foreground tracking-tighter text-sm">{item.dtlCdNm}</span>
 <span className="line-clamp-1 text-xs text-muted-foreground">{item.dtlCdExpln || '등록된 설명 없음'}</span>
 </div>
 )
 },
 {
 header: '상태',
 accessor: (item: CmmnDetailCode) => <HubStatusBadge status={item.useYn === 'Y' ? '사용 중' : '미사용'} />,
 className: 'w-32'
 },
 {
 header: '관리',
 className: 'text-right w-24',
 accessor: (item: CmmnDetailCode) => {
 const isDeleting = deletingDetailKey === `${selectedGroup?.cdId}:${item.dtlCd}`;
 return (
 <div className="flex justify-end gap-1.5">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 aria-label={`${item.dtlCdNm} 코드 수정`}
 disabled={isDetailWritePending || isModalOpen}
 className="h-8 w-8 hover:bg-muted rounded-lg transition-colors"
 onClick={(e) => { e.preventDefault(); handleEditDetail(item); }}
 >
 <Settings size={14} className="text-muted-foreground" aria-hidden="true" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 aria-label={`${item.dtlCdNm} 코드 ${isDeleting ? '삭제 중…' : '삭제'}`}
 aria-busy={isDeleting || undefined}
 disabled={isDetailWritePending || isModalOpen}
 className="h-8 w-8 text-destructive-emphasis hover:bg-destructive/10 rounded-lg transition-colors"
 onClick={(e) => { e.preventDefault(); handleDeleteDetail(item); }}
 >
 {isDeleting
 ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
 : <Trash2 size={14} aria-hidden="true" />}
 </Button>
 </div>
 );
 }
 }
 ];

 const activeNode = activeId ? flattenedNodes.find(n => n.id === activeId) : null;
 const saveDisabled = !hasExplorerChanges || !selectedNode || isSaving || isModalOpen || isPickerOpen;
 const DetailSubheading = embedded ? 'h4' : 'h3';

 return (
 <div>
 <MasterDetailPage
 title="공통 코드 관리"
 headingLevel={embedded ? 2 : 1}
 description="코드 분류와 그룹을 선택해 상세 코드를 조회하고 관리합니다."
 breadcrumbItems={[{ label: '시스템관리' }, { label: '코드관리' }, { label: '공통 코드' }]}
 notice={notice}
 showBreadcrumb={!embedded}
 actions={(
 <Button
 type="button"
 onClick={handleSaveExplorerChanges}
 disabled={saveDisabled}
 aria-busy={isSaving || undefined}
 className="gap-2"
 >
 <Save size={16} aria-hidden="true" />
 {isSaving ? '그룹 소속 저장 중…' : '그룹 소속 저장'}
 </Button>
 )}
 masterTitle="코드 분류 및 그룹"
 masterDescription={`분류 ${clCodes.length}개 · 그룹 ${groups.length}개`}
 masterTools={(
 <div className="flex items-center gap-2">
 <Button type="button" variant="outline" size="sm" onClick={openCreateCluster}>
 분류 등록
 </Button>
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={openCreateGroup}
 disabled={clCodes.length === 0}
 title={clCodes.length === 0 ? '코드 그룹은 분류에 속해야 합니다. 분류를 먼저 등록하세요.' : undefined}
 >
 그룹 등록
 </Button>
 <Button type="button" variant="outline" size="sm" onClick={() => setIsPickerOpen(true)}>
 코드 검색
 </Button>
 </div>
 )}
 master={(
 <div className="space-y-3">
 <div className="relative">
 <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
 <Input
 placeholder="분류·그룹명 또는 코드로 검색"
 aria-label="분류·그룹명 또는 코드로 검색"
 value={searchQuery}
 onChange={(event) => handleSearchChange(event.target.value)}
 className="pl-10"
 />
 </div>
 {searchQuery && (
 <p className="text-xs text-muted-foreground">검색 중에는 코드 그룹의 소속 분류를 변경할 수 없습니다.</p>
 )}

 {visibleNodes.length === 0 ? (
 <div role="status" className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
 <SearchSlash size={28} aria-hidden="true" />
 <p className="text-sm font-semibold">
 {loadFailed
 ? '코드 분류·그룹을 불러오지 못했습니다.'
 : searchQuery
 ? '검색 결과가 없습니다'
 : '등록된 코드 분류·그룹이 없습니다.'}
 </p>
 </div>
 ) : (
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
 dragDisabled={Boolean(searchQuery) || isSaving}
 parentClassificationName={node.type === 'group'
 ? flattenedNodes.find((candidate) => candidate.type === 'cluster' && candidate.id === node.parentId)?.name
 : undefined}
 onClick={() => selectNode(node)}
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
 )}
 </div>
 )}
 selectedItemLabel={selectedNode?.name}
 detailTitle="코드 상세"
 detailDescription={selectedNode?.type === 'group'
 ? (selectedNode.data.cdIdExpln || `그룹 코드 ${selectedNode.id}`)
 : selectedNode?.type === 'cluster'
 ? `분류 코드 ${selectedNode.id}`
 : undefined}
 detailActions={selectedGroup ? (
 /* 주 과업(상세 코드 등록)이 먼저다 — 목록에서 Tab 을 누르면 상세 액션의 첫 버튼으로 이동한다(A2 계약). */
 <div className="flex flex-wrap items-center gap-2">
 <Button type="button" onClick={handleCreateDetail} disabled={isDetailWritePending || isModalOpen} className="gap-2">
 <Plus size={16} aria-hidden="true" /> 신규 상세 코드 등록
 </Button>
 <Button type="button" variant="outline" onClick={openEditGroup} disabled={isStructureFormPending} className="gap-2">
 <Settings size={16} aria-hidden="true" /> 그룹 수정
 </Button>
 </div>
 ) : selectedNode?.type === 'cluster' ? (
 <Button type="button" variant="outline" onClick={openEditCluster} disabled={isStructureFormPending} className="gap-2">
 <Settings size={16} aria-hidden="true" /> 분류 수정
 </Button>
 ) : undefined}
 detail={selectedNode?.type === 'group' ? (
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
 onRetry={() => refetchDetails()}
 keyField="dtlCd"
 emptyMessage="데이터가 존재하지 않습니다."
 className="border-none shadow-none bg-transparent"
 isPremium={false}
 />
 </div>
 ) : selectedNode?.type === 'cluster' ? (
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
 {flattenedNodes.filter((node) => node.type === 'group' && node.parentId === selectedNode.id).length}개
 </dd>
 </div>
 </dl>
 </section>
 ) : undefined}
 emptyDetailTitle="선택된 코드 없음"
 emptyDetailDescription="왼쪽 목록에서 코드 분류 또는 그룹을 선택하세요."
 onSaveShortcut={handleSaveExplorerChanges}
 saveShortcutDisabled={saveDisabled}
 />


 {/* 구조(분류·그룹) 편집 모달 — 상세 코드 모달과 폼 패턴을 공유한다. */}
 <StandardModal
 isOpen={structureModal !== null}
 onClose={closeStructureModal}
 closeDisabled={isStructureFormPending}
 title={structureModal?.kind === 'cluster'
 ? (structureModal.mode === 'create' ? '코드 분류 등록' : '코드 분류 수정')
 : (structureModal?.mode === 'create' ? '코드 그룹 등록' : '코드 그룹 수정')}
 maxWidth="2xl"
 footer={
 <div className="flex w-full gap-4">
 <Button
 variant="outline"
 onClick={closeStructureModal}
 disabled={isStructureFormPending}
 className="h-11 flex-1 rounded-lg border-2 border-border text-xs font-bold shadow-sm"
 >
 취소
 </Button>
 <Button
 type="button"
 onClick={() => submitStructureForm()}
 disabled={isStructureFormPending}
 aria-busy={isStructureFormPending || undefined}
 className="h-11 flex-[2] rounded-lg border-none bg-primary text-xs font-bold text-primary-foreground shadow-sm"
 >
 <Save size={18} aria-hidden="true" />
 {isStructureFormPending ? '저장 중…' : '저장'}
 </Button>
 </div>
 }
 >
 {structureModal?.kind === 'cluster' ? (
 <Form {...clusterForm}>
 <form noValidate onSubmit={submitStructureForm} className="space-y-8 pt-4">
 <FormErrorSummary labels={CODE_CLUSTER_FIELD_LABELS} onNavigate={clusterForm.focusError} />
 <ShadcnFormField
 control={clusterForm.control}
 name="clsfCd"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">분류 코드</FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={structureModal.mode === 'edit'}
 maxLength={12}
 className="h-11 rounded-lg border-none bg-muted font-mono text-xs font-bold shadow-inner"
 placeholder="예: SYS (최대 12자)"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={clusterForm.control}
 name="clsfCdNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">분류명</FormLabel>
 <FormControl>
 <Input {...field} maxLength={100} className="h-11 rounded-lg border-none bg-muted text-sm font-bold shadow-inner" placeholder="분류명 입력 (최대 100자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={clusterForm.control}
 name="useYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">사용 여부</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold text-success-emphasis">사용 중</SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold text-destructive-emphasis">미사용</SelectItem>
 </SelectContent>
 </Select>
 <p className="px-1 text-xs text-muted-foreground">
 미사용으로 바꾸면 이 분류에 속한 코드 그룹이 목록에서 함께 사라집니다(그룹·상세 코드는 지워지지 않습니다).
 </p>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={clusterForm.control}
 name="clsfCdExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">분류 설명</FormLabel>
 <FormControl>
 <textarea {...field} maxLength={4000} className="w-full min-h-[120px] resize-none rounded-lg border-none bg-muted p-4 text-xs font-bold shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="이 분류가 무엇을 묶는지 설명 (최대 4000자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </form>
 </Form>
 ) : structureModal ? (
 <Form {...groupForm}>
 <form noValidate onSubmit={submitStructureForm} className="space-y-8 pt-4">
 <FormErrorSummary labels={CODE_GROUP_FIELD_LABELS} onNavigate={groupForm.focusError} />
 <ShadcnFormField
 control={groupForm.control}
 name="cdId"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">그룹 코드</FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={structureModal.mode === 'edit'}
 maxLength={20}
 className="h-11 rounded-lg border-none bg-muted font-mono text-xs font-bold shadow-inner"
 placeholder="예: COM001 (최대 20자)"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={groupForm.control}
 name="cdIdNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">그룹명</FormLabel>
 <FormControl>
 <Input {...field} maxLength={100} className="h-11 rounded-lg border-none bg-muted text-sm font-bold shadow-inner" placeholder="그룹명 입력 (최대 100자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 {structureModal.mode === 'create' ? (
 <ShadcnFormField
 control={groupForm.control}
 name="clsfCd"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">소속 분류</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue placeholder="분류 선택" />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 {clCodes.map((cl) => (
 <SelectItem key={cl.clsfCd} value={cl.clsfCd} className="h-12 rounded-lg text-xs font-bold">
 {cl.clsfCdNm} ({cl.clsfCd})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 ) : (
 <div className="space-y-1.5">
 <span id="cmmn-group-cluster-label" className="text-xs font-bold text-foreground">소속 분류</span>
 <div
 aria-labelledby="cmmn-group-cluster-label"
 className="flex h-11 items-center rounded-lg bg-muted px-4 font-mono text-xs font-bold text-muted-foreground shadow-inner"
 >
 {groupForm.getValues('clsfCd')}
 </div>
 {/* 서버의 updateCmmnCode 는 clsfCd 를 갱신하지 않는다. 편집 가능한 것처럼 보이면 저장된 척하고 아무 일도 일어나지 않는다. */}
 <p className="px-1 text-xs text-muted-foreground">
 소속 분류는 이 창에서 바꿀 수 없습니다. 왼쪽 탐색기에서 그룹을 다른 분류로 끌어다 놓은 뒤 &lsquo;그룹 소속 저장&rsquo;을 누르세요.
 </p>
 </div>
 )}
 <ShadcnFormField
 control={groupForm.control}
 name="useYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">사용 여부</FormLabel>
 <Select onValueChange={field.onChange} value={field.value}>
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold text-success-emphasis">사용 중</SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold text-destructive-emphasis">미사용</SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 <ShadcnFormField
 control={groupForm.control}
 name="cdIdExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5">
 <FormLabel className="text-xs font-bold text-foreground">그룹 설명</FormLabel>
 <FormControl>
 <textarea {...field} maxLength={4000} className="w-full min-h-[120px] resize-none rounded-lg border-none bg-muted p-4 text-xs font-bold shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="이 그룹의 용도와 제약 설명 (최대 4000자)" />
 </FormControl>
 <FormMessage className="text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </form>
 </Form>
 ) : null}
 </StandardModal>

 {/* CodePicker — 그룹→코드 2단 검색 팝업 (1호 소비처) */}
 <CodePicker
 isOpen={isPickerOpen}
 onClose={() => setIsPickerOpen(false)}
 onSelect={handlePickCode}
 />

 {/* Standard Modal for CRUD */}
 <StandardModal
 isOpen={isModalOpen}
 onClose={closeDetailModal}
 title={editingDetail ? '아키텍처 명세 수정' : '신규 명세 등록'}
 maxWidth="3xl"
 footer={
 <div className="flex w-full gap-4">
 <Button
 variant="outline"
 onClick={closeDetailModal}
 disabled={isDetailWritePending}
 className="h-11 flex-1 rounded-lg border-2 border-border text-xs font-bold shadow-sm"
 >
 취소
 </Button>
 <Button
 type="button"
 onClick={() => submitDetailForm()}
 disabled={isDetailWritePending}
 aria-busy={isDetailFormPending || undefined}
 className="h-11 flex-[2] rounded-lg border-none bg-primary text-xs font-bold text-primary-foreground shadow-sm"
 >
 <Plus size={18} aria-hidden="true" className="group-hover:rotate-90 transition-transform" />
 {isDetailFormPending ? '저장 중…' : '저장'}
 </Button>
 </div>
 }
 >
 <Form {...form}>
 <form noValidate onSubmit={submitDetailForm} className="space-y-10 pt-4">
 <FormErrorSummary
 labels={CODE_DETAIL_FIELD_LABELS}
 onNavigate={form.focusError}
 />
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-8">
 {/* [P2] 폼 컨트롤이 아닌 읽기 전용 표시라 <label> 이 아닌 <span> + aria-describedby 로 연결한다. */}
 <div className="space-y-1.5 p-0.5">
 <span id="cmmn-parent-group-label" className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 상위 그룹 식별자
 </span>
 <div
 aria-labelledby="cmmn-parent-group-label"
 className="h-11 flex items-center px-6 rounded-lg bg-muted border-none font-mono text-xs font-bold shadow-inner text-muted-foreground"
 >
 {modalTargetGroup?.cdId}
 </div>
 </div>

 <ShadcnFormField
 control={form.control}
 name="dtlCd"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 코드 식별자 (Unique ID)
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={!!editingDetail}
 maxLength={12}
 className="h-11 rounded-lg font-mono text-xs font-bold shadow-inner border-none bg-muted focus:bg-card transition-all text-left"
 placeholder="Unique code indicator (최대 12자)"
 />
 </FormControl>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="dtlCdNm"
 required
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 표기 레이블 (Label)
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 maxLength={100}
 className="h-11 rounded-lg text-sm font-bold tracking-tight shadow-inner border-none bg-muted focus:bg-card transition-all text-left"
 placeholder="레이블 명칭 입력 (최대 100자)"
 />
 </FormControl>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </div>

 <div className="space-y-8">
 <ShadcnFormField
 control={form.control}
 name="useYn"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 활성 상태 프로토콜
 </FormLabel>
 <Select
 onValueChange={field.onChange}
 defaultValue={field.value}
 value={field.value}
 >
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted text-xs font-bold shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold text-success-emphasis">
 사용 중 (ACTIVE)
 </SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold text-destructive-emphasis">
 미사용 (INACTIVE)
 </SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="dtlCdExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="ml-1 flex items-center gap-1.5 text-xs font-bold text-foreground">
 메타데이터 컨텍스트 설명
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 maxLength={4000}
 className="w-full min-h-[160px] resize-none rounded-lg border-none bg-muted p-6 text-left text-xs font-bold shadow-inner outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
 placeholder="코드 사용처 및 시스템 제약 조건 설명... (최대 4000자)"
 />
 </FormControl>
 <FormMessage className="mt-1 px-1 text-xs font-bold text-destructive-emphasis" />
 </FormItem>
 )}
 />
 </div>
 </div>
 </form>
 </Form>
 </StandardModal>
 </div>
 );
}

