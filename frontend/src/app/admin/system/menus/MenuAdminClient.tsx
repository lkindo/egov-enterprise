'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { MenuInfo } from '@/types/menu';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  Plus,
  ChevronRight,
  Settings,
  Trash2,
  FolderTree,
  FileCode,
  Save,
  Layers,
  Link as LinkIcon,
  CheckCircle2,
  ChevronsDownUp,
  ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });
import { FormField } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      toast('메뉴 구조가 임시 변경되었습니다. [순서 적용] 버튼을 눌러 확정하세요.', 'success');
    }
    setDraggedMenuId(null);
  };

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
          level > 0 && "ml-12 mt-4 border-l-2 border-border pl-8 pb-2",
          isDragged && "opacity-20 scale-95"
        )}
      >
        <div className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all",
          level === 0 ? "bg-card border-border shadow-sm text-foreground" : "bg-muted/30 border-border/50",
          "hover:border-primary/50 cursor-grab active:cursor-grabbing"
        )}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.menuNo);
                  }}
                  className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                >
                  <ChevronRight size={16} className={cn("transition-transform duration-300", isExpanded && "rotate-90")} />
                </button>
              )}
              {!hasChildren && level < 2 ? <div className="w-6" /> : null}

              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-transform group-hover:rotate-3",
                level === 0 ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : level === 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              )}>
                {level === 0 ? <FolderTree size={18} /> : level === 1 ? <Layers size={16} /> : <FileCode size={14} />}
              </div>
            </div>

            <div className="flex flex-col">
              <span className={cn(
                "font-bold tracking-tight italic text-sm",
                level === 0 ? "text-foreground" : "text-foreground/80"
              )}>
                {item.menuNm}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                  #{item.menuNo}
                </span>
                {item.progrmFileNm && (
                  <span className="text-[10px] flex items-center gap-1 text-primary/60 font-bold">
                    <LinkIcon size={10} /> {item.progrmFileNm}
                  </span>
                )}
                {item.modernRoute && (
                  <span className="text-[10px] flex items-center gap-1 text-emerald-600/60 font-bold">
                    <CheckCircle2 size={10} /> {item.modernRoute}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
            {level < 2 && (
              <Button
                variant="ghost" size="icon"
                onClick={() => handleOpenCreate(item.menuNo)}
                className="h-8 w-8 rounded-lg"
              >
                <Plus size={14} />
              </Button>
            )}
            <Button
              variant="ghost" size="icon"
              onClick={() => handleOpenEdit(item)}
              className="h-8 w-8 rounded-lg"
            >
              <Settings size={14} />
            </Button>
            <Button
              variant="ghost" size="icon"
              onClick={() => handleDelete(item.menuNo)}
              className="h-8 w-8 text-rose-500 hover:text-rose-600 rounded-lg"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-4 overflow-hidden animate-in slide-in-from-top-4 duration-300 mt-4">
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
            <div className="flex bg-muted/50 p-1.5 rounded-xl gap-1.5">
              <Button
                variant="ghost"
                onClick={handleExpandAll}
                className="h-9 px-3 rounded-lg font-bold text-xs gap-2"
              >
                <ChevronsUpDown size={14} /> 펼치기
              </Button>
              <Button
                variant="ghost"
                onClick={handleCollapseAll}
                className="h-9 px-3 rounded-lg font-bold text-xs gap-2"
              >
                <ChevronsDownUp size={14} /> 접기
              </Button>
            </div>

            {hasChanges && (
              <Button
                onClick={handleSaveChanges}
                className="bg-emerald-600 text-white hover:bg-emerald-700 h-12 px-6 rounded-xl font-bold gap-2 shadow-lg italic"
              >
                <Save size={18} /> 순서 적용
              </Button>
            )}
            <Button
              onClick={() => handleOpenCreate(0)}
              className="h-12 px-6 rounded-xl font-bold gap-2 shadow-md italic"
            >
              <Plus size={18} /> 상위 메뉴 추가
            </Button>
          </div>
        }
      />

      <div className="bg-slate-900 text-white rounded-[3rem] p-10 shadow-2xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/20">
          <FolderTree size={32} className="text-primary-foreground" />
        </div>
        <div className="space-y-1.5 flex-1 text-center md:text-left">
          <h4 className="text-2xl font-black italic tracking-tighter">계층적 메뉴 관리 시스템</h4>
          <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-2xl">
            최대 3단계의 계층 구조를 지원합니다. 드래그 앤 드롭으로 메뉴 구조를 설계하고 순서 적용 버튼을 눌러 확정하십시오.
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
          className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center gap-4 transition-all hover:border-primary/40 group mt-10"
        >
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
            <Plus size={24} />
          </div>
          <p className="text-xs font-bold text-muted-foreground tracking-tight">여기에 놓으면 최상위 메뉴로 이동합니다</p>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '신규 메뉴 등록' : '메뉴 정보 수정'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-3">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-xl font-bold">취소</Button>
            <Button 
              type="button" 
              onClick={() => handleSave()} 
              className="flex-[2] h-11 rounded-xl font-bold"
            >
              {mode === 'create' ? '등록 완료' : '수정 완료'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5 pt-2">
          <FormField label="메뉴 명칭" required>
            <Input
              value={formData.menuNm}
              onChange={(e) => setFormData({ ...formData, menuNm: e.target.value })}
              className="h-10 text-sm font-semibold"
              placeholder="메뉴 명칭 입력"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="상위 메뉴 ID">
              <div className="h-10 rounded-lg border flex items-center px-4 text-sm font-medium bg-muted/30 text-muted-foreground italic">
                {formData.upperMenuId === 0 ? 'root (최상위)' : formData.upperMenuId}
              </div>
            </FormField>

            <FormField label="표시 순서" required>
              <Input
                type="number"
                value={formData.menuOrdr}
                onChange={(e) => setFormData({ ...formData, menuOrdr: Number(e.target.value) })}
                className="h-10 text-sm"
              />
            </FormField>
          </div>

          <FormField label="연동 프로그램 (자산)">
            <Select
              value={formData.progrmFileNm || ''}
              onValueChange={(v) => setFormData({ ...formData, progrmFileNm: v })}
            >
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="연동되지 않음" />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p.progrmFileNm} value={p.progrmFileNm}>
                    {p.progrmNm} ({p.progrmFileNm})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="연결 URL (모던 라우트)" description="프론트엔드 라우트 경로">
            <Input
              value={formData.modernRoute || ''}
              onChange={(e) => setFormData({ ...formData, modernRoute: e.target.value })}
              className="h-10 text-sm font-mono"
              placeholder="예: /admin/system/codes"
            />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}
