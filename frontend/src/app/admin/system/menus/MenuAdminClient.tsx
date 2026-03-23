'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronsUpDown,
  Search,
  SearchCode,
  Activity,
  Box,
  Zap,
  LayoutGrid,
  ShieldCheck,
  Network,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { FormField } from '@/app/components/ui/standard-form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { saveMenuAction, updateMenuOrdersAction, deleteMenuAction } from '@/app/actions/menuActions';
import { motion, AnimatePresence } from 'framer-motion';

const StandardModal = dynamic(() => import('@/app/components/ui/standard-modal').then(mod => mod.StandardModal), { ssr: false });

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
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [treeMenus, setTreeMenus] = useState<MenuInfo[]>(() => buildMenuTree(initialMenus));
  const [hasChanges, setHasChanges] = useState(false);

  // Sync treeMenus when initialMenus changes from server (router.refresh())
  useEffect(() => {
    setTreeMenus(buildMenuTree(initialMenus));
  }, [initialMenus]);

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
    console.log('handleSave Res:', res);
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
      // Wait a tiny bit for the server-side state to settle
      setTimeout(() => router.refresh(), 100);
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
      title: '메뉴 삭제 확인',
      message: '해당 메뉴를 삭제하면 모든 하위 메뉴가 함께 삭제되며 복구할 수 없습니다. 계속하시겠습니까?',
      variant: 'destructive'
    });
    if (isConfirmed) {
      const res = await deleteMenuAction(null, id);
      if (res.success) {
        toast(res.message, 'success');
        router.refresh();
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
          level > 0 && "ml-16 mt-6 border-l-2 border-slate-100 pl-10 pb-2 relative",
          isDragged && "opacity-20 scale-95"
        )}
      >
        {/* Connection Line Visualization */}
        {level > 0 && (
            <div className="absolute left-0 top-6 w-8 h-0.5 bg-slate-100 rounded-full" />
        )}

        <div className={cn(
          "flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all relative overflow-hidden",
          level === 0 ? "bg-white border-slate-100 shadow-sm" : "bg-slate-50/50 border-transparent",
          "hover:border-primary/30 hover:shadow-xl cursor-grab active:cursor-grabbing bg-white/40 backdrop-blur-xl"
        )}>
          <div className="flex items-center gap-5 relative z-10">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.menuNo);
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-muted-foreground mr-1"
                >
                  <ChevronRight size={18} className={cn("transition-transform duration-300", isExpanded && "rotate-90")} />
                </button>
              )}
              {!hasChildren && level < 2 ? <div className="w-8" /> : null}

              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6 duration-500",
                level === 0 ? "bg-slate-900 text-white shadow-slate-200" : level === 1 ? "bg-primary text-white shadow-primary/20" : "bg-white text-muted-foreground border border-slate-200 shadow-sm"
              )}>
                {level === 0 ? <FolderTree size={22} /> : level === 1 ? <Layers size={18} /> : <FileCode size={16} />}
              </div>
            </div>

            <div className="flex flex-col">
              <span className={cn(
                "font-black tracking-tighter text-md",
                level === 0 ? "text-foreground" : "text-foreground/80"
              )}>
                {item.menuNm}
              </span>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[9px] font-black bg-slate-100 text-muted-foreground px-2 py-0.5 rounded-lg font-mono tracking-widest uppercase opacity-60">
                  NODE_{item.menuNo}
                </span>
                {item.progrmFileNm && (
                  <span className="text-[9px] flex items-center gap-1.5 text-primary font-black tracking-widest uppercase opacity-60">
                    <LinkIcon size={12} /> {item.progrmFileNm}
                  </span>
                )}
                {item.modernRoute && (
                  <span className="text-[9px] flex items-center gap-1.5 text-emerald-600 font-black tracking-widest uppercase">
                    <CheckCircle2 size={12} /> {item.modernRoute}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all relative z-10">
            {level < 2 && (
              <Button
                variant="ghost" 
                size="icon"
                onClick={() => handleOpenCreate(item.menuNo)}
                className="h-10 w-10 bg-slate-50 hover:bg-primary hover:text-white rounded-xl border border-slate-100 transition-all font-black"
              >
                <Plus size={16} />
              </Button>
            )}
            <Button
              variant="ghost" 
              size="icon"
              onClick={() => handleOpenEdit(item)}
              className="h-10 w-10 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-100 transition-all"
            >
              <Settings size={16} />
            </Button>
            <Button
              variant="ghost" 
              size="icon"
              onClick={() => handleDelete(item.menuNo)}
              className="h-10 w-10 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-100 rounded-xl transition-all"
            >
              <Trash2 size={16} />
            </Button>
          </div>
          
          {/* Subtle decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-2 overflow-hidden animate-in slide-in-from-top-4 duration-500">
            {item.children!.map(child => (
              <MenuNode key={child.menuNo} item={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="네비게이션 정보 아키텍처"
        breadcrumbs={[{ label: '시스템관리' }, { label: '메뉴 관리' }]}
      />

      <HubHeader 
        title="메뉴" 
        highlight="아키텍처" 
        subtitle="시스템 전반의 계층적 메뉴 구조 설계와 권한 기반 네비게이션 트리 관리" 
        icon={FolderTree} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <div className="flex bg-slate-100/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
              <Button
                variant="ghost"
                onClick={handleExpandAll}
                className="h-11 px-4 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-white group transition-all"
              >
                <ChevronsUpDown size={16} className="group-hover:scale-110" /> 전체 펼치기
              </Button>
              <Button
                variant="ghost"
                onClick={handleCollapseAll}
                className="h-11 px-4 rounded-xl font-black text-[10px] tracking-widest uppercase hover:bg-white group transition-all"
              >
                <ChevronsDownUp size={16} className="group-hover:scale-110" /> 전체 접기
              </Button>
            </div>

            {hasChanges && (
              <Button
                onClick={handleSaveChanges}
                className="bg-emerald-600 text-white hover:bg-emerald-700 h-14 px-8 rounded-2xl font-black text-[11px] tracking-widest uppercase gap-3 shadow-2xl animate-pulse"
              >
                <Save size={20} /> 레이아웃 적용
              </Button>
            )}
            <Button
              onClick={() => handleOpenCreate(0)}
              size="lg"
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
            >
              <Plus size={20} /> 최상위 메뉴 추가
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="등록된_노드_수" value={initialMenus.length} icon={Database} color="primary" />
        <HubMetricCard title="계층_깊이" value={3} icon={LayoutGrid} color="indigo" />
        <HubMetricCard title="활성_경로_수" value={initialMenus.filter(m => !!m.modernRoute).length} icon={Network} color="emerald" />
        <HubMetricCard title="동기화_무결성" value="최적" icon={ShieldCheck} color="amber" />
      </HubMetricGrid>

      <HubSectionCard title="시스템 네비게이션 트리" description="최대 3단계의 계층 구조를 지원합니다. 드래그 앤 드롭으로 메뉴 구조를 설계하십시오." icon={SearchCode}>
        <div className="space-y-6 px-4">
          {treeMenus.map(menu => (
            <MenuNode key={menu.menuNo} item={menu} level={0} />
          ))}

          {/* Root Drop Zone Refined */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('bg-primary/5', 'border-primary', 'scale-[1.01]');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('bg-primary/5', 'border-primary', 'scale-[1.01]');
            }}
            onDrop={(e) => {
              e.currentTarget.classList.remove('bg-primary/5', 'border-primary', 'scale-[1.01]');
              handleDrop(e, 0);
            }}
            className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-6 transition-all hover:border-primary/30 group mt-16 bg-slate-50/30"
          >
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:rotate-12 group-hover:scale-110 shadow-inner border border-slate-100 transition-all duration-500">
              <Plus size={32} />
            </div>
            <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">아키텍처 어셈블리</p>
                <p className="text-sm font-black text-muted-foreground tracking-tight group-hover:text-foreground transition-colors uppercase">드래그한 요소를 여기에 놓으면 '최상위' 노드로 프로모션됩니다</p>
            </div>
          </div>
        </div>
      </HubSectionCard>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '신규 네비게이션 노드 설계' : '메뉴 노드 구성 속성 수정'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
            <Button 
                onClick={() => handleSave()} 
                className="flex-[2] h-14 rounded-2xl font-black text-[10px] tracking-widest uppercase shadow-xl"
            >
              {mode === 'create' ? '노드 설계' : '구조 업데이트'}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 pt-4">
          <FormField label="메뉴 명칭" required description="사용자 인터페이스에 노출될 라벨입니다.">
            <Input
              value={formData.menuNm || ''}
              onChange={(e) => setFormData({ ...formData, menuNm: e.target.value })}
              className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner"
              placeholder="메뉴 이름 입력 (예: 사용자 관리)"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-8">
            <FormField label="상위 노드 식별자">
              <div className="h-14 rounded-2xl border-2 border-slate-100 flex items-center px-6 text-[10px] font-black tracking-widest uppercase bg-slate-50/50 text-muted-foreground/60 italic overflow-hidden shadow-inner">
                {formData.upperMenuId === 0 ? 'SYSTEM_ROOT (최상위)' : `PARENT_NODE_${formData.upperMenuId}`}
              </div>
            </FormField>

            <FormField label="표열 순서 (우선순위)" required>
              <Input
                type="number"
                value={formData.menuOrdr}
                onChange={(e) => setFormData({ ...formData, menuOrdr: Number(e.target.value) })}
                className="h-14 rounded-2xl text-xs font-black shadow-inner"
              />
            </FormField>
          </div>

          <FormField label="연동 소프트웨어 자산 (대상 모듈)">
            <Select
              value={formData.progrmFileNm || ''}
              onValueChange={(v) => setFormData({ ...formData, progrmFileNm: v })}
            >
              <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-[10px] tracking-widest uppercase focus:ring-4 focus:ring-primary/10 transition-all shadow-inner">
                <SelectValue placeholder="--- UNLINKED (연동되지 않음) ---" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-2xl p-2">
                {programs.map(p => (
                  <SelectItem key={p.progrmFileNm} value={p.progrmFileNm} className="h-12 rounded-xl text-[10px] font-black tracking-widest uppercase">
                    {p.progrmNm} ({p.progrmFileNm})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="라우팅 엔드포인트 (경로)" description="전자정부 표준 프레임워크 기반 프론트엔드 라우트 경로">
            <div className="relative group/route">
                <Network size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/route:opacity-100 transition-opacity" />
                <Input
                  value={formData.modernRoute || ''}
                  onChange={(e) => setFormData({ ...formData, modernRoute: e.target.value })}
                  className="h-14 pl-16 rounded-2xl text-xs font-mono font-black italic shadow-inner border-2 border-slate-100"
                  placeholder="예: /admin/system/codes"
                />
            </div>
          </FormField>
          
          <FormField label="노드 상세 메타데이터">
            <textarea
              value={formData.menuDc || ''}
              onChange={(e) => setFormData({ ...formData, menuDc: e.target.value })}
              className="w-full min-h-[140px] p-6 rounded-2xl border-2 border-border bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner"
              placeholder="메뉴에 대한 상세 설명 및 주석"
            />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}
