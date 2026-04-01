'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/app/components/layout/page-header';
import { MenuInfo } from '@/types/foundation/menu';
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

// Helper to build tree from flat list - Hardened against null/undefined
const buildMenuTree = (flatMenus: MenuInfo[] | null | undefined): MenuInfo[] => {
  if (!flatMenus || !Array.isArray(flatMenus)) return [];

  const map: Record<number, MenuInfo> = {};
  const roots: MenuInfo[] = [];

  try {
    flatMenus.forEach(m => {
      if (m && m.menuNo) {
        map[m.menuNo] = { ...m, upperMenuId: m.upperMenuNo 님 m.upperMenuId 님 0, children: [] };
      }
    });

    flatMenus.forEach(m => {
      if (!m || !m.menuNo) return;
      const item = map[m.menuNo];
      const parentId = m.upperMenuNo 님 m.upperMenuId 님 0;

      if (parentId === 0 || !map[parentId]) {
        roots.push(item);
      } else {
        const parent = map[parentId];
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(item);
        }
      }
    });

    // Sort by menuOrdr
    const sortByOrder = (a: MenuInfo, b: MenuInfo) => (a.menuOrdr || 0) - (b.menuOrdr || 0);
    roots.sort(sortByOrder);
    roots.forEach(r => {
      if (r.children) {
        r.children.sort(sortByOrder);
        r.children.forEach(c => {
          if (c.children) c.children.sort(sortByOrder);
        });
      }
    });
  } catch (e) {
    console.error('Error in buildMenuTree:', e);
    return [];
  }

  return roots;
};

export default function MenuAdminClient({ initialMenus, programs }: { initialMenus: MenuInfo[]; programs: any[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isSaving, setIsSaving] = useState(false);
  const [treeMenus, setTreeMenus] = useState<MenuInfo[]>(() => buildMenuTree(initialMenus));
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedMenuId, setDraggedMenuId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after' | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // ?쒕쾭 ?곗씠님initialMenus) ?숆린님- ?ъ슜?먯쓽 현재 ?묒뾽님?녾굅님?쒕옒洹?以묒씠 ?꾨땺 ?뚮쭔 ?낅뜲?댄듃
  useEffect(() => {
    if (!hasChanges && !isSaving && !draggedMenuId) {
      setTreeMenus(buildMenuTree(initialMenus));
    }
  }, [initialMenus, hasChanges, isSaving, draggedMenuId]);

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
      upperMenuId: menu.upperMenuNo 님 menu.upperMenuId 님 0,
      upperMenuNo: menu.upperMenuNo 님 menu.upperMenuId 님 0,
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
    const traverse = (items: MenuInfo[] | undefined, parentId: number) => {
      if (!items || !Array.isArray(items)) return;

      items.forEach((item, idx) => {
        // ?깃났 ?대젰님?뺤씤님洹쒓꺽?쇰줈 ?꾩넚 (null 諛⑹떇)
        const parentNo = parentId === 0 ? null : parentId;

        // ?쒕쾭 遺?섏? 濡쒖쭅 異⑸룎 諛⑹?瑜님꾪빐 ?듭떖 ?꾨뱶留님뺤젣 (Payload Sanitization)
        flat.push({
          id: item.menuNo, // id ?꾨뱶 ?님          menuNo: item.menuNo,
          menuOrdr: idx + 1,
          upperMenuNo: parentNo,
          upperMenuId: parentNo,
          menuNm: item.menuNm,
          progrmFileNm: item.progrmFileNm || '',
          modernRoute: item.modernRoute || '',
          menuDc: item.menuDc || ''
        });

        if (item.children && Array.isArray(item.children) && item.children.length > 0) {
          traverse(item.children, item.menuNo);
        }
      });
    };

    try {
      setIsSaving(true);
      traverse(treeMenus, 0);

      const res = await updateMenuOrdersAction(flat);
      if (res.success) {
        toast(res.message, 'success');
        setHasChanges(false);
        // 遺?쒕윭님諛곌꼍 媛깆떊님?꾪빐 startTransition ?ъ슜
        React.startTransition(() => {
          router.refresh();
        });
      } else {
        toast(res.message, 'error');
      }
    } catch (err: any) {
      console.error('Critical Error in handleSaveChanges:', err);
      toast('?쒖꽌 蹂님以님덇린移님딆? ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: '硫붾돱 님젣 ?뺤씤',
      message: '?대떦 硫붾돱瑜님?젣?섎㈃ 紐⑤뱺 ?섏쐞 硫붾돱媛 ?④퍡 님젣?섎ŉ 蹂듦뎄님님?놁뒿?덈떎. 怨꾩냽?섏떆寃좎뒿?덇퉴?',
      variant: 'destructive',
      confirmText: '님젣'
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




  // Initialize all nodes as expanded on first load
  useEffect(() => {
    const idsWithChildren = initialMenus
      .filter(m => initialMenus.some(child => (child.upperMenuNo 님 child.upperMenuId) === m.menuNo))
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
      .filter(m => initialMenus.some(child => (child.upperMenuNo 님 child.upperMenuId) === m.menuNo))
      .map(m => m.menuNo);
    setExpandedIds(new Set(idsWithChildren));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData('menuId', String(id));
    e.dataTransfer.effectAllowed = 'move';

    // 釉뚮씪?곗?媛 ?쒕옒洹님몄뀡님?꾩쟾님?앹꽦님'吏곹썑'님?곹깭瑜님낅뜲?댄듃 (0ms 吏님
    // ?쒕옒洹님쒖옉 利됱떆 DOM님蹂?섎㈃ 釉뚮씪?곗?媛 ?쒕옒洹몃? 媛뺤젣 痍⑥냼?섎뒗 踰꾧렇 ?님    setTimeout(() => {
      setDraggedMenuId(id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggedMenuId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDragEnter = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedMenuId === targetId) return;
    setDropTargetId(targetId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedMenuId === targetId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const threshold = rect.height / 3;

    let position: 'before' | 'inside' | 'after' = 'inside';
    if (relativeY < threshold) position = 'before';
    else if (relativeY > threshold * 2) position = 'after';

    setDropTargetId(targetId);
    setDropPosition(position);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: number, forcedPosition?: 'before' | 'inside' | 'after') => {
    e.preventDefault();
    e.stopPropagation();

    // ?대뼡 ?곹솴?먯꽌님?붿긽님?⑥? ?딅룄濡님대┛님蹂댁옣
    const cleanup = () => {
      setDraggedMenuId(null);
      setDropTargetId(null);
      setDropPosition(null);
    };

    const sourceId = draggedMenuId || Number(e.dataTransfer.getData('menuId'));
    const position = forcedPosition || dropPosition;

    if (!sourceId || sourceId === targetId) {
      cleanup();
      return;
    }

    const newTree = JSON.parse(JSON.stringify(treeMenus));

    // Find and remove the dragged item
    let draggedItem: MenuInfo | null = null;
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

    draggedItem = findAndRemove(newTree, sourceId);
    if (!draggedItem) {
      cleanup();
      return;
    }

    // Helper to find parent array and index of target
    const findParentAnd踰덊샇 = (items: MenuInfo[], id: number): { parent: MenuInfo[], index: number, parentItem: MenuInfo | null } | null => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].menuNo === id) return { parent: items, index: i, parentItem: null };
        if (items[i].children) {
          const found = findParentAnd踰덊샇(items[i].children!, id);
          if (found) {
            if (found.parentItem === null) {
              return { ...found, parentItem: items[i] };
            }
            return found;
          }
        }
      }
      return null;
    };

    if (targetId === 0) {
      // Drop into standard promotion area
      newTree.push({ ...draggedItem, upperMenuId: 0, upperMenuNo: 0 });
    } else {
      const targetInfo = findParentAnd踰덊샇(newTree, targetId);
      if (targetInfo) {
        const { parent, index, parentItem } = targetInfo;
        const parentId = parentItem ? parentItem.menuNo : 0;

        if (position === 'inside') {
          const targetNode = parent[index];
          targetNode.children = targetNode.children || [];
          targetNode.children.push({ ...draggedItem, upperMenuId: targetId, upperMenuNo: targetId });
        } else if (position === 'before') {
          parent.splice(index, 0, { ...draggedItem, upperMenuId: parentId, upperMenuNo: parentId });
        } else if (position === 'after') {
          parent.splice(index + 1, 0, { ...draggedItem, upperMenuId: parentId, upperMenuNo: parentId });
        }
      }
    }

    setTreeMenus(newTree);
    setHasChanges(true);
    setDraggedMenuId(null);
    setDropTargetId(null);
    setDropPosition(null);
    toast('硫붾돱 援ъ“媛 蹂寃쎈릺?덉뒿?덈떎. ?몃━ ?뱀뀡 ?곷떒님[?덉씠?꾩썐 ?곸슜] 踰꾪듉님?대┃?섏뿬 ??ν빐 二쇱꽭님', 'info');
  };

  const MenuNode = ({ item, level = 0 }: { item: MenuInfo; level: number }) => {
    const isDragged = draggedMenuId === item.menuNo;
    const isDropTarget = dropTargetId === item.menuNo;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedIds.has(item.menuNo);

    return (
      <div
        draggable={!isSaving}
        onDragStart={(e) => {
          if (isSaving) return;
          handleDragStart(e, item.menuNo);
        }}
        onDragEnter={(e) => handleDragEnter(e, item.menuNo)}
        onDragOver={(e) => handleDragOver(e, item.menuNo)}
        onDragEnd={() => {
          handleDragEnd();
        }}
        onDrop={(e) => handleDrop(e, item.menuNo)}
        className={cn(
          "group select-none transition-all duration-300 relative",
          level > 0 && "ml-16 mt-6 border-l-2 border-slate-100 pl-10 pb-2",
          isDragged && "opacity-20 scale-95"
        )}
      >
        {/* Drop Indicators */}
        {isDropTarget && dropPosition === 'before' && (
          <div className="absolute -top-3 left-0 right-0 h-1 bg-primary rounded-full z-50 animate-pulse" />
        )}
        {isDropTarget && dropPosition === 'after' && (
          <div className="absolute -bottom-3 left-0 right-0 h-1 bg-primary rounded-full z-50 animate-pulse" />
        )}

        {/* Connection Line Visualization */}
        {level > 0 && (
          <div className="absolute left-0 top-6 w-8 h-0.5 bg-slate-100 rounded-full" />
        )}

        <div className={cn(
          "flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all relative overflow-hidden",
          level === 0 ? "bg-white border-slate-100 shadow-sm" : "bg-slate-50/50 border-transparent",
          isDropTarget && dropPosition === 'inside' ? "border-primary bg-primary/5 scale-[1.02]" : "hover:border-primary/30",
          "cursor-grab active:cursor-grabbing bg-white/40 backdrop-blur-xl"
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
            {item.children?.map(child => (
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
        title="네비게이션?뺣낫 ?꾪궎?띿쿂"
        breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '硫붾돱 愿由? }]}
      />

      <HubHeader
        title="硫붾돱"
        highlight="?꾪궎?띿쿂"
        subtitle="?쒖뒪님?꾨컲님怨꾩링님硫붾돱 援ъ“ 설계? 沅뚰븳 湲곕컲 네비게이션?몃━ 愿由?
        icon={FolderTree}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
              onClick={() => handleOpenCreate(0)}
              size="lg"
              className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3"
            >
              <Plus size={20} /> 신규 등록
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="등록님노드_님 value={(initialMenus || []).length} icon={Database} color="primary" />
        <HubMetricCard title="怨꾩링_源딆씠" value={3} icon={LayoutGrid} color="indigo" />
        <HubMetricCard title="활성_寃쎈줈_님 value={(initialMenus || []).filter(m => !!m?.modernRoute).length} icon={Network} color="emerald" />
        <HubMetricCard title="?숆린님臾닿껐님 value="理쒖쟻" icon={ShieldCheck} color="amber" />
      </HubMetricGrid>

      <HubSectionCard
        title="?쒖뒪님네비게이션?몃━"
        description="理쒕? 3?④퀎님怨꾩링 援ъ“瑜?吏?먰빀?덈떎. ?쒕옒洹님님쒕∼?쇰줈 硫붾돱 援ъ“瑜?설계?섏떗?쒖삤."
        icon={SearchCode}
        action={
          <div className="flex gap-4 items-center">
            <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/10">
              <Button
                variant="ghost"
                onClick={handleExpandAll}
                className="h-10 px-3 text-[10px] font-black tracking-widest uppercase hover:bg-white/20 text-white/70 hover:text-white"
              >
                <ChevronsUpDown size={14} className="mr-2" /> ?쇱튂湲?              </Button>
              <Button
                variant="ghost"
                onClick={handleCollapseAll}
                className="h-10 px-3 text-[10px] font-black tracking-widest uppercase hover:bg-white/20 text-white/70 hover:text-white"
              >
                <ChevronsDownUp size={14} className="mr-2" /> ?묎린
              </Button>
            </div>

            {hasChanges && (
              <Button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="bg-emerald-500 text-white hover:bg-emerald-600 h-10 px-6 rounded-xl font-black text-[10px] tracking-widest uppercase gap-2 shadow-lg animate-in fade-in zoom-in duration-300 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {isSaving ? '泥섎━ 以?..' : '?님}
              </Button>
            )}
          </div>
        }
      >
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
              handleDrop(e, 0, 'inside'); // root Drop
            }}
            className="border-4 border-dashed border-slate-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-6 transition-all hover:border-primary/30 group mt-16 bg-slate-50/30"
          >
            <div className="w-20 h-20 rounded-3xl bg-white flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:rotate-12 group-hover:scale-110 shadow-inner border border-slate-100 transition-all duration-500">
              <Plus size={32} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">?꾪궎?띿쿂 ?댁뀍釉붾━</p>
              <p className="text-sm font-black text-muted-foreground tracking-tight group-hover:text-foreground transition-colors uppercase">?쒕옒洹명븳 ?붿냼瑜님ш린님?볦쑝硫?'理쒖긽님 노드濡님꾨줈紐⑥뀡?⑸땲님/p>
            </div>
          </div>
        </div>
      </HubSectionCard>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '신규 네비게이션노드 설계' : '硫붾돱 노드 援ъ꽦 ?띿꽦 ?섏젙'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-14 rounded-2xl font-black text-[10px] tracking-widest border-2">痍⑥냼</Button>
            <Button
              onClick={() => handleSave()}
              className="flex-[2] h-14 rounded-2xl font-black text-[10px] tracking-widest shadow-xl"
            >
              {mode === 'create' ? '?님 : '?님}
            </Button>
          </div>
        }
      >
        <div className="space-y-8 pt-4">
          <FormField label="硫붾돱 紐낆묶" required description="?ъ슜님?명꽣?섏씠?ㅼ뿉 ?몄텧님?쇰꺼?낅땲님">
            <Input
              value={formData.menuNm || ''}
              onChange={(e) => setFormData({ ...formData, menuNm: e.target.value })}
              className="h-14 rounded-2xl text-md font-black tracking-tight shadow-inner"
              placeholder="硫붾돱 ?대쫫 ?낅젰 (님 ?ъ슜님愿由?"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-8">
            <FormField label="?곸쐞 노드 ?앸퀎님>
              <div className="h-14 rounded-2xl border-2 border-slate-100 flex items-center px-6 text-[10px] font-black tracking-widest uppercase bg-slate-50/50 text-muted-foreground/60 italic overflow-hidden shadow-inner">
                {formData.upperMenuId === 0 ? 'SYSTEM_ROOT (理쒖긽님' : `PARENT_NODE_${formData.upperMenuId}`}
              </div>
            </FormField>

            <FormField label="?쒖뿴 ?쒖꽌 (?곗꽑?쒖쐞)" required>
              <Input
                type="number"
                value={formData.menuOrdr}
                onChange={(e) => setFormData({ ...formData, menuOrdr: Number(e.target.value) })}
                className="h-14 rounded-2xl text-xs font-black shadow-inner"
              />
            </FormField>
          </div>

          <FormField label="?곕룞 ?뚰봽?몄썾님?먯궛 (?님紐⑤뱢)">
            <Select
              value={formData.progrmFileNm || ''}
              onValueChange={(v) => setFormData({ ...formData, progrmFileNm: v })}
            >
              <SelectTrigger className="h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-[10px] tracking-widest uppercase focus:ring-4 focus:ring-primary/10 transition-all shadow-inner">
                <SelectValue placeholder="--- UNLINKED (?곕룞?섏? ?딆쓬) ---" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-2xl p-2">
                {programs.map((p) => (
                  <SelectItem key={p.progrmFileNm} value={p.progrmFileNm} className="text-xs font-bold">
                    {p.progrmKoreanNm} ({p.progrmFileNm})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="?쇱슦님?붾뱶?ъ씤님(寃쎈줈)" description="?꾩옄?뺣? ?쒖? ?꾨젅?꾩썙님湲곕컲 ?꾨줎?몄뿏님?쇱슦님寃쎈줈">
            <div className="relative group/route">
              <Network size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/route:opacity-100 transition-opacity" />
              <Input
                value={formData.modernRoute || ''}
                onChange={(e) => setFormData({ ...formData, modernRoute: e.target.value })}
                className="h-14 pl-16 rounded-2xl text-xs font-mono font-black italic shadow-inner border-2 border-slate-100"
                placeholder="님 /admin/system/codes"
              />
            </div>
          </FormField>

          <FormField label="노드 ?곸꽭 硫뷀님곗씠님>
            <textarea
              value={formData.menuDc || ''}
              onChange={(e) => setFormData({ ...formData, menuDc: e.target.value })}
              className="w-full min-h-[140px] p-6 rounded-2xl border-2 border-border bg-slate-50 text-xs font-bold focus:ring-4 focus:ring-primary/10 outline-none resize-none shadow-inner"
              placeholder="硫붾돱님?님?곸꽭 ?ㅻ챸 諛?二쇱꽍"
            />
          </FormField>
        </div>
      </StandardModal>
    </div>
  );
}

