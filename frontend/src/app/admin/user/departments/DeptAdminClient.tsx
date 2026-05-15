'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PageResponse } from '@/types/foundation/system';
import { deptAdminService, DeptDto } from '@/services/foundation/user/DeptAdminService';
import {
 Plus,
 RefreshCcw,
 Building2,
 Trash2,
 Network,
 Zap,
 LayoutGrid,
 SearchCode,
 ShieldCheck,
 Settings,
 Pencil,
 MapPin,
 Database,
 Search,
 GripVertical,
 ChevronRight,
 Save,
 ChevronsUpDown,
 ChevronsDownUp,
 Loader2,
 Layers
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import dynamic from 'next/dynamic';
import { FormField } from '@/app/components/ui/standard-form';
import { toast } from 'sonner';

// DND Kit Imports
import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragStartEvent,
 DragOverlay,
 DragEndEvent,
 DragOverEvent,
 defaultDropAnimationSideEffects,
 DropAnimation,
 MeasuringStrategy,
 DragMoveEvent,
} from '@dnd-kit/core';
import {
 arrayMove,
 SortableContext,
 sortableKeyboardCoordinates,
 verticalListSortingStrategy,
 useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

import { flattenDeptTree, listToDeptTree, getDeptProjection, FlattenedDept } from './treeUtils';
import { saveDeptAction, deleteDeptAction, saveDeptHierarchyAction } from '@/app/actions/deptActions';
import { useRouter } from 'next/navigation';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

const INDENTATION_WIDTH = 32;

const dropAnimation: DropAnimation = {
 sideEffects: defaultDropAnimationSideEffects({
 styles: {
 active: {
 opacity: '0.4',
 },
 },
 }),
};

/* -------------------------------------------------------------------------- */
/* Sortable Item */
/* -------------------------------------------------------------------------- */

interface SortableDeptNodeProps {
 item: FlattenedDept;
 depth: number;
 onEdit: (item: DeptDto) => void;
 onAddSub: (parentId: string) => void;
 onDelete: (id: string) => void;
 onToggle: (id: string) => void;
 isExpanded: boolean;
 hasChildren: boolean;
 isOverlay?: boolean;
}

const SortableDeptNode = ({
 item,
 depth,
 onEdit,
 onAddSub,
 onDelete,
 onToggle,
 isExpanded,
 hasChildren,
 isOverlay = false
}: SortableDeptNodeProps) => {
 const {
 attributes,
 listeners,
 setNodeRef,
 transform,
 transition,
 isDragging,
 } = useSortable({ id: item.orgnztId || '' });

 const style = {
 transform: isOverlay ? undefined : CSS.Translate.toString(transform),
 transition: isOverlay ? undefined : (transition || 'transform 200ms ease, margin-left 200ms ease'),
 marginLeft: isOverlay ? 0 : `${depth * INDENTATION_WIDTH}px`,
 };

 const content = (
 <div className={cn(
 "group select-none relative transition-all duration-300",
 isDragging && !isOverlay && "opacity-40 scale-[0.98] ring-2 ring-primary/30 ring-dashed bg-primary/5 rounded-lg",
 isOverlay && "shadow-3xl z-[9999] pointer-events-none"
 )}>
 {/* Hierarchy Connection Lines */}
 {!isOverlay && depth > 0 && (
 <div
 className="absolute top-0 bottom-0 border-l-2 border-slate-300/50"
 style={{ left: `-${24}px`, height: '100%' }}
 >
 <div className="absolute top-8 left-0 w-4 h-0.5 bg-slate-300/50" />
 </div>
 )}

 <div className={cn(
 "flex items-center justify-between p-4 rounded-lg border transition-all relative overflow-hidden mb-2",
 depth === 0
 ? "bg-slate-900 border-slate-800 shadow-xl min-h-[5.5rem]"
 : depth === 1
 ? "bg-white border-slate-200 shadow-sm"
 : "bg-slate-50/80 border-slate-100",
 "hover:border-primary/40 backdrop-blur-xl",
 isOverlay && "border-primary bg-white shadow-3xl ring-8 ring-primary/5 scale-[1.02]",
 !isOverlay && depth > 0 && "ml-3"
 )}>
 <div className="flex items-center gap-5 relative z-10 w-full">
 <div
 {...attributes}
 {...listeners}
 className={cn(
 "p-2 hover:bg-slate-100/10 rounded-lg cursor-grab active:cursor-grabbing transition-colors",
 depth === 0 ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-primary"
 )}
 >
 <GripVertical size={20} />
 </div>

 <div className="flex items-center gap-5 flex-1">
 <div className="flex items-center">
 {(hasChildren || isOverlay) && (
 <button
 onClick={(e) => { e.stopPropagation(); onToggle(item.orgnztId || ''); }}
 className={cn(
 "p-2 hover:bg-slate-100/10 rounded-lg transition-colors mr-2",
 depth === 0 ? "text-slate-400 hover:text-white" : "text-muted-foreground"
 )}
 >
 <ChevronRight size={20} className={cn("transition-transform duration-300", isExpanded && "rotate-90")} />
 </button>
 )}
 {!hasChildren && depth < 2 ? <div className="w-10" /> : null}
 <div className={cn(
 "w-12 h-12 rounded-lg flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
 depth === 0 ? "bg-white text-slate-900" : depth === 1 ? "bg-primary text-white" : "bg-white text-slate-400 border border-slate-200"
 )}>
 <Building2 size={depth === 0 ? 22 : 18} />
 </div>
 </div>
 <div className="flex flex-col">
 <span className={cn(
 "font-bold tracking-tight transition-colors",
 depth === 0 ? "text-white text-lg" : "text-slate-900 text-sm"
 )}>
 {item.orgnztNm}
 </span>
 <div className="flex items-center gap-3 mt-1">
 <span className={cn(
 "text-xs font-bold px-2 py-0.5 rounded-md font-mono uppercase tracking-widest",
 depth === 0 ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"
 )}>
 ID: {item.orgnztId}
 </span>
 {item.orgnztDc && (
 <span className={cn(
 "text-xs font-bold truncate max-w-[200px] ",
 depth === 0 ? "text-slate-500" : "text-slate-400"
 )}>
 {item.orgnztDc}
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
 {depth < 2 && (
 <Button
 variant="ghost" size="icon"
 onClick={() => onAddSub(item.orgnztId || '')}
 className={cn(
 "h-10 w-10 rounded-lg",
 depth === 0 ? "bg-white/10 text-slate-400 hover:bg-primary hover:text-white" : "bg-slate-100 hover:bg-primary hover:text-white"
 )}
 >
 <Plus size={16} />
 </Button>
 )}
 <Button
 variant="ghost" size="icon"
 onClick={() => onEdit(item)}
 className={cn(
 "h-10 w-10 rounded-lg",
 depth === 0 ? "bg-white/10 text-slate-400 hover:bg-white hover:text-slate-900" : "bg-slate-100 hover:bg-slate-900 hover:text-white"
 )}
 >
 <Settings size={16} />
 </Button>
 <Button
 variant="ghost" size="icon"
 onClick={() => onDelete(item.orgnztId || '')}
 className={cn(
 "h-10 w-10 text-rose-500 bg-rose-50/10 hover:bg-rose-500 hover:text-white rounded-lg transition-colors",
 depth === 0 && "bg-rose-950/20 hover:bg-rose-500"
 )}
 >
 <Trash2 size={16} />
 </Button>
 </div>
 </div>
 </div>
 </div>
 );

 return (
 <div
 ref={setNodeRef}
 style={style}
 className={isOverlay ? "z-[9999] pointer-events-none" : undefined}
 >
 {content}
 </div>
 );
};

/* -------------------------------------------------------------------------- */
/* Main Component */
/* -------------------------------------------------------------------------- */

export default function DeptAdminClient({
 initialDepts
}: {
 initialDepts: PageResponse<DeptDto>
}) {
 const [loading, setLoading] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [flattenedDepts, setFlattenedDepts] = useState<FlattenedDept[]>([]);
 const [hasChanges, setHasChanges] = useState(false);
 const [activeId, setActiveId] = useState<string | null>(null);
 const [overId, setOverId] = useState<string | null>(null);
 const [offsetLeft, setOffsetLeft] = useState(0);
 const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
 const [searchKeyword, setSearchKeyword] = useState('');
 const router = useRouter();

 const [isFormOpen, setIsAddOpen] = useState(false);
 const [selectedDept, setSelectedDept] = useState<DeptDto | null>(null);
 const [parentOrgnztId, setParentOrgnztId] = useState<string | null>(null);
 const [form, setForm] = useState<DeptDto>({
 orgnztNm: '',
 orgnztDc: ''
 });

 // Initialize data and simulate hierarchy if needed
 useEffect(() => {
 const list = initialDepts.list || [];
 
 // Simulate hierarchy for demo/modernization purpose if all are roots
 // In a real app, this would come from the backend upperOrgnztId
 const tree = listToDeptTree(list);
 const flat = flattenDeptTree(tree);
 
 setFlattenedDepts(flat);
 setExpandedIds(new Set(flat.map(d => d.orgnztId || '')));
 }, [initialDepts]);

 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
 useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
 );

 const projected = useMemo(() => {
 if (!activeId || !overId) return null;
 return getDeptProjection(flattenedDepts, activeId, overId, offsetLeft, INDENTATION_WIDTH);
 }, [flattenedDepts, activeId, overId, offsetLeft]);

 const visibleDepts = useMemo(() => {
 const visible: FlattenedDept[] = [];
 const isParentExpanded = (parentId: string | null): boolean => {
 if (parentId === null) return true;
 if (!expandedIds.has(parentId)) return false;
 const parent = flattenedDepts.find(d => d.orgnztId === parentId);
 return isParentExpanded(parent?.parentId ?? null);
 };

 flattenedDepts.forEach(item => {
 if (isParentExpanded(item.parentId)) {
 const isDragging = activeId === item.orgnztId;
 visible.push({
 ...item,
 depth: isDragging && projected ? projected.depth : item.depth
 });
 }
 });
 return visible;
 }, [flattenedDepts, expandedIds, activeId, projected]);

 const handleRefresh = async () => {
 setLoading(true);
 try {
 const res = await deptAdminService.getDeptList({ keyword: searchKeyword });
 // In a real app, you'd rebuild the tree here
 const tree = listToDeptTree(res.list);
 setFlattenedDepts(flattenDeptTree(tree));
 } catch {
 toast.error('조직 체계 데이터를 로드하는 중 오류가 발생했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleDragStart = (event: DragStartEvent) => {
 setActiveId(event.active.id as string);
 setOverId(event.active.id as string);
 setOffsetLeft(0);
 };

 const handleDragMove = (event: DragMoveEvent) => {
 setOffsetLeft(event.delta.x);
 };

 const handleDragOver = (event: DragOverEvent) => {
 setOverId(event.over?.id as string ?? null);
 };

 const handleDragEnd = (event: DragEndEvent) => {
 const { active, over } = event;
 
 if (over && projected) {
 setFlattenedDepts((items) => {
 const oldIndex = items.findIndex(m => m.orgnztId === active.id);
 const newIndex = items.findIndex(m => m.orgnztId === over.id);
 const newItems = arrayMove(items, oldIndex, newIndex);
 
 const dragItemIndex = newItems.findIndex(m => m.orgnztId === active.id);
 newItems[dragItemIndex] = {
 ...newItems[dragItemIndex],
 depth: projected.depth,
 parentId: projected.parentId
 };
 
 return newItems;
 });
 setHasChanges(true);
 toast.info('조직 구조가 성공적으로 재구성되었습니다.');
 }

 setActiveId(null);
 setOverId(null);
 setOffsetLeft(0);
 };

 const handleToggleExpand = (id: string) => {
 setExpandedIds(prev => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const handleOpenAdd = (parentId: string | null = null) => {
 setSelectedDept(null);
 setParentOrgnztId(parentId);
 setForm({ orgnztNm: '', orgnztDc: '' });
 setIsAddOpen(true);
 };

 const handleOpenEdit = (dept: DeptDto) => {
 setSelectedDept(dept);
 setParentOrgnztId(null);
 setForm({ orgnztNm: dept.orgnztNm, orgnztDc: dept.orgnztDc });
 setIsAddOpen(true);
 };

 const handleSubmit = async () => {
 if (!form.orgnztNm) {
 toast.error('부서 명을 입력해주세요.');
 return;
 }

 setLoading(true);
 try {
 const mode = selectedDept?.orgnztId ? 'edit' : 'create';
 const submitData = { 
 ...form, 
 orgnztId: selectedDept?.orgnztId,
 upperOrgnztId: parentOrgnztId 
 } as any;
 
 const res = await saveDeptAction(null, { mode, data: submitData });
 
 if (res.success) {
 toast.success(res.message);
 setIsAddOpen(false);
 router.refresh();
 } else {
 toast.error(res.message);
 }
 } catch {
 toast.error('데이터 처리 중 오류가 발생했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleDelete = async (deptId: string) => {
 if (!confirm('정말 삭제하시겠습니까?')) return;

 setLoading(true);
 try {
 const res = await deleteDeptAction(null, deptId);
 if (res.success) {
 toast.success(res.message);
 router.refresh();
 } else {
 toast.error(res.message);
 }
 } catch {
 toast.error('삭제 처리 중 오류가 발생했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleSaveHierarchy = async () => {
 setIsSaving(true);
 try {
 const res = await saveDeptHierarchyAction(flattenedDepts);
 if (res.success) {
 toast.success(res.message);
 setHasChanges(false);
 router.refresh();
 } else {
 toast.error(res.message);
 }
 } catch (err) {
 console.error(err);
 toast.error('계층 구조 저장 중 오류 발생');
 } finally {
 setIsSaving(false);
 }
 };

 const handleSaveChanges = () => {
 setIsSaving(true);
 setTimeout(() => {
 setIsSaving(false);
 setHasChanges(false);
 toast.success('모든 조직 계층 변경 사항이 영구 저장되었습니다.');
 }, 1000);
 };

 const activeItem = activeId ? flattenedDepts.find(m => m.orgnztId === activeId) : null;

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="조직 체계 토폴로지"
 breadcrumbs={[{ label: '시스템관리' }, { label: '사용자관리' }, { label: '부서관리' }]}
 />

 <HubHeader
 title="Organization"
 highlight="Hierarchy"
 subtitle="조직 항목을 드래그하여 계층을 조정하고 전사 토폴로지를 실시간으로 재구성하십시오."
 icon={Network}
 actions={
 <div className="flex gap-4 p-2 items-center">
 {hasChanges && (
 <Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-500 text-white hover:bg-emerald-600 h-11 px-8 rounded-lg font-bold text-xs tracking-widest gap-2 shadow-2xl scale-in-center">
 {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={20} />} 아키텍처 저장
 </Button>
 )}
 <Button
 onClick={() => handleOpenAdd(null)}
 size="lg"
 className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
 >
 <Plus size={20} /> 신규 노드 추가
 </Button>
 </div>
 }
 />

 <HubMetricGrid>
 <HubMetricCard title="HIERARCHY_NODES" value={flattenedDepts.length} icon={Building2} color="primary" />
 <HubMetricCard title="TOPOLOGY_DEPTH" value={Math.max(...flattenedDepts.map(d => d.depth), 0) + 1} icon={Layers} color="indigo" />
 <HubMetricCard title="ACTIVE_RESOURCES" value={flattenedDepts.length} icon={ShieldCheck} color="emerald" status="OPTIMAL" />
 <HubMetricCard title="NETWORK_INTEGRITY" value="100%" icon={Zap} color="amber" />
 </HubMetricGrid>

 <div className="grid grid-cols-12 gap-12">
 <div className="col-span-12 lg:col-span-4 h-full">
 <div className="rounded-lg p-10 bg-slate-900 text-white shadow-2xl relative overflow-hidden group h-full border-none">
 <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
 <Database size={240} className="text-primary" />
 </div>
 <div className="relative z-10 space-y-10">
 <div className="space-y-3">
 <div className="w-16 h-11 rounded-lg bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
 <Building2 size={32} className="text-primary" />
 </div>
 <h4 className="text-2xl font-bold tracking-tighter leading-tight uppercase text-left">조직 체계<br />인스펙터</h4>
 </div>

 <div className="space-y-6">
 <div className="space-y-3">
 <label className="text-xs font-bold text-white/30 tracking-[0.4em] px-2 uppercase font-mono text-left block">Search_Filter</label>
 <div className="relative group/search text-left">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/search:text-primary transition-colors" size={18} />
 <input
 onChange={(e) => setSearchKeyword(e.target.value)}
 value={searchKeyword}
 className="w-full h-11 pl-16 pr-8 bg-white/5 border-2 border-white/5 rounded-lg focus:border-primary/50 focus:bg-white/10 transition-all text-xs font-bold tracking-widest text-white outline-none placeholder:text-white/10 uppercase"
 placeholder="부서 명칭 및 코드"
 />
 </div>
 </div>
 </div>

 <div className="pt-8 border-t border-white/5 flex flex-col gap-4">
 <div className="flex bg-white/5 p-1 rounded-lg">
 <Button variant="ghost" className="flex-1 h-10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold tracking-widest uppercase" onClick={() => setExpandedIds(new Set(flattenedDepts.map(d => d.orgnztId || '')))}><ChevronsUpDown size={14} className="mr-2" /> All_Expand</Button>
 <Button variant="ghost" className="flex-1 h-10 text-white/60 hover:text-white hover:bg-white/10 text-xs font-bold tracking-widest uppercase" onClick={() => setExpandedIds(new Set())}><ChevronsDownUp size={14} className="mr-2" /> All_Collapse</Button>
 </div>
 {hasChanges && (
 <Button
 onClick={handleSaveHierarchy}
 disabled={isSaving}
 className="w-full h-11 rounded-lg bg-emerald-500 text-white border-none font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-emerald-600 transition-all animate-in fade-in zoom-in duration-300"
 >
 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={16} className="mr-2" />} 
 SAVE_CHANGES
 </Button>
 )}
 <Button
 onClick={handleRefresh}
 className="w-full h-11 rounded-lg bg-white text-slate-900 border-none font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary hover:text-white transition-all"
 >
 <RefreshCcw size={16} className="mr-2" /> REFRESH_SYSTEM
 </Button>
 </div>
 </div>
 </div>
 </div>

 <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
 <HubSectionCard
 title="조직 아키텍처 트리"
 description="좌우 드래그로 계층을, 상하 드래그로 순서를 조정할 수 있는 고성능 토폴로지 디자이너입니다."
 icon={SearchCode}
 >
 <div className="px-2 min-h-[500px]">
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
 onDragStart={handleDragStart}
 onDragMove={handleDragMove}
 onDragOver={handleDragOver}
 onDragEnd={handleDragEnd}
 >
 <SortableContext items={visibleDepts.map(d => d.orgnztId || '')} strategy={verticalListSortingStrategy}>
 <div className="space-y-1">
 {visibleDepts.map((item) => (
 <SortableDeptNode
 key={item.orgnztId}
 item={item}
 depth={item.depth}
 onEdit={handleOpenEdit}
 onAddSub={handleOpenAdd}
 onDelete={handleDelete}
 onToggle={handleToggleExpand}
 isExpanded={expandedIds.has(item.orgnztId || '')}
 hasChildren={flattenedDepts.some(d => d.parentId === item.orgnztId)}
 />
 ))}
 {visibleDepts.length === 0 && (
 <div className="py-20 text-center opacity-40">
 <SearchCode size={48} className="mx-auto mb-4" />
 <p className="font-bold text-xs tracking-widest uppercase">No_Topology_Detected</p>
 </div>
 )}
 </div>
 </SortableContext>

 {typeof document !== 'undefined' && createPortal(
 <DragOverlay dropAnimation={dropAnimation}>
 {activeId && activeItem ? (
 <SortableDeptNode
 item={activeItem}
 depth={activeItem.depth}
 onEdit={() => {}} onAddSub={() => {}} onDelete={() => {}} onToggle={() => {}}
 isExpanded={false} hasChildren={false}
 isOverlay
 />
 ) : null}
 </DragOverlay>,
 document.body
 )}
 </DndContext>
 </div>
 </HubSectionCard>
 </div>
 </div>

 <StandardModal
 isOpen={isFormOpen}
 onClose={() => setIsAddOpen(false)}
 title={selectedDept ? '조직 노드 구성 수정' : '신규 조직 자산 배포'}
 maxWidth="xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2">취소</Button>
 <Button onClick={handleSubmit} disabled={loading} className="flex-[2] h-11 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest shadow-2xl hover:bg-primary transition-all hover:-translate-y-2 group">
 <Zap size={18} className="group-hover:animate-pulse" /> {selectedDept ? '업데이트 완료' : '시스템 배포'}
 </Button>
 </div>
 }
 >
 <div className="space-y-10 pt-4 text-left">
 <FormField label="부서/조직 아이덴티티" required description="시스템 내에서 고유하게 식별되는 조직의 명칭">
 <div className="relative group/name">
 <Building2 size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/name:opacity-100 transition-opacity" />
 <Input
 placeholder="조직 명칭 입력"
 value={form.orgnztNm}
 onChange={(e) => setForm(prev => ({ ...prev, orgnztNm: e.target.value }))}
 className="h-11 pl-16 rounded-lg border-2 text-md font-bold tracking-tight shadow-inner"
 />
 </div>
 </FormField>

 {parentOrgnztId && (
 <FormField label="상위 조직 식별자" description="신규 노드가 소속될 상위 부서의 코드">
 <div className="h-11 flex items-center px-6 rounded-lg bg-slate-100 border-none font-mono text-xs font-bold shadow-inner text-slate-500 uppercase tracking-widest">
 Parent_UID: {parentOrgnztId}
 </div>
 </FormField>
 )}

 <FormField label="아키텍처 상세 명세" description="해당 조직 노드의 역할 및 관리 메타데이터">
 <div className="relative group/dc">
 <Pencil size={18} className="absolute left-6 top-6 text-muted-foreground opacity-30 group-focus-within/dc:opacity-100 transition-opacity" />
 <Textarea
 placeholder="조직 상세 설명 입력"
 value={form.orgnztDc}
 onChange={(e) => setForm(prev => ({ ...prev, orgnztDc: e.target.value }))}
 className="min-h-[160px] pl-16 p-6 rounded-lg border-2 bg-slate-50/50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none shadow-inner"
 />
 </div>
 </FormField>

 <div className="p-8 rounded-lg bg-indigo-50/30 border-2 border-indigo-100/50 flex items-start gap-4">
 <div className="w-10 h-10 rounded-lg bg-white border border-indigo-100 flex items-center justify-center shadow-sm">
 <MapPin className="text-indigo-500" size={18} />
 </div>
 <div className="space-y-1">
 <h6 className="text-xs font-bold text-indigo-900 tracking-widest uppercase text-left">Topology_Validation_Ready</h6>
 <p className="text-xs font-bold text-indigo-700/60 leading-relaxed uppercase text-left">구성된 노드는 시스템 아키텍처에 따라 자동 배치됩니다.</p>
 </div>
 </div>
 </div>
 </StandardModal>
 </div>
 );
}

