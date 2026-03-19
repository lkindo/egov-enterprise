'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { ReorderableList } from '@/app/components/ui/reorderable-list';
import { MenuInfo } from '@/types/menu';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
 Plus,
 ListTree,
 ChevronRight,
 Settings,
 Trash2,
 FolderTree,
 FileCode,
 Save,
 Layers,
 Link as LinkIcon,
 Info,
 X,
 CheckCircle2,
 ChevronsDownUp,
 ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { FormField, StandardForm } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { saveMenuAction, updateMenuOrdersAction, deleteMenuAction } from '@/app/actions/menuActions';

// Helper to build tree from flat list
const buildMenuTree = (flatMenus: MenuInfo[]): MenuInfo[] => {
 const map: Record<number, MenuInfo> = {};
 const roots: MenuInfo[] = [];

 flatMenus.forEach(m => {
 map[m.menuNo] = { ...m, upperMenuId: m.upperMenuNo ?? m.upperMenuId ?? 0, children: [] };
 });

 flatMenus.forEach(m => {
 const item = map[m.menuNo];
 const parentId = m.upperMenuNo ?? m.upperMenuId ?? 0;
 if (parentId === 0 || !map[parentId]) {
 roots.push(item);
 } else {
 map[parentId].children?.push(item);
 }
 });

 // Sort by menuOrdr
 const sortByOrder = (a: MenuInfo, b: MenuInfo) => (a.menuOrdr || 0) - (b.menuOrdr || 0);
 roots.sort(sortByOrder);
 roots.forEach(r => {
 r.children?.sort(sortByOrder);
 r.children?.forEach(c => c.children?.sort(sortByOrder));
 });

 return roots;
};

export default function MenuAdminClient({ initialMenus, programs }: { initialMenus: MenuInfo[]; programs: any[] }) {
 const { toast } = useToast();
 const confirm = useConfirm();
 const [treeMenus, setTreeMenus] = useState<MenuInfo[]>(() => buildMenuTree(initialMenus));
 const [hasChanges, setHasChanges] = useState(false);

 const [isModalOpen, setIsOpen] = useState(false);
 const [mode, setMode] = useState<'create' | 'edit'>('create');
 const [formData, setFormData] = useState<Partial<MenuInfo>>({
 menuNo: 0,
 menuNm: '',
 menuOrdr: 0,
 upperMenuId: 0,
 upperMenuNo: 0,
 progrmFileNm: '',
 menuDc: '',
 modernRoute: ''
 });

 const handleOpenCreate = (parentId: number = 0) => {
 setMode('create');
 setFormData({
 menuNo: Date.now(),
 menuNm: '',
 menuOrdr: 999,
 upperMenuId: parentId,
 upperMenuNo: parentId,
 progrmFileNm: '',
 modernRoute: ''
 });
 setIsOpen(true);
 };

 const handleOpenEdit = (menu: MenuInfo) => {
 setMode('edit');
 setFormData({
 ...menu,
 upperMenuId: menu.upperMenuNo ?? menu.upperMenuId ?? 0,
 upperMenuNo: menu.upperMenuNo ?? menu.upperMenuId ?? 0,
 modernRoute: menu.modernRoute || ''
 });
 setIsOpen(true);
 };

 const handleSave = async (e: React.FormEvent) => {
 e.preventDefault();
 const submitData = {
 ...formData,
 upperMenuNo: formData.upperMenuId,
 };
 const res = await saveMenuAction(null, { mode, data: submitData as any });
 if (res.success) {
 toast(res.message, 'success');
 setIsOpen(false);
 window.location.reload();
 } else {
 toast(res.message, 'error');
 }
 };

 const handleSaveChanges = async () => {
 const flat: any[] = [];
 const traverse = (items: MenuInfo[], parentId: number) => {
 items.forEach((item, idx) => {
 flat.push({
 ...item,
 menuOrdr: idx + 1,
 upperMenuNo: parentId,
 upperMenuId: parentId,
 children: undefined
 });
 if (item.children && item.children.length > 0) {
 traverse(item.children, item.menuNo);
 }
 });
 };
 traverse(treeMenus, 0);

 const res = await updateMenuOrdersAction(null, flat);
 if (res.success) {
 toast(res.message, 'success');
 setHasChanges(false);
 } else {
 toast(res.message, 'error');
 }
 };

 const handleDelete = async (id: number) => {
 const isConfirmed = await confirm({
 title: '메뉴 삭제',
 message: '이 메뉴와 하위 메뉴가 모두 삭제됩니다. 계속하시겠습니까?',
 variant: 'destructive'
 });
 if (isConfirmed) {
 const res = await deleteMenuAction(null, id);
 if (res.success) {
 toast(res.message, 'success');
 window.location.reload();
 } else {
 toast(res.message, 'error');
 }
 }
 };

 const [draggedMenuId, setDraggedMenuId] = useState<number | null>(null);
 const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

 // Initialize all nodes as expanded on first load
 useEffect(() => {
 const idsWithChildren = initialMenus
 .filter(m => initialMenus.some(child => child.upperMenuNo === m.menuNo))
 .map(m => m.menuNo);
 setExpandedIds(new Set(idsWithChildren));
 }, [initialMenus]);

 const toggleExpand = (id: number) => {
 setExpandedIds(prev => {
 const next = new Set(prev);
 if (next.has(id)) next.delete(id);
 else next.add(id);
 return next;
 });
 };

 const handleExpandAll = () => {
 const idsWithChildren = initialMenus
 .filter(m => initialMenus.some(child => (child.upperMenuNo ?? child.upperMenuId) === m.menuNo))
 .map(m => m.menuNo);
 setExpandedIds(new Set(idsWithChildren));
 };

 const handleCollapseAll = () => {
 setExpandedIds(new Set());
 };

 const handleDragStart = (e: React.DragEvent, id: number) => {
 setDraggedMenuId(id);
 e.dataTransfer.setData('menuId', String(id));
 e.dataTransfer.effectAllowed = 'move';
 };

 const handleDrop = (e: React.DragEvent, targetParentId: number) => {
 e.preventDefault();

 const sourceId = Number(e.dataTransfer.getData('menuId'));
 if (sourceId === targetParentId) return;

 const newTree = JSON.parse(JSON.stringify(treeMenus));

 // Find item and its current level to check if target would exceed 3 levels
 const getItemWithMetadata = (items: MenuInfo[], id: number, currentLevel: number = 0): { item: MenuInfo, level: number } | null => {
 for (const item of items) {
 if (item.menuNo === id) return { item, level: currentLevel };
 if (item.children) {
 const found = getItemWithMetadata(item.children, id, currentLevel + 1);
 if (found) return found;
 }
 }
 return null;
 };

 const sourceData = getItemWithMetadata(newTree, sourceId);
 if (!sourceData) return;

 // Check depth constraint (Max 3 levels)
 const getMaxDepth = (item: MenuInfo): number => {
 if (!item.children || item.children.length === 0) return 0;
 return 1 + Math.max(...item.children.map(getMaxDepth));
 };

 const targetLevel = (targetParentId === 0) ? 0 : (getItemWithMetadata(newTree, targetParentId)?.level ?? 0) + 1;
 const movingSubTreeDepth = getMaxDepth(sourceData.item);

 if (targetLevel + movingSubTreeDepth >= 3) {
 toast('최대 3단계 계층까지만 지원합니다.', 'error');
 setDraggedMenuId(null);
 return;
 }

 // Find the dragged item and remove it from old position
 const findAndRemove = (items: MenuInfo[], id: number): MenuInfo | null => {
 for (let i = 0; i < items.length; i++) {
 if (items[i].menuNo === id) return items.splice(i, 1)[0];
 if (items[i].children) {
 const found = findAndRemove(items[i].children!, id);
 if (found) return found;
 }
 }
 return null;
 };

 const draggedItem = findAndRemove(newTree, sourceId);
 if (draggedItem) {
 if (targetParentId === 0) {
 newTree.push({ ...draggedItem, upperMenuId: 0 });
 } else {
 const findTarget = (items: MenuInfo[], id: number): MenuInfo | null => {
 for (const item of items) {
 if (item.menuNo === id) return item;
 if (item.children) {
 const found = findTarget(item.children, id);
 if (found) return found;
 }
 }
 return null;
 };
 const target = findTarget(newTree, targetParentId);
 if (target) {
 target.children = target.children || [];
 target.children.push({ ...draggedItem, upperMenuId: targetParentId });
 }
 }
 setTreeMenus(newTree);
 setHasChanges(true);
 toast('메뉴 구조가 임시 변경되었습니다. Commit 버튼을 눌러 확정하세요.', 'success');
 }
 setDraggedMenuId(null);
 };

 // Simplified Recursive Drag and Drop Component
 const MenuNode = ({ item, level = 0 }: { item: MenuInfo; level: number }) => {
 const isDragged = draggedMenuId === item.menuNo;
 const hasChildren = item.children && item.children.length > 0;
 const isExpanded = expandedIds.has(item.menuNo);

 return (
 <div
 draggable
 onDragStart={(e) => handleDragStart(e, item.menuNo)}
 onDragOver={(e) => {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 }}
 onDrop={(e) => {
 e.stopPropagation();
 handleDrop(e, item.menuNo);
 }}
 className={cn(
 "group select-none transition-all duration-300",
 level > 0 && "ml-12 mt-4 border-l-2 border-slate-100 pl-8 pb-2",
 isDragged && "opacity-20 scale-95"
 )}
 >
 <div className={cn(
 "flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all",
 level === 0 ? "bg-white border-slate-100 shadow-lg" : "bg-slate-50/50 border-slate-100/50",
 "hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/5 cursor-grab active:cursor-grabbing"
 )}>
 <div className="flex items-center gap-6">
 <div className="flex items-center gap-2">
 {hasChildren && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 toggleExpand(item.menuNo);
 }}
 className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
 >
 <ChevronRight size={16} className={cn("transition-transform duration-300", isExpanded && "rotate-90")} />
 </button>
 )}
 {!hasChildren && level < 2 ? <div className="w-6" /> : null} {/* Spacing for alignment if no children but could have some */}

 <div className={cn(
 "w-12 h-12 rounded-[1rem] flex items-center justify-center shadow-lg transition-transform group-hover:rotate-3",
 level === 0 ? "bg-slate-900 text-white" : level === 1 ? "bg-primary text-white" : "bg-slate-200 text-slate-500"
 )}>
 {level === 0 ? <FolderTree size={20} /> : level === 1 ? <Layers size={18} /> : <FileCode size={16} />}
 </div>
 </div>

 <div className="flex flex-col gap-1">
 <span className={cn(
 "text-lg font-black tracking-tighter italic ",
 level === 0 ? "text-slate-900" : "text-slate-700"
 )}>
 {item.menuNm}
 </span>
 <div className="flex items-center gap-3">
 <span className="text-[9px] bg-black/5 px-2 py-0.5 rounded font-mono font-black tracking-tight tabular-nums border border-black/5">
 #{item.menuNo}
 </span>
 {item.progrmFileNm && (
 <span className="text-[9px] flex items-center gap-1.5 text-primary/60 font-black tracking-tight">
 <LinkIcon size={10} strokeWidth={3} /> {item.progrmFileNm}
 </span>
 )}
 {item.modernRoute && (
 <span className="text-[9px] flex items-center gap-1.5 text-emerald-600/60 font-black tracking-tight">
 <CheckCircle2 size={10} strokeWidth={3} /> {item.modernRoute}
 </span>
 )}
 </div>
 </div>
 </div>

 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
 {level < 2 && (
 <Button
 variant="ghost" size="icon"
 onClick={() => handleOpenCreate(item.menuNo)}
 className="h-10 w-10 hover:bg-slate-900 hover:text-white rounded-xl"
 >
 <Plus size={16} />
 </Button>
 )}
 <Button
 variant="ghost" size="icon"
 onClick={() => handleOpenEdit(item)}
 className="h-10 w-10 hover:bg-slate-900 hover:text-white rounded-xl"
 >
 <Settings size={16} />
 </Button>
 <Button
 variant="ghost" size="icon"
 onClick={() => handleDelete(item.menuNo)}
 className="h-10 w-10 hover:bg-rose-50 hover:text-rose-600 rounded-xl"
 >
 <Trash2 size={16} />
 </Button>
 </div>
 </div>

 {/* Nested Children with Folding */}
 {hasChildren && isExpanded && (
 <div className="space-y-4 overflow-hidden animate-in slide-in-from-top-4 duration-300">
 {item.children!.map(child => (
 <MenuNode key={child.menuNo} item={child} level={level + 1} />
 ))}
 </div>
 )}
 </div>
 );
 };

 return (
 <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <PageHeader
 title="시스템 메뉴 아키텍처"
 breadcrumbs={[{ label: '시스템관리' }, { label: '메뉴관리' }]}
 actions={
 <div className="flex gap-4">
 <div className="flex bg-slate-100 p-2 rounded-[1.5rem] gap-2">
 <Button
 variant="ghost"
 onClick={handleExpandAll}
 className="h-10 px-4 rounded-xl font-black text-[10px] tracking-tight gap-2 hover:bg-white hover:shadow-sm"
 >
 <ChevronsUpDown size={14} /> 자계도(전체)
 </Button>
 <Button
 variant="ghost"
 onClick={handleCollapseAll}
 className="h-10 px-4 rounded-xl font-black text-[10px] tracking-tight gap-2 hover:bg-white hover:shadow-sm"
 >
 <ChevronsDownUp size={14} /> 간략히
 </Button>
 </div>

 {hasChanges ? (
 <Button
 onClick={handleSaveChanges}
 className="bg-emerald-600 text-white hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black shadow-2xl shadow-emerald-200 gap-3 italic tracking-tight text-sm"
 >
 <Save size={20} /> 순서 적용
 </Button>
 ) : null}
 <Button
 onClick={() => handleOpenCreate(0)}
 className="h-14 px-10 rounded-2xl font-black shadow-2xl shadow-primary/20 gap-3 hover:-translate-y-1 transition-all italic tracking-tight text-sm"
 >
 <Plus size={20} /> 상위 메뉴 추가
 </Button>
 </div>
 }
 />

 <div className="p-10 bg-slate-900 text-white rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
 <div className="w-20 h-20 bg-white/10 rounded-[1.5rem] flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl">
 <FolderTree size={32} className="text-primary-foreground" />
 </div>
 <div className="space-y-2 flex-1">
 <h4 className="text-2xl font-black italic tracking-tighter ">계층적 메뉴 관리 시스템</h4>
 <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-2xl">
 최대 3단계의 계층 구조를 지원합니다. 루트 도메인 하위에 서브 카테고리와 개별 프로그램 노드를 배치하여 시스템 맵을 설계하십시오…
 </p>
 </div>
 </div>

 <div className="space-y-8">
 {treeMenus.map(menu => (
 <MenuNode key={menu.menuNo} item={menu} level={0} />
 ))}

 {/* Root Drop Zone */}
 <div
 onDragOver={(e) => {
 e.preventDefault();
 e.currentTarget.classList.add('bg-primary/5', 'border-primary');
 }}
 onDragLeave={(e) => {
 e.currentTarget.classList.remove('bg-primary/5', 'border-primary');
 }}
 onDrop={(e) => {
 e.currentTarget.classList.remove('bg-primary/5', 'border-primary');
 handleDrop(e, 0);
 }}
 className="border-2 border-dashed border-slate-200 rounded-[3rem] p-12 flex flex-col items-center justify-center gap-4 transition-all hover:border-primary/40 group mt-10"
 >
 <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:text-primary transition-colors">
 <Plus size={32} />
 </div>
 <p className="text-sm font-black text-slate-400 tracking-[0.2em]">여기서 놓으면 최상위 메뉴로 이동합니다</p>
 </div>
 </div>

 {/* Registration/Edit Modal */}
 <StandardModal
 isOpen={isModalOpen}
 onClose={() => setIsOpen(false)}
 title={mode === 'create' ? '신규 메뉴 정의' : '메뉴 구성 수정'}
 maxWidth="2xl"
 >
 <StandardForm onSubmit={handleSave} className="bg-transparent border-0 shadow-none">
 <div className="space-y-8 p-4">
 <div className="space-y-4">
 <Label className="text-sm font-black text-slate-500 tracking-[0.2em] px-2">메뉴 명칭</Label>
 <Input
 value={formData.menuNm}
 onChange={(e) => setFormData({ ...formData, menuNm: e.target.value })}
 className="h-16 rounded-2xl border-2 text-xl font-black px-8 focus:ring-4 focus:ring-primary/10"
 />
 </div>

 <div className="grid grid-cols-2 gap-8">
 <div className="space-y-4">
 <Label className="text-sm font-black text-slate-500 tracking-[0.2em] px-2">상위 메뉴 ID</Label>
 <div className="h-16 rounded-2xl border-2 flex items-center px-8 font-black bg-slate-50 text-slate-400">
 {formData.upperMenuId === 0 ? 'ROOT' : formData.upperMenuId}
 </div>
 </div>

 <div className="space-y-4">
 <Label className="text-sm font-black text-slate-500 tracking-[0.2em] px-2">표시 순서</Label>
 <Input
 type="number"
 value={formData.menuOrdr}
 onChange={(e) => setFormData({ ...formData, menuOrdr: Number(e.target.value) })}
 className="h-16 rounded-2xl border-2 font-black px-8"
 />
 </div>
 </div>

 <div className="space-y-4">
 <Label className="text-sm font-black text-slate-500 tracking-[0.2em] px-2">프로그램 자산</Label>
 <Select
 value={formData.progrmFileNm || ''}
 onValueChange={(v) => setFormData({ ...formData, progrmFileNm: v })}
 >
 <SelectTrigger className="h-16 rounded-2xl border-2 font-black text-lg px-8">
 <SelectValue placeholder="연동되지 않음" />
 </SelectTrigger>
 <SelectContent>
 {programs.map(p => (
 <SelectItem key={p.progrmFileNm} value={p.progrmFileNm} className="py-3">
 {p.progrmNm} ({p.progrmFileNm})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-4">
 <Label className="text-sm font-black text-slate-500 tracking-[0.2em] px-2">모던 라우트 (연결 URL)</Label>
 <Input
 value={formData.modernRoute || ''}
 onChange={(e) => setFormData({ ...formData, modernRoute: e.target.value })}
 className="h-14 rounded-xl border-2 font-bold px-6"
 />
 </div>

 <div className="flex gap-4 pt-10">
 <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black text-[10px] tracking-tight">취소</Button>
 <Button type="submit" className="flex-[2] h-16 rounded-2xl font-black italic tracking-[0.2em] text-[10px]">
 {mode === 'create' ? '등록 완료' : '수정 완료'}
 </Button>
 </div>
 </div>
 </StandardForm>
 </StandardModal>
 </div>
 );
}
