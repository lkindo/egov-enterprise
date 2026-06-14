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
 dtlCd: z.string().min(1, '코드 식별자는 필수입니다.').max(12, '상세코드는 12자 이하로 입력해주세요.'),
 dtlCdNm: z.string().min(1, '표기 레이블은 필수입니다.').max(100, '상세코드명은 100자 이하로 입력해주세요.'),
 useYn: z.enum(['Y', 'N']).default('Y'),
 dtlCdExpln: z.string().max(4000, '상세코드 설명은 4000자 이하로 입력해주세요.').optional()
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
 <div className="absolute left-[11px] top-[-10px] bottom-1/2 w-px bg-slate-200" />
 )}
 {!isCluster && !isOverlay && (
 <div className="absolute left-[11px] top-1/2 w-3 h-px bg-slate-200" />
 )}

 <button
 type="button"
 {...attributes}
 {...listeners}
 onClick={onClick}
 className={cn(
 "w-full flex items-center justify-between p-3 rounded-lg transition-all relative overflow-hidden",
 isCluster 
 ? "bg-slate-50/50 hover:bg-slate-100/50 border border-transparent" 
 : "hover:bg-slate-50 border border-transparent",
 isSelected && isCluster && "bg-slate-900 text-white shadow-xl border-slate-800",
 isSelected && !isCluster && "bg-primary text-white shadow-lg shadow-primary/20 border-primary/20",
 isOverlay && "bg-white shadow-2xl border-primary ring-4 ring-primary/5 scale-105"
 )}
 >
 <div className="flex items-center gap-3 truncate relative z-10 w-full">
 <div className={cn(
 "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
 isCluster 
 ? (isSelected ? "bg-primary/20 text-primary" : "bg-white text-slate-400 border border-slate-100 shadow-sm")
 : (isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:text-primary")
 )}>
 {isCluster ? <Layers size={14} /> : <Tag size={14} />}
 </div>
 <div className="flex flex-col truncate items-start">
 <span className={cn(
 "text-xs font-bold truncate leading-tight uppercase tracking-tight",
 isSelected ? "text-white" : "text-slate-900"
 )}>
 {node.name}
 </span>
 <span className={cn(
 "text-xs font-mono font-bold tracking-tighter opacity-60",
 isSelected ? "text-white" : "text-slate-500"
 )}>
 {node.id}
 </span>
 </div>
 {isSelected && (
 <div className="ml-auto">
 <div className={cn(
 "w-1.5 h-1.5 rounded-lg",
 isCluster ? "bg-primary animate-pulse" : "bg-white animate-pulse"
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
 const [detailsLoading, setDetailsLoading] = useState(false);

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
 if (proj) {
 const idx = newItems.findIndex(n => n.id === active.id);
 newItems[idx] = { ...newItems[idx], parentId: proj.parentId };
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

 // Fetch Details on the client side to avoid full page reloads
 const loadGroupDetails = async (group: GroupCode) => {
 try {
 setDetailsLoading(true);

 // 1. Fetch details from API with robust filtering parameters
 const res = await codeAdminService.getDetailCodeList({
 cdId: group.cdId,
 searchKeyword: group.cdId,
 searchCondition: '1',
 pageUnit: 999
 });

 // Failsafe: Filter details on client side just in case backend returns all items
 const fetchedDetails = (res.list || []).filter(item =>
 item && (item as CmmnDetailCode).cdId === group.cdId
 );

 // 2. Update state directly
 setSelectedGroup({
 ...group,
 details: fetchedDetails as CmmnDetailCode[]
 });
 } catch (error) {
 toast('상세 코드를 불러오는 중 오류가 발생했습니다.', 'error');
 } finally {
 setDetailsLoading(false);
 }
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
 setSelectedGroup({ ...group, details: (details || []) as CmmnDetailCode[] });
 }
 }
 }
 }
 }, [selectedGroupId, details, initialClusters, selectedGroup]);

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

 const handleDeleteDetail = async (dtlCd: string) => {
 if (!selectedGroup) return;

 const ok = await confirm({
 title: '상세 코드 명세 삭제',
 message: '해당 코드 정보를 데이터베이스에서 영구히 삭제하시겠습니까?',
 variant: 'destructive',
 confirmText: '삭제'
 });

 if (ok) {
 try {
 const res = await deleteCodeDetail(null, { cdId: selectedGroup.cdId, dtlCd });
 if (res.success) {
 toast(res.message, 'success');
 // 삭제 성공 후 우측 구성 명세 목록 실시간 리로드
 loadGroupDetails(selectedGroup);
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
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
 if (selectedGroup) {
   loadGroupDetails(selectedGroup);
 }
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
 toast('서버 통신 중 오류가 발생했습니다.', 'error');
 }
 };

 const columns: Column<CmmnDetailCode>[] = [
 {
 header: '코드',
 accessor: (item: CmmnDetailCode) => <span className="font-black text-slate-700 tracking-tight text-xs">{item.dtlCd}</span>,
 className: 'w-24 py-4'
 },
 {
 header: '코드 명칭',
 accessor: (item: CmmnDetailCode) => (
 <div className="flex flex-col gap-0.5">
 <span className="font-black text-slate-900 tracking-tighter text-sm">{item.dtlCdNm}</span>
 <span className="text-[10px] font-bold text-slate-400 line-clamp-1 uppercase tracking-tight">{item.dtlCdExpln || 'No description available'}</span>
 </div>
 ),
 className: 'py-4'
 },
 {
 header: '상태',
 accessor: (item: CmmnDetailCode) => <HubStatusBadge status={item.useYn === 'Y' ? '사용 중' : '미사용'} />,
 className: 'w-32 py-4'
 },
 {
 header: '관리',
 className: 'text-right w-24 py-4',
 accessor: (item: CmmnDetailCode) => (
 <div className="flex justify-end gap-1.5">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="h-8 w-8 hover:bg-slate-100 rounded-lg transition-colors"
 onClick={(e) => { e.preventDefault(); handleEditDetail(item); }}
 >
 <Settings size={14} className="text-slate-400" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
 onClick={(e) => { e.preventDefault(); handleDeleteDetail(item.dtlCd); }}
 >
 <Trash2 size={14} />
 </Button>
 </div>
 )
 }
 ];

 const activeNode = activeId ? flattenedNodes.find(n => n.id === activeId) : null;

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex flex-col lg:flex-row gap-8 min-h-[700px]">
 {/* --- Left Sidebar: Code Tree --- */}
 <aside className="w-full lg:w-[380px] flex flex-col gap-6">
 <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl overflow-hidden flex flex-col h-full ring-1 ring-black/5">
 <div className="p-6 border-b border-slate-100/50 bg-slate-50/30 space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
 <Database size={16} />
 </div>
 <h3 className="text-[10px] font-black tracking-widest text-slate-900 uppercase">
 Explorer
 </h3>
 </div>
 <div className="flex items-center gap-2">
 {hasExplorerChanges && (
 <button 
 onClick={handleSaveExplorerChanges}
 className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
 >
 <Save size={12} /> Save
 </button>
 )}
 <span className="px-2.5 py-1 rounded-lg bg-white/60 text-slate-500 text-[10px] font-black tracking-widest border border-white/80 uppercase shadow-sm">
 {clCodes.length} Domains
 </span>
 </div>
 </div>
 <div className="relative group">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" />
 <Input
 placeholder="검색어를 입력하세요..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-10 pl-12 pr-6 bg-white/50 border-none rounded-xl text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300"
 />
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-3 custom-scrollbar max-h-[600px]">
 {visibleNodes.length === 0 ? (
 <div className="py-20 text-center space-y-4">
 <div className="w-16 h-10 rounded-xl bg-slate-50 flex items-center justify-center mx-auto text-slate-200 border border-slate-100 shadow-inner">
 <SearchSlash size={32} />
 </div>
 <p className="text-[10px] font-black tracking-widest uppercase text-slate-400">No results found</p>
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
 loadGroupDetails(node.data);
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
 <main className="flex-1 space-y-6">
 {selectedGroup ? (
 <div className="space-y-6">
 <div className="p-8 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 ring-1 ring-black/5">
 <div className="flex items-center gap-6">
 <div className="w-14 h-11 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-2xl rotate-2">
 <Fingerprint size={24} />
 </div>
 <div className="space-y-1.5">
 <div className="flex items-center gap-3">
 <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">
 {selectedGroup.cdIdNm}
 </h2>
 <div className="px-2.5 py-1 rounded-lg bg-white/60 border border-white/80 text-[10px] font-black text-slate-400 tracking-widest shadow-sm">
 {selectedGroup.cdId}
 </div>
 </div>
 <p className="text-xs font-bold text-slate-500 ">
 {selectedGroup.cdIdExpln || '정의된 명세가 없습니다.'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Button onClick={handleCreateDetail} size="lg" className="h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-xs tracking-widest uppercase shadow-xl hover:-translate-y-0.5 transition-all gap-2 active:scale-95">
 <Plus size={16} /> 신규 등록
 </Button>
 </div>
 </div>

 <div className={cn(
 "bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl overflow-hidden ring-1 ring-black/5 transition-all",
 detailsLoading ? "opacity-30 pointer-events-none scale-[0.99] grayscale" : "opacity-100"
 )}>
 <div className="p-6 border-b border-slate-100/50 flex items-center justify-between bg-slate-50/30">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-primary shadow-sm">
 {detailsLoading ? <RefreshCcw size={16} className="animate-spin" /> : <Layers size={16} />}
 </div>
 <div className="text-left">
 <h3 className="text-xs font-black tracking-widest text-slate-900 uppercase leading-none mb-1.5">구성 명세</h3>
 <p className="text-[10px] font-bold text-slate-400 leading-none uppercase">
 {detailsLoading ? 'Syncing...' : `Total ${selectedGroup.details?.length || 0} Units`}
 </p>
 </div>
 </div>
 <div>
 <div className="flex flex-col items-end pr-4 text-right">
 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Integrity</span>
 <div className="flex items-center gap-1">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-[10px] font-black text-emerald-500 tracking-widest">99.9%</span>
 </div>
 </div>
 </div>
 </div>
 <div className="p-2">
 <StandardDataTable<CmmnDetailCode>
 columns={columns}
 data={selectedGroup.details || []}
 emptyMessage="데이터가 존재하지 않습니다."
 className="border-none shadow-none bg-transparent"
 isPremium={true}
 />
 </div>
 </div>
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-12 rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5 min-h-[500px]">
 <div className="w-24 h-20 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-200 mb-8 shadow-xl group hover:rotate-6 transition-transform">
 <Database size={40} className="opacity-20 group-hover:opacity-100 transition-opacity" />
 </div>
 <h3 className="text-xl font-black tracking-widest text-slate-200 uppercase mb-4">No Selection</h3>
 <p className="text-[10px] font-black text-slate-300 text-center max-w-sm leading-relaxed mb-10 uppercase tracking-widest">
 Select a domain or group from the explorer<br />to begin management
 </p>
 <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
 <div className="p-6 rounded-xl bg-white/60 border border-white/80 flex flex-col gap-2 items-start shadow-sm">
 <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Domains</span>
 <span className="text-2xl font-black text-slate-900 ">{initialClusters.length}</span>
 </div>
 <div className="p-6 rounded-xl bg-white/60 border border-white/80 flex flex-col gap-2 items-start shadow-sm">
 <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Groups</span>
 <span className="text-2xl font-black text-slate-900 ">{groups.length}</span>
 </div>
 </div>
 </div>
 )}
 </main>
 </div>

 {/* Standard Modal for CRUD */}
 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={editingDetail ? '아키텍처 명세 수정' : '신규 명세 등록'}
 maxWidth="3xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2 border-slate-100 shadow-sm">취소</Button>
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
 <div className="space-y-1.5 p-0.5">
 <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 상위 그룹 식별자
 </label>
 <div className="h-11 flex items-center px-6 rounded-lg bg-slate-100 border-none font-mono text-xs font-bold shadow-inner text-slate-600">
 {selectedGroup?.cdId}
 </div>
 </div>

 <ShadcnFormField
 control={form.control}
 name="dtlCd"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 코드 식별자 (Unique ID) <span className="text-rose-500 font-bold text-xs">*</span>
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={!!editingDetail}
 maxLength={12}
 className="h-11 rounded-lg font-mono text-xs font-bold shadow-inner border-none bg-slate-50 focus:bg-white transition-all text-left"
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
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 표기 레이블 (Label) <span className="text-rose-500 font-bold text-xs">*</span>
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 maxLength={100}
 className="h-11 rounded-lg text-sm font-bold tracking-tight shadow-inner border-none bg-slate-50 focus:bg-white transition-all text-left"
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
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 활성 상태 프로토콜
 </FormLabel>
 <Select
 onValueChange={field.onChange}
 defaultValue={field.value}
 value={field.value}
 >
 <FormControl>
 <SelectTrigger className="h-11 rounded-lg border-none bg-slate-50 font-bold text-xs tracking-widest uppercase shadow-inner">
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
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 메타데이터 컨텍스트 설명
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 maxLength={4000}
 className="w-full min-h-[160px] p-6 rounded-lg border-none bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none shadow-inner text-left"
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

