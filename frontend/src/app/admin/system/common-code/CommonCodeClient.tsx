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
 DropAnimation } from '@dnd-kit/core';
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 verticalListSortingStrategy,
 useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { flattenCodeTree,  getCodeProjection,  FlattenedCodeNode } from './treeUtils';
import { cn } from '@/lib/utils';
import { Layers,  
 Tag,  
 Database,  
 Search,  
 SearchSlash,  
 Plus,  
 RefreshCcw,  
 Settings,  
 Trash2, 
 Fingerprint, 
 Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppForm } from '@/hooks/useAppForm';
;
import { 
 Form, 
 FormControl, 
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
 saveCmmnCodeHierarchyAction
} from '@/app/actions/codeActions';
import { 
 CmmnClCode, 
 CmmnCode, 
 CmmnDetailCode 
} from '@/types/foundation/system';
import { DomainCluster, GroupCode } from '@/types/foundation/code';

const INDENTATION_WIDTH = 24;

import { CmmnDetailCodeDtoSchema } from '@/types/generated-zod';

const codeDetailFormSchema = CmmnDetailCodeDtoSchema.extend({
 dtlCd: z.string().min(1).max(12),
 dtlCdNm: z.string().min(1).max(100),
 useYn: z.enum(['Y', 'N']).default('Y'),
});

const dropAnimation: DropAnimation = {
 sideEffects: defaultDropAnimationSideEffects({
 styles: {
 active: {
 opacity: '0.5',
 },
 },
 }),
};

interface SortableCodeNodeProps {
 node: FlattenedCodeNode;
 isSelected: boolean;
 onClick: () => void;
 isOverlay?: boolean;
}

const SortableCodeNode = ({ node, isSelected, onClick, isOverlay = false }: SortableCodeNodeProps) => {
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id: node.id });

 const style = {
 transform: isOverlay ? undefined : CSS.Translate.toString(transform),
 transition: isOverlay ? undefined : transition,
 paddingLeft: isOverlay ? 0 : `${node.depth * INDENTATION_WIDTH}px`,
 };

 const isCluster = node.type === 'cluster';

 return (
 <div
 ref={setNodeRef}
 style={style}
 className={cn(
 "group relative mb-1 outline-none",
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
 {...attributes}
 {...listeners}
 onClick={onClick}
 className={cn(
 "w-full flex items-center justify-between p-3 rounded-lg transition-all relative overflow-hidden",
 isCluster 
 ? "bg-muted/50 hover:bg-muted/50 border border-transparent" 
 : "hover:bg-muted border border-transparent",
 isSelected && isCluster && "bg-surface-inverse text-surface-inverse-foreground shadow-xl border-surface-inverse-border",
 isSelected && !isCluster && "bg-primary text-primary-foreground shadow-lg shadow-primary/20 border-primary/20",
 isOverlay && "bg-card shadow-2xl border-primary ring-4 ring-primary/5 scale-105"
 )}
 >
 <div className="flex items-center gap-3 truncate relative z-10 w-full">
 <div className={cn(
 "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
 isCluster 
 ? (isSelected ? "bg-primary/20 text-primary" : "bg-card text-muted-foreground border border-border shadow-sm")
 : (isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary")
 )}>
 {isCluster ? <Layers size={14} /> : <Tag size={14} />}
 </div>
 <div className="flex flex-col truncate items-start">
 {/* 선택 배경이 cluster=surface-inverse / group=primary 로 달라 전경 토큰도 짝을 맞춘다 */}
 <span className={cn(
 "text-xs font-bold truncate leading-tight uppercase tracking-tight",
 isSelected ? (isCluster ? "text-surface-inverse-foreground" : "text-primary-foreground") : "text-foreground"
 )}>
 {node.name}
 </span>
 <span className={cn(
 "text-xs font-mono font-bold tracking-tighter opacity-60",
 isSelected ? (isCluster ? "text-surface-inverse-foreground" : "text-primary-foreground") : "text-muted-foreground"
 )}>
 {node.id}
 </span>
 </div>
 {isSelected && (
 <div className="ml-auto">
 <div className={cn(
 "w-1.5 h-1.5 rounded-full",
 isCluster ? "bg-primary animate-pulse" : "bg-primary-foreground animate-pulse"
 )} />
 </div>
 )}
 </div>
 
 {/* Background decorative elements for selected cluster */}
 {isSelected && isCluster && (
 <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
 <Layers size={40} />
 </div>
 )}
 </button>
 </div>
 );
};

interface CommonCodeClientProps {
 clCodes: CmmnClCode[];
 groups: CmmnCode[];
 details: CmmnDetailCode[];
 selectedGroupId?: string | null;
}

export default function CommonCodeClient({
 clCodes,
 groups,
 details,
 selectedGroupId
}: CommonCodeClientProps) {
 const router = useRouter();
 const { toast } = useToast();
 const confirm = useConfirm();

 // --- State ---
 const [searchQuery, setSearchQuery] = useState('');
 const [isPickerOpen, setIsPickerOpen] = useState(false);
 const [isModalOpen, setIsOpen] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [editingDetail, setEditingDetail] = useState<CmmnDetailCode | null>(null);
 
 // D&D States
 const [flattenedNodes, setFlattenedNodes] = useState<FlattenedCodeNode[]>([]);
 const [activeId, setActiveId] = useState<string | null>(null);
 const [hasExplorerChanges, setHasExplorerChanges] = useState(false);

 const form = useAppForm(codeDetailFormSchema, {
 defaultValues: {
 dtlCd: '',
 dtlCdNm: '',
 useYn: 'Y',
 dtlCdExpln: ''
 }
 });

 useEffect(() => {
 if (isModalOpen) {
 if (editingDetail) {
 form.reset({
 dtlCd: editingDetail.dtlCd,
 dtlCdNm: editingDetail.dtlCdNm,
 useYn: (editingDetail.useYn as 'Y' | 'N') || 'Y',
 dtlCdExpln: editingDetail.dtlCdExpln || ''
 });
 } else {
 form.reset({
 dtlCd: '',
 dtlCdNm: '',
 useYn: 'Y',
 dtlCdExpln: ''
 });
 }
 }
 }, [isModalOpen, editingDetail, form]);

 const initialClusters = React.useMemo(() => {
 const safeClCodes = Array.isArray(clCodes) ? clCodes.filter(Boolean) : [];
 const safeGroups = Array.isArray(groups) ? groups.filter(Boolean) : [];
 const safeDetails = Array.isArray(details) ? details.filter(Boolean) : [];

 return safeClCodes.map(cl => ({
 ...cl,
 id: cl.clsfCd || '',
 name: cl.clsfCdNm || '',
 groups: safeGroups
 .filter(g => g.clsfCd === cl.clsfCd)
 .map(g => ({
 ...g,
 details: g.cdId === selectedGroupId ? safeDetails : []
 })) as GroupCode[]
 })) as DomainCluster[];
 }, [clCodes, groups, details, selectedGroupId]);

 useEffect(() => {
 setFlattenedNodes(flattenCodeTree(initialClusters));
 }, [initialClusters]);

 const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
 const [selectedGroup, setSelectedGroup] = useState<GroupCode | null>(null);

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
 placeholderData: selectedCdId && selectedCdId === selectedGroupId ? details : undefined,
 });

 const detailList: CmmnDetailCode[] = detailRows ?? [];

 // D&D Handlers
 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
 useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 const handleDragStart = (event: DragStartEvent) => {
 setActiveId(event.active.id as string);
 };

 const handleDragEnd = (event: DragEndEvent) => {
 const { active, over } = event;
 
 if (over && active.id !== over.id) {
 setFlattenedNodes((items) => {
 const oldIndex = items.findIndex(n => n.id === active.id);
 const newIndex = items.findIndex(n => n.id === over.id);
 
 const newItems = arrayMove(items, oldIndex, newIndex);
 const activeItem = items[oldIndex];
 
 // If it's a group, ensure it has a parent cluster
 if (activeItem.type === 'group') {
 // Re-calculate projection to find parent
 const proj = getCodeProjection(newItems, active.id as string, over.id as string, 0, INDENTATION_WIDTH);
  if (proj?.parentId) {
  const idx = newItems.findIndex(n => n.id === active.id);
  newItems[idx] = { ...activeItem, parentId: proj.parentId };
  }
 }
 
 return newItems;
 });
 setHasExplorerChanges(true);
 toast('코드 도메인 구조가 재구성되었습니다.', 'info');
 }

 setActiveId(null);
 };

 const handleSaveExplorerChanges = async () => {
 setIsSaving(true);
 try {
 const res = await saveCmmnCodeHierarchyAction(flattenedNodes);
 if (res.success) {
 toast(res.message, 'success');
 setHasExplorerChanges(false);
 router.refresh();
 } else {
 toast(res.message, 'error');
 }
 } catch (err) {
 console.error(err);
 toast('계층 구조 저장 중 오류 발생', 'error');
 } finally {
 setIsSaving(false);
 }
 };

 /** 그룹 선택 — 상세 목록은 useQuery(queryKey=cdId)가 담당한다. */
 const selectGroup = (group: GroupCode) => {
 setSelectedGroup(group);
 };

 /**
  * CodePicker 1호 소비처 — 팝업에서 고른 코드의 그룹을 탐색기에서 그대로 선택한다.
  * (상세 목록은 기존 useQuery 경로가 이어받는다. 신규 조회 경로를 만들지 않는다.)
  */
 const handlePickCode = ({ group, code }: CodePickerSelection) => {
 const cluster = initialClusters.find(c => (c.groups || []).some(g => g?.cdId === group.cdId));
 const treeGroup = cluster ? (cluster.groups || []).find(g => g?.cdId === group.cdId) : null;
 if (cluster && treeGroup) {
 setSelectedClusterId(cluster.id);
 setSelectedGroup(treeGroup);
 }
 toast(`‘${code.dtlCdNm}’(${code.dtlCd}) — ${group.cdIdNm} 그룹이 선택되었습니다.`, 'success');
 };

 // Synchronize initial state from props
 useEffect(() => {
 if (selectedGroupId && (initialClusters || []).length > 0) {
 if (!selectedGroup || selectedGroup.cdId !== selectedGroupId) {
 const cluster = initialClusters.find(c => (c.groups || []).some(g => g?.cdId === selectedGroupId));
 if (cluster) {
 const group = (cluster.groups || []).find(g => g?.cdId === selectedGroupId);
 if (group) {
 setSelectedClusterId(cluster.id);
 setSelectedGroup(group);
 }
 }
 }
 }
 }, [selectedGroupId, initialClusters, selectedGroup]);

 // Filtered Nodes
 const visibleNodes = React.useMemo(() => {
 if (!searchQuery) return flattenedNodes;
 const lowerQuery = searchQuery.toLowerCase();
 
 // Find matching nodes and their parents
 const matches = new Set<string>();
 flattenedNodes.forEach(node => {
 if (node.name.toLowerCase().includes(lowerQuery) || node.id.toLowerCase().includes(lowerQuery)) {
 matches.add(node.id);
 if (node.parentId) matches.add(node.parentId);
 }
 });

 return flattenedNodes.filter(node => matches.has(node.id));
 }, [flattenedNodes, searchQuery]);

 const handleEditDetail = (detail: CmmnDetailCode) => {
 setEditingDetail(detail);
 setIsOpen(true);
 };

 /** [P1-9] 확인 본문에 대상 식별자(코드·명칭)를 노출해 오삭제를 막는다. */
 const handleDeleteDetail = async (detail: CmmnDetailCode) => {
 if (!selectedGroup) return;

 const ok = await confirm({
 title: '상세 코드 삭제',
 message: `‘${detail.dtlCdNm}’(코드 ${detail.dtlCd}) 를 ${selectedGroup.cdIdNm} 그룹에서 영구히 삭제합니다. 되돌릴 수 없습니다.`,
 variant: 'destructive',
 confirmText: '삭제'
 });

 if (ok) {
 try {
 const res = await deleteCodeDetail(null, { cdId: selectedGroup.cdId, dtlCd: detail.dtlCd });
 if (res.success) {
 toast(res.message, 'success');
 // 삭제 성공 후 우측 구성 명세 목록 실시간 리로드
 refetchDetails();
 } else {
 toast(res.message, 'error');
 }
 } catch {
 toast('네트워크 오류가 발생했습니다.', 'error');
 }
 }
 };

 const handleCreateDetail = () => {
 if (!selectedGroup) {
 toast('코드 명세를 등록할 그룹 코드를 먼저 선택하십시오.', 'info');
 return;
 }
 setEditingDetail(null);
 setIsOpen(true);
 };

 const onSubmit = async (values: any) => {
 try {
 const res = await saveCodeDetail(null, {
 ...values,
 useYn: values.useYn as 'Y' | 'N',
 cdId: selectedGroup?.cdId || '',
 isNew: !editingDetail
 });

 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 // 저장 성공 후 우측 구성 명세 목록 실시간 리로드
 refetchDetails();
 } else {
 toast(res.message, 'error');
 }
 } catch {
 toast('서버 통신 중 오류가 발생했습니다.', 'error');
 }
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
 <span className="text-[10px] font-bold text-muted-foreground line-clamp-1 uppercase tracking-tight">{item.dtlCdExpln || '등록된 설명 없음'}</span>
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
 accessor: (item: CmmnDetailCode) => (
 <div className="flex justify-end gap-1.5">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 aria-label={`${item.dtlCdNm} 코드 수정`}
 className="h-8 w-8 hover:bg-muted rounded-lg transition-colors"
 onClick={(e) => { e.preventDefault(); handleEditDetail(item); }}
 >
 <Settings size={14} className="text-muted-foreground" aria-hidden="true" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 aria-label={`${item.dtlCdNm} 코드 삭제`}
 className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
 onClick={(e) => { e.preventDefault(); handleDeleteDetail(item); }}
 >
 <Trash2 size={14} aria-hidden="true" />
 </Button>
 </div>
 )
 }
 ];

 const activeNode = activeId ? flattenedNodes.find(n => n.id === activeId) : null;

 return (
 <div className="space-y-[var(--page-pad)] animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex flex-col lg:flex-row gap-[var(--page-pad)] min-h-[700px]">
 {/* --- Left Sidebar: Code Tree --- */}
 <aside className="w-full lg:w-[380px] flex flex-col gap-[var(--form-gap)]">
 {/* 글래스(bg-white/40 backdrop-blur) 리터럴 → 시맨틱 표면 토큰(card/border) 회수 + 밀도 토큰 소비 */}
 <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden flex flex-col h-full">
 <div className="p-[var(--page-pad)] border-b border-border/50 bg-muted/30 space-y-[var(--form-gap)]">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg">
 <Database size={16} />
 </div>
 <h3 className="text-[10px] font-black tracking-widest text-foreground uppercase">
 Explorer
 </h3>
 </div>
 <div className="flex items-center gap-2">
 {hasExplorerChanges && (
 <button
 type="button"
 onClick={handleSaveExplorerChanges}
 disabled={isSaving}
 aria-label="변경한 코드 계층 구조 저장"
 className="px-3 py-1.5 rounded-lg bg-success text-success-foreground text-[10px] font-black uppercase tracking-widest hover:bg-success/90 transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 <Save size={12} aria-hidden="true" /> {isSaving ? '저장 중…' : 'Save'}
 </button>
 )}
 <button
 type="button"
 onClick={() => setIsPickerOpen(true)}
 aria-label="공통코드 검색 팝업 열기"
 className="px-2.5 py-1 rounded-lg bg-card text-muted-foreground hover:text-foreground hover:bg-muted text-[10px] font-black tracking-widest border border-border uppercase shadow-sm transition-colors"
 >
 코드 검색
 </button>
 <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground text-[10px] font-black tracking-widest border border-border uppercase shadow-sm">
 {clCodes.length} Domains
 </span>
 </div>
 </div>
 <div className="relative group">
 <Search size={16} aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
 {/* 이 검색은 이미 받아 둔 트리를 클라이언트에서 거르는 필터라 서버 요청이 없다 → 디바운스 대상 아님 */}
 <Input
 placeholder="분류·그룹명 또는 코드로 검색"
 aria-label="코드 분류·그룹 검색"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-12 pr-4 bg-muted border-none rounded-lg text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
 />
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-3 custom-scrollbar max-h-[600px]">
 {visibleNodes.length === 0 ? (
 <div className="py-20 text-center space-y-4">
 <div className="w-16 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground/40 border border-border shadow-inner">
 <SearchSlash size={32} aria-hidden="true" />
 </div>
 <p className="text-[10px] font-black tracking-widest text-muted-foreground">검색 결과가 없습니다</p>
 </div>
 ) : (
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
 onDragStart={handleDragStart}
 onDragEnd={handleDragEnd}
 >
 <SortableContext items={visibleNodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
 <div className="space-y-1">
 {visibleNodes.map((node) => (
 <SortableCodeNode
 key={node.id}
 node={node}
 isSelected={node.type === 'cluster' ? selectedClusterId === node.id : selectedGroup?.cdId === node.id}
 onClick={() => {
 if (node.type === 'cluster') {
 setSelectedClusterId(node.id);
 setSelectedGroup(null);
 } else {
 setSelectedClusterId(node.parentId);
 selectGroup(node.data);
 }
 }}
 />
 ))}
 </div>
 </SortableContext>

 {typeof document !== 'undefined' && createPortal(
 <DragOverlay dropAnimation={dropAnimation}>
 {activeId && activeNode ? (
 <SortableCodeNode
 node={activeNode}
 isSelected={false}
 onClick={() => {}}
 isOverlay
 />
 ) : null}
 </DragOverlay>,
 document.body
 )}
 </DndContext>
 )}
 </div>
 </div>
 </aside>

 {/* --- Right Content Area --- */}
 <main className="flex-1 space-y-[var(--form-gap)]">
 {selectedGroup ? (
 <div className="space-y-[var(--form-gap)]">
 {/* 마스터-디테일 헤더 밀집화 — 글래스 리터럴을 card/border 토큰으로, 여백은 밀도 토큰으로 회수 */}
 <div className="p-[var(--page-pad)] rounded-lg bg-card border border-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-[var(--form-gap)]">
 <div className="flex items-center gap-4">
 <div className="w-11 h-11 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-sm shrink-0">
 <Fingerprint size={20} />
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-3">
 <h2 className="text-lg font-black tracking-tighter text-foreground uppercase">
 {selectedGroup.cdIdNm}
 </h2>
 <div className="px-2.5 py-1 rounded-lg bg-muted border border-border text-[10px] font-black text-muted-foreground tracking-widest shadow-sm">
 {selectedGroup.cdId}
 </div>
 </div>
 <p className="text-xs font-bold text-muted-foreground ">
 {selectedGroup.cdIdExpln || '정의된 명세가 없습니다.'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Button onClick={handleCreateDetail} className="h-[var(--control-h)] px-5 rounded-lg font-black text-xs tracking-widest uppercase gap-2 active:scale-95">
 <Plus size={16} /> 신규 등록
 </Button>
 </div>
 </div>

 <div className={cn(
 "bg-card rounded-lg border border-border shadow-sm overflow-hidden transition-all",
 detailsLoading ? "opacity-30 pointer-events-none scale-[0.99] grayscale" : "opacity-100"
 )}>
 <div className="p-[var(--page-pad)] border-b border-border/50 flex items-center justify-between bg-muted/30">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-primary shadow-sm">
 {detailsLoading ? <RefreshCcw size={16} className="animate-spin" /> : <Layers size={16} />}
 </div>
 <div className="text-left">
 <h3 className="text-xs font-black tracking-widest text-foreground uppercase leading-none mb-1.5">구성 명세</h3>
 <p className="text-[10px] font-bold text-muted-foreground leading-none">
 {detailsLoading ? '불러오는 중…' : `총 ${detailList.length}건`}
 </p>
 </div>
 </div>
 {/*
   * [P1-5] 'Integrity 99.9%' 지표 삭제 — 무결성을 측정하는 소스가 없는 고정 문구였다.
   * 대신 실측 가능한 사용/미사용 건수를 노출한다.
   */}
 <div className="flex flex-col items-end pr-4 text-right">
 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1.5">사용 / 미사용</span>
 <span className="text-[10px] font-black text-foreground tracking-widest tabular-nums">
 {detailList.filter(d => d.useYn === 'Y').length} / {detailList.filter(d => d.useYn !== 'Y').length}
 </span>
 </div>
 </div>
 <div className="p-2">
 <StandardDataTable<CmmnDetailCode>
 columns={columns}
 data={detailList}
 loading={detailsLoading && detailList.length === 0}
 error={detailsError}
 onRetry={() => refetchDetails()}
 keyField="dtlCd"
 emptyMessage="데이터가 존재하지 않습니다."
 className="border-none shadow-none bg-transparent"
 isPremium={true}
 />
 </div>
 </div>
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-[var(--filter-pad)] rounded-lg bg-card border border-border shadow-sm min-h-[500px]">
 <div className="w-24 h-20 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground/40 mb-8 shadow-xl group hover:rotate-6 transition-transform">
 <Database size={40} className="opacity-20 group-hover:opacity-100 transition-opacity" />
 </div>
 <h3 className="text-xl font-black tracking-widest text-muted-foreground/60 mb-4">선택된 코드 없음</h3>
 <p className="text-xs font-black text-muted-foreground/70 text-center max-w-sm leading-relaxed mb-10">
 좌측 탐색기에서 분류 또는 코드 그룹을 선택하면<br />상세 코드를 관리할 수 있습니다.
 </p>
 <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
 <div className="p-[var(--page-pad)] rounded-lg bg-muted border border-border flex flex-col gap-2 items-start shadow-sm">
 <span className="text-[10px] font-black text-muted-foreground tracking-widest">코드 분류</span>
 <span className="text-2xl font-black text-foreground ">{initialClusters.length}</span>
 </div>
 <div className="p-[var(--page-pad)] rounded-lg bg-muted border border-border flex flex-col gap-2 items-start shadow-sm">
 <span className="text-[10px] font-black text-muted-foreground tracking-widest">코드 그룹</span>
 <span className="text-2xl font-black text-foreground ">{groups.length}</span>
 </div>
 </div>
 </div>
 )}
 </main>
 </div>

 {/* CodePicker — 그룹→코드 2단 검색 팝업 (1호 소비처) */}
 <CodePicker
 isOpen={isPickerOpen}
 onClose={() => setIsPickerOpen(false)}
 onSelect={handlePickCode}
 />

 {/* Standard Modal for CRUD */}
 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={editingDetail ? '아키텍처 명세 수정' : '신규 명세 등록'}
 maxWidth="3xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2 border-border shadow-sm">취소</Button>
 <Button
 onClick={form.handleSubmit(onSubmit)}
 disabled={form.formState.isSubmitting}
 className="flex-[2] h-11 rounded-lg bg-primary border-none text-white font-bold text-xs tracking-widest shadow-2xl hover:brightness-110 transition-all hover:-translate-y-1 group"
 >
 <Plus size={18} className="group-hover:rotate-90 transition-transform" /> 저장
 </Button>
 </div>
 }
 >
 <Form {...form}>
 <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10 pt-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <div className="space-y-8">
 {/* [P2] 폼 컨트롤이 아닌 읽기 전용 표시라 <label> 이 아닌 <span> + aria-describedby 로 연결한다. */}
 <div className="space-y-1.5 p-0.5">
 <span id="cmmn-parent-group-label" className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 상위 그룹 식별자
 </span>
 <div
 aria-labelledby="cmmn-parent-group-label"
 className="h-11 flex items-center px-6 rounded-lg bg-muted border-none font-mono text-xs font-bold shadow-inner text-muted-foreground"
 >
 {selectedGroup?.cdId}
 </div>
 </div>

 <ShadcnFormField
 control={form.control}
 name="dtlCd"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 코드 식별자 (Unique ID) <span className="text-rose-500 font-bold text-xs">*</span>
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
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="dtlCdNm"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 표기 레이블 (Label) <span className="text-rose-500 font-bold text-xs">*</span>
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 maxLength={100}
 className="h-11 rounded-lg text-sm font-bold tracking-tight shadow-inner border-none bg-muted focus:bg-card transition-all text-left"
 placeholder="레이블 명칭 입력 (최대 100자)"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
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
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 활성 상태 프로토콜
 </FormLabel>
 <Select
 onValueChange={field.onChange}
 defaultValue={field.value}
 value={field.value}
 >
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-muted font-bold text-xs tracking-widest uppercase shadow-inner">
 <SelectValue />
 </SelectTrigger>
 </FormControl>
 <SelectContent className="rounded-lg shadow-xl z-[9999]">
 <SelectItem value="Y" className="h-12 rounded-lg text-xs font-bold tracking-widest uppercase text-emerald-500">
 --- 사용 중 (ACTIVE) ---
 </SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold tracking-widest uppercase text-rose-500">
 --- 미사용 (INACTIVE) ---
 </SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="dtlCdExpln"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-foreground flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 메타데이터 컨텍스트 설명
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 maxLength={4000}
 className="w-full min-h-[160px] p-6 rounded-lg border-none bg-muted text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none shadow-inner text-left"
 placeholder="코드 사용처 및 시스템 제약 조건 설명... (최대 4000자)"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
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

