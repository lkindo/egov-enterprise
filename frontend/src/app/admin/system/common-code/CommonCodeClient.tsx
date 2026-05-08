import {
 DndContext,
 closestCenter,
 KeyboardSensor,
 PointerSensor,
 useSensor,
 useSensors,
 DragOverlay,
 defaultDropAnimationSideEffects,
 DragStartEvent,
 DragOverEvent,
 DragEndEvent,
 MeasuringStrategy,
 DropAnimation,
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
import { flattenCodeTree, rebuildCodeTree, getCodeProjection, FlattenedCodeNode } from './treeUtils';
import { cn } from '@/lib/utils';
import { 
 Layers, 
 Tag, 
 Database, 
 Search, 
 SearchSlash, 
 Plus, 
 RefreshCcw, 
 Settings, 
 Trash2,
 LayoutGrid,
 Fingerprint,
 Save
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import React from 'react';
import { useAppForm } from '@/hooks/useAppForm';
import { codeDetailSchema } from '@/lib/validation/schemas';
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
 "text-xs font-mono font-bold tracking-tight opacity-60",
 isSelected ? "text-white" : "text-slate-500"
 )}>
 {node.id}
 </span>
 </div>
 {isSelected && (
 <div className="ml-auto">
 <div className={cn(
 "w-1.5 h-1.5 rounded-full",
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

 const form = useAppForm(codeDetailSchema, {
 defaultValues: {
 code: '',
 codeNm: '',
 useAt: 'Y',
 codeDc: ''
 }
 });

 useEffect(() => {
 if (isModalOpen) {
 if (editingDetail) {
 form.reset({
 code: editingDetail.code,
 codeNm: editingDetail.codeNm,
 useAt: (editingDetail.useAt as 'Y' | 'N') || 'Y',
 codeDc: editingDetail.codeDc || ''
 });
 } else {
 form.reset({
 code: '',
 codeNm: '',
 useAt: 'Y',
 codeDc: ''
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
 id: cl.clCode || '',
 name: cl.clCodeNm || '',
 groups: safeGroups
 .filter(g => g.clCode === cl.clCode)
 .map(g => ({
 ...g,
 details: g.codeId === selectedGroupId ? safeDetails : []
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
 toast('�ڵ� ������ ������ �籸���Ǿ����ϴ�.', 'info');
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
 toast('���� ���� ���� �� ���� �߻�', 'error');
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
 codeId: group.codeId,
 searchKeyword: group.codeId,
 searchCondition: '1',
 pageUnit: 999
 });

 // Failsafe: Filter details on client side just in case backend returns all items
 const fetchedDetails = (res.list || []).filter(item =>
 item && (item as CmmnDetailCode).codeId === group.codeId
 );

 // 2. Update state directly
 setSelectedGroup({
 ...group,
 details: fetchedDetails as CmmnDetailCode[]
 });
 } catch (error) {
 toast('�� �ڵ带 �ҷ����� �� ������ �߻��߽��ϴ�.', 'error');
 } finally {
 setDetailsLoading(false);
 }
 };

 // Synchronize initial state from props
 useEffect(() => {
 if (selectedGroupId && (initialClusters || []).length > 0) {
 if (!selectedGroup || selectedGroup.codeId !== selectedGroupId) {
 const cluster = initialClusters.find(c => (c.groups || []).some(g => g?.codeId === selectedGroupId));
 if (cluster) {
 const group = (cluster.groups || []).find(g => g?.codeId === selectedGroupId);
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

 const handleDeleteDetail = async (code: string) => {
 if (!selectedGroup) return;

 const ok = await confirm({
 title: '�� �ڵ� ��� ����',
 message: '�ش� �ڵ� ������ �����ͺ��̽����� ������ �����Ͻðڽ��ϱ�?',
 variant: 'destructive',
 confirmText: '����'
 });

 if (ok) {
 try {
 const res = await deleteCodeDetail(null, { codeId: selectedGroup.codeId, code });
 if (res.success) {
 toast(res.message, 'success');
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
 toast('��Ʈ��ũ ������ �߻��߽��ϴ�.', 'error');
 }
 }
 };

 const handleCreateDetail = () => {
 if (!selectedGroup) {
 toast('�ڵ� ����� ����� �׷� �ڵ带 ���� �����Ͻʽÿ�.', 'info');
 return;
 }
 setEditingDetail(null);
 setIsOpen(true);
 };

 const onSubmit = async (values: any) => {
 try {
 const res = await saveCodeDetail(null, {
 ...values,
 useAt: values.useAt as 'Y' | 'N',
 codeId: selectedGroup?.codeId || '',
 isNew: !editingDetail
 });

 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 } else {
 toast(res.message, 'error');
 }
 } catch (error) {
 toast('���� ��� �� ������ �߻��߽��ϴ�.', 'error');
 }
 };

 const columns: Column<CmmnDetailCode>[] = [
 {
 header: '�ڵ�',
 accessor: (item: CmmnDetailCode) => <span className="font-mono font-bold text-slate-700 tracking-tight">{item.code}</span>,
 className: 'w-24'
 },
 {
 header: '�ڵ� ��Ī',
 accessor: (item: CmmnDetailCode) => (
 <div className="flex flex-col">
 <span className="font-bold text-slate-900 tracking-tight">{item.codeNm}</span>
 <span className="text-xs font-bold text-slate-500 line-clamp-1 ">{item.codeDc || 'No description available'}</span>
 </div>
 )
 },
 {
 header: '���� ��������',
 accessor: (item: CmmnDetailCode) => <HubStatusBadge status={item.useAt === 'Y' ? '��� ��' : '�̻��'} />,
 className: 'w-32'
 },
 {
 header: '���� ����',
 className: 'text-right w-28',
 accessor: (item: CmmnDetailCode) => (
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="h-9 w-9 hover:bg-slate-100 rounded-lg"
 onClick={(e) => { e.preventDefault(); handleEditDetail(item); }}
 >
 <Settings size={14} className="text-slate-600" />
 </Button>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-lg"
 onClick={(e) => { e.preventDefault(); handleDeleteDetail(item.code); }}
 >
 <Trash2 size={14} />
 </Button>
 </div>
 )
 }
 ];

 const activeNode = activeId ? flattenedNodes.find(n => n.id === activeId) : null;

 return (
 <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <div className="flex flex-col lg:flex-row gap-10 min-h-[750px]">
 {/* --- Left Sidebar: Code Tree --- */}
 <aside className="w-full lg:w-[400px] flex flex-col gap-6">
 <div className="bg-white/95 backdrop-blur-3xl rounded-lg border border-slate-200/60 shadow-2xl overflow-hidden flex flex-col h-full ring-1 ring-slate-100/50">
 <div className="p-7 border-b border-slate-100 bg-slate-50/50 space-y-5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
 <Database size={18} />
 </div>
 <h3 className="text-xs font-bold tracking-[0.2em] text-slate-900 uppercase">
 Explorer
 </h3>
 </div>
 <div className="flex items-center gap-2">
 {hasExplorerChanges && (
 <button 
 onClick={handleSaveExplorerChanges}
 className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
 >
 <Save size={12} /> Save
 </button>
 )}
 <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold tracking-widest">
 {clCodes.length} Domains
 </span>
 </div>
 </div>
 <div className="relative group">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
 <Input
 placeholder="������ �Ǵ� �׷� �˻�.."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="h-12 pl-12 pr-6 bg-white border-2 border-slate-100 rounded-lg text-xs font-bold tracking-tight shadow-inner focus:border-primary/30 transition-all placeholder:text-slate-300"
 />
 </div>
 </div>

 <div className="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[650px]">
 {visibleNodes.length === 0 ? (
 <div className="py-20 text-center space-y-4">
 <div className="w-16 h-12 rounded-lg bg-slate-50 flex items-center justify-center mx-auto text-slate-200 border border-slate-100 shadow-inner">
 <SearchSlash size={32} />
 </div>
 <p className="text-xs font-bold tracking-[0.3em] uppercase text-slate-400">����� ã�� �� ����</p>
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
 isSelected={node.type === 'cluster' ? selectedClusterId === node.id : selectedGroup?.codeId === node.id}
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
 <div className="p-8 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 ring-1 ring-slate-100">
 <div className="flex items-center gap-6">
 <div className="w-16 h-12 rounded-lg bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20">
 <Fingerprint size={28} />
 </div>
 <div className="space-y-1">
 <div className="flex items-center gap-3">
 <h2 className="text-2xl font-bold tracking-tight text-slate-900 uppercase">
 {selectedGroup.codeIdNm}
 </h2>
 <div className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-mono font-bold text-slate-600">
 {selectedGroup.codeId}
 </div>
 </div>
 <p className="text-xs font-bold text-slate-700 ">
 {selectedGroup.codeIdDc || '���ǵ� ����� �����ϴ�.'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-3">
 <Button onClick={handleCreateDetail} size="lg" className="h-12 px-6 rounded-lg bg-primary text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:-translate-y-0.5 transition-all gap-2">
 <Plus size={16} /> �ű� ���
 </Button>
 </div>
 </div>

 <div className={cn(
 "bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-100 transition-all",
 detailsLoading ? "opacity-30 pointer-events-none scale-[0.99] grayscale" : "opacity-100"
 )}>
 <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-lg bg-white border-2 border-slate-100 flex items-center justify-center text-primary shadow-sm">
 {detailsLoading ? <RefreshCcw size={18} className="animate-spin" /> : <Layers size={18} />}
 </div>
 <div className="text-left">
 <h3 className="text-sm font-bold tracking-tight text-slate-900 uppercase leading-none mb-1.5">�ý��� ���� ���</h3>
 <p className="text-xs font-bold text-slate-700 leading-none">
 {detailsLoading ? '�����κ��� ����� �о���� ��..' : `�� ${selectedGroup.details?.length || 0}���� �Ķ���Ͱ� ���ǵ�`}
 </p>
 </div>
 </div>
 <div>
 <div className="flex flex-col items-end pr-4 text-right">
 <span className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em] leading-none mb-1.5">���Ἲ</span>
 <div className="flex items-center gap-1">
 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-xs font-bold text-emerald-500 font-mono">99.9%</span>
 </div>
 </div>
 </div>
 </div>
 <div className="p-4">
 <StandardDataTable<CmmnDetailCode>
 columns={columns}
 data={selectedGroup.details || []}
 emptyMessage="���õ� �׷쿡 �� �ڵ尡 �������� �ʽ��ϴ�."
 className="border-none"
 isPremium={false}
 />
 </div>
 </div>
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center p-12 rounded-lg bg-white border border-slate-200 shadow-sm ring-1 ring-slate-100 min-h-[500px]">
 <div className="w-24 h-24 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 mb-8 border border-slate-100 shadow-inner">
 <Database size={40} className="animate-pulse" />
 </div>
 <h3 className="text-xl font-bold tracking-tight text-slate-900 uppercase mb-4">������ ������ �����</h3>
 <p className="text-xs font-bold text-slate-700 text-center max-w-sm leading-relaxed mb-10">
 ���� �ڵ� �ͽ��÷η����� ���� ����� �����Ͻʽÿ�.<br />
 ������ ������ ��� ������ �����Ͱ� �̰��� ����˴ϴ�.
 </p>
 <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
 <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-2 items-start">
 <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">������ Ŭ������</span>
 <span className="text-2xl font-bold text-slate-900 font-mono ">{initialClusters.length}</span>
 </div>
 <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 flex flex-col gap-2 items-start">
 <span className="text-xs font-bold text-slate-600 tracking-widest uppercase">Ȱ�� �׷� ��</span>
 <span className="text-2xl font-bold text-slate-900 font-mono ">{groups.length}</span>
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
 title={editingDetail ? '��Ű��ó ��� ����' : '�ű� ��� ���'}
 maxWidth="3xl"
 footer={
 <div className="flex w-full gap-4">
 <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold text-xs tracking-widest border-2 border-slate-100 shadow-sm">���</Button>
 <Button
 onClick={form.handleSubmit(onSubmit)}
 disabled={form.formState.isSubmitting}
 className="flex-[2] h-11 rounded-lg bg-primary border-none text-white font-bold text-xs tracking-widest shadow-2xl hover:brightness-110 transition-all hover:-translate-y-1 group"
 >
 <Plus size={18} className="group-hover:rotate-90 transition-transform" /> ����
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
 ���� �׷� �ĺ���
 </label>
 <div className="h-11 flex items-center px-6 rounded-lg bg-slate-100 border-none font-mono text-xs font-bold shadow-inner text-slate-600">
 {selectedGroup?.codeId}
 </div>
 </div>

 <ShadcnFormField
 control={form.control}
 name="code"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 �ڵ� �ĺ��� (Unique ID) <span className="text-rose-500 font-bold text-xs">*</span>
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 readOnly={!!editingDetail}
 className="h-11 rounded-lg font-mono text-xs font-bold shadow-inner border-none bg-slate-50 focus:bg-white transition-all text-left"
 placeholder="Unique code indicator"
 />
 </FormControl>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="codeNm"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 ǥ�� ���̺� (Label) <span className="text-rose-500 font-bold text-xs">*</span>
 </FormLabel>
 <FormControl>
 <Input
 {...field}
 className="h-11 rounded-lg text-sm font-bold tracking-tight shadow-inner border-none bg-slate-50 focus:bg-white transition-all text-left"
 placeholder="���̺� ��Ī �Է�"
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
 name="useAt"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 Ȱ�� ���� ��������
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
 --- ��� �� (ACTIVE) ---
 </SelectItem>
 <SelectItem value="N" className="h-12 rounded-lg text-xs font-bold tracking-widest uppercase text-rose-500">
 --- �̻�� (INACTIVE) ---
 </SelectItem>
 </SelectContent>
 </Select>
 <FormMessage className="text-xs font-bold text-rose-600 px-1 mt-1" />
 </FormItem>
 )}
 />

 <ShadcnFormField
 control={form.control}
 name="codeDc"
 render={({ field }) => (
 <FormItem className="space-y-1.5 p-0.5">
 <FormLabel className="text-xs font-bold text-slate-800 flex items-center gap-1.5 ml-1 uppercase tracking-tight">
 ��Ÿ������ ���ؽ�Ʈ ����
 </FormLabel>
 <FormControl>
 <textarea
 {...field}
 className="w-full min-h-[160px] p-6 rounded-lg border-none bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none shadow-inner text-left"
 placeholder="�ڵ� ���ó �� �ý��� ���� ���� ����..."
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

