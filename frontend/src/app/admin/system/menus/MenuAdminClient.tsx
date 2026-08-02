'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronsDownUp,
  ChevronsUpDown,
  SearchCode,
  Network,
  Database,
  GripVertical,
  AlertTriangle,
  RefreshCcw,
  Unlink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
;
import { Button } from '@/components/ui/button';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { saveMenuAction, updateMenuOrdersAction, deleteMenuAction } from '@/app/actions/menuActions';
import { menuSchema } from '@/lib/validation/schemas';
import { Textarea } from '@/components/ui/textarea';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormField as ShadcnFormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { z } from 'zod';

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

import { flattenTree,  FlattenedItem,  getProjection,  listToTree } from './treeUtils';

type MenuFormValues = z.infer<typeof menuSchema>;

/**
 * 서버 조회 결과 봉투.
 * 실패를 빈 배열로 삼켜 "데이터 0건"으로 위장하지 않기 위해, 사유를 함께 실어 나른다.
 */
export type FetchResult<T> = { data: T; error: string | null };

/** 메뉴에 연결할 수 있는 프로그램(자동완성 후보) */
export type ProgramOption = { prgrmFileNm?: string; prgrmKornNm?: string };

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
/*                                Sortable Item                               */
/* -------------------------------------------------------------------------- */

interface SortableMenuNodeProps {
    item: FlattenedItem;
    depth: number;
    isSaving: boolean;
    onEdit: (item: MenuInfo) => void;
    onCreate: (id: number) => void;
    onDelete: (item: FlattenedItem) => void;
    onToggle: (id: number) => void;
    isExpanded: boolean;
    hasChildren: boolean;
    isOverlay?: boolean;
}

const SortableMenuNode = ({ 
    item, 
    depth, 
    isSaving, 
    onEdit, 
    onCreate, 
    onDelete, 
    onToggle,
    isExpanded,
    hasChildren,
    isOverlay = false
}: SortableMenuNodeProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.menuNo });

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
            {/* 계층 연결 라인 */}
            {!isOverlay && depth > 0 && (
                <div 
                    className="absolute top-0 bottom-0 border-l-2 border-border" 
                    style={{ left: `-${24}px`, height: '100%' }}
                >
                    <div className="absolute top-6 left-0 w-4 h-0.5 bg-border" />
                </div>
            )}

            <div className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-all relative overflow-hidden",
                depth === 0 
                  ? "bg-surface-inverse border-surface-inverse-border shadow-xl min-h-[5rem]"
                  : depth === 1 
                    ? "bg-card border-border shadow-sm"
                    : "bg-muted border-transparent",
                "hover:border-primary/40 backdrop-blur-xl mb-2",
                depth !== 0 && "bg-card/60",
                isOverlay && "border-primary bg-card shadow-3xl ring-8 ring-primary/5 scale-[1.02]",
                !isOverlay && depth > 0 && "ml-3"
            )}>
                <div className="flex items-center gap-5 relative z-10 w-full">
                    <div
                        {...attributes}
                        {...listeners}
                        aria-label={`${item.menuNm} 순서 이동 핸들`}
                        className={cn(
                          "p-2 hover:bg-muted rounded-lg cursor-grab active:cursor-grabbing transition-colors",
                          depth === 0 ? "text-muted-foreground hover:text-surface-inverse-foreground" : "text-muted-foreground hover:text-primary"
                        )}
                    >
                        <GripVertical size={20} />
                    </div>

                    <div className="flex items-center gap-5 flex-1">
                        <div className="flex items-center">
                            {hasChildren && (
                                <button
                                    type="button"
                                    aria-label={`${item.menuNm} 하위 메뉴 ${isExpanded ? '접기' : '펼치기'}`}
                                    aria-expanded={isExpanded}
                                    onClick={(e) => { e.stopPropagation(); onToggle(item.menuNo); }}
                                    className={cn(
                                      "p-2 hover:bg-muted rounded-lg transition-colors mr-2",
                                      depth === 0 ? "text-muted-foreground hover:text-surface-inverse-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    <ChevronRight size={22} className={cn("transition-transform duration-300", isExpanded && "rotate-90")} />
                                </button>
                            )}
                            {!hasChildren && depth < 2 ? <div className="w-10" /> : null}
                            <div className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                depth === 0 ? "bg-card text-foreground" : depth === 1 ? "bg-surface-inverse text-surface-inverse-foreground" : "bg-card text-muted-foreground border border-border shadow-sm"
                            )}>
                                {depth === 0 ? <FolderTree size={20} className="stroke-[2.5]" /> : depth === 1 ? <Layers size={16} /> : <FileCode size={14} />}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className={cn(
                              "font-black tracking-tight transition-colors", 
                              depth === 0 ? "text-surface-inverse-foreground text-base" : depth === 1 ? "text-foreground text-sm" : "text-muted-foreground text-xs"
                            )}>
                                {item.menuNm}
                            </span>
                            <div className="flex items-center gap-3 mt-1">
                                <span className={cn(
                                  "text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest",
                                   depth === 0 ? "bg-white/10 text-surface-inverse-muted" : "bg-muted text-muted-foreground opacity-100"
                                )}>
                                    ID: {item.menuNo}
                                </span>
                                {item.prgrmFileNm && (
                                    <span className={cn(
                                      "text-[10px] flex items-center gap-1 font-black uppercase tracking-widest",
                                       depth === 0 ? "text-muted-foreground" : "text-primary opacity-100"
                                    )}>
                                        <LinkIcon size={10} /> {item.prgrmFileNm}
                                    </span>
                                )}
                                {(item.useYn === 'N') && (
                                    <span className="text-[10px] flex items-center gap-1 font-black uppercase tracking-widest text-rose-500 bg-rose-50 px-2 rounded-md">
                                        비활성
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {depth < 2 && (
                            <Button
                                variant="ghost" size="icon"
                                aria-label={`${item.menuNm} 하위 메뉴 추가`}
                                onClick={() => onCreate(item.menuNo)}
                                className={cn(
                                  "h-9 w-9 rounded-lg",
                                   depth === 0 ? "bg-slate-800 text-slate-300" : "bg-muted hover:bg-primary hover:text-white"
                                )}
                            >
                                <Plus size={14} />
                            </Button>
                        )}
                        <Button
                            variant="ghost" size="icon"
                            aria-label={`${item.menuNm} 수정`}
                            onClick={() => onEdit(item)}
                            className={cn(
                              "h-9 w-9 rounded-lg",
                              depth === 0 ? "bg-slate-800 text-muted-foreground hover:bg-card hover:text-foreground" : "bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground"
                            )}
                        >
                            <Settings size={14} />
                        </Button>
                        <Button
                            variant="ghost" size="icon"
                            aria-label={`${item.menuNm} 삭제`}
                            onClick={() => onDelete(item)}
                            className={cn(
                              "h-9 w-9 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-lg",
                              depth === 0 && "bg-rose-950/30 hover:bg-rose-500"
                            )}
                        >
                            <Trash2 size={14} />
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
/*                                Main Component                              */
/* -------------------------------------------------------------------------- */

export default function MenuAdminClient({
  menusPromise,
  programsPromise
}: {
  menusPromise: Promise<FetchResult<MenuInfo[]>>;
  programsPromise: Promise<FetchResult<ProgramOption[]>>;
}) {
  const { data: initialMenus, error: menusError } = use(menusPromise);
  const { data: programs, error: programsError } = use(programsPromise);
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [isSaving, setIsSaving] = useState(false);
  const [flattenedMenus, setFlattenedMenus] = useState<FlattenedItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // 데이터 초기화
  useEffect(() => {
    // 1. 서버에서 온 평면 데이터를 트리 구조로 변환
    const tree = listToTree(initialMenus);
    // 2. 트리 구조를 다시 DnD용 평면 데이터로 변환 (depth 계산 포함)
    const flat = flattenTree(tree);
    
    setFlattenedMenus(flat);

    const idsWithChildren = flat
        .filter(m => flat.some(child => child.parentId === m.menuNo))
        .map(m => m.menuNo);
    setExpandedIds(new Set(idsWithChildren));
  }, [initialMenus]);

  // 투영(Projection) 정보 계산
  const projected = useMemo(() => {
    if (!activeId || !overId) return null;
    return getProjection(flattenedMenus, activeId, overId, offsetLeft, INDENTATION_WIDTH);
  }, [flattenedMenus, activeId, overId, offsetLeft]);

  // 가시적 메뉴 필터링
  const visibleFlattenedMenus = useMemo(() => {
    const visible: FlattenedItem[] = [];
    const isParentExpanded = (parentId: number | null): boolean => {
        if (parentId === null || parentId === 0) return true;
        if (!expandedIds.has(parentId)) return false;
        const parent = flattenedMenus.find(m => m.menuNo === parentId);
        return isParentExpanded(parent?.parentId ?? null);
    };

    flattenedMenus.forEach(item => {
        if (isParentExpanded(item.parentId)) {
            // 드래그 중인 아이템인 경우 projected depth 적용
            const isDragging = activeId === item.menuNo;
            visible.push({
                ...item,
                depth: isDragging && projected ? projected.depth : item.depth
            });
        }
    });
    return visible;
  }, [flattenedMenus, expandedIds, activeId, projected]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const form = useAppForm(menuSchema, {
    defaultValues: {
      menuNo: 0, menuNm: '', menuOrdr: 0, upperMenuId: 0, prgrmFileNm: '', modernRoute: '', menuExpln: '', useYn: 'Y' as 'Y' | 'N'
    }
  });

  /* -------------------------------------------------------------------------- */
  /*                                Handlers                                    */
  /* -------------------------------------------------------------------------- */

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number);
    setOverId(event.active.id as number);
    setOffsetLeft(0);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    setOffsetLeft(event.delta.x);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id as number ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && projected) {
        setFlattenedMenus((items) => {
            const oldIndex = items.findIndex(m => m.menuNo === active.id);
            const newIndex = items.findIndex(m => m.menuNo === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            
            // 최종 depth와 parentId 반영
            const dragItemIndex = newItems.findIndex(m => m.menuNo === active.id);
            newItems[dragItemIndex] = {
                ...newItems[dragItemIndex],
                depth: projected.depth,
                parentId: projected.parentId
            };
            
            return newItems;
        });
        setHasChanges(true);
        toast('구조가 업데이트되었습니다.', 'info');
    }

    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  };

  const handleToggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenCreate = (parentId: number = 0) => {
    setMode('create');
    form.reset({ menuNo: Date.now(), menuNm: '', menuOrdr: 999, upperMenuId: parentId, prgrmFileNm: '', modernRoute: '', menuExpln: '', useYn: 'Y' as 'Y' | 'N' });
    setIsOpen(true);
  };

  const handleOpenEdit = (menu: MenuInfo) => {
    setMode('edit');
    form.reset({ menuNo: menu.menuNo, menuNm: menu.menuNm, menuOrdr: menu.menuOrdr || 0, upperMenuId: menu.upMenuSn ?? menu.upperMenuId ?? 0, prgrmFileNm: menu.prgrmFileNm || '', modernRoute: menu.modernRoute || '', menuExpln: menu.menuExpln ?? menu.menuDc ?? '', useYn: (menu.useYn || 'Y') as 'Y' | 'N' });
    setIsOpen(true);
  };

  const onFormSubmit = async (values: MenuFormValues) => {
    const res = await saveMenuAction(null, { mode, data: { ...values, upMenuSn: values.upperMenuId } as any });
    if (res.success) { toast(res.message, 'success'); setIsOpen(false); router.refresh(); }
    else { toast(res.message, 'error'); }
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      const submitData = flattenedMenus.map((item, idx) => ({
        menuNo: item.menuNo, menuOrdr: idx + 1, upMenuSn: item.parentId === 0 ? null : item.parentId, menuNm: item.menuNm, prgrmFileNm: item.prgrmFileNm || '', modernRoute: item.modernRoute || '', menuExpln: item.menuExpln ?? item.menuDc ?? '', id: item.menuNo, useYn: item.useYn || 'Y'
      }));
      const res = await updateMenuOrdersAction(submitData as any);
      if (res.success) { toast(res.message, 'success'); setHasChanges(false); router.refresh(); }
      else { toast(res.message, 'error'); }
    } catch (err: any) { console.error(err); toast('저장 중 오류 발생', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (target: FlattenedItem) => {
    const childCount = flattenedMenus.filter(m => m.parentId === target.menuNo).length;
    const isConfirmed = await confirm({
      title: '메뉴 삭제',
      message: `[${target.menuNm}] 메뉴를 삭제하시겠습니까?${childCount > 0 ? ` 하위 메뉴 ${childCount}건이 함께 삭제될 수 있습니다.` : ''} 이 작업은 되돌릴 수 없습니다.`,
      confirmText: '삭제 실행',
      variant: 'destructive'
    });
    if (isConfirmed) {
        const res = await deleteMenuAction(null, target.menuNo);
        if (res.success) { toast(res.message, 'success'); router.refresh(); }
        else { toast(res.message, 'error'); }
    }
  };

  const activeItem = activeId ? flattenedMenus.find(m => m.menuNo === activeId) : null;

  return (
    <div className="space-y-10 pb-24">
      <PageHeader title="시스템 메뉴 아키텍처" breadcrumbs={[{ label: '시스템관리' }, { label: '메뉴 관리' }]} />

      <HubHeader
        title="메뉴" highlight="구조 설계"
        subtitle="항목을 자유롭게 이동하여 시스템 계층 구조를 설계하십시오."
        icon={FolderTree}
        actions={
          <Button onClick={() => handleOpenCreate(0)} size="lg" className="h-10 px-8 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-black text-xs tracking-tight shadow-xl hover:bg-primary transition-all hover:-translate-y-1 gap-2 active:scale-95">
            <Plus size={18} /> 신규 등록
          </Button>
        }
      />

      {/*
        조회 실패를 "데이터 0건"으로 위장하지 않는다. 서버 조회가 실패했으면 그 사실과 사유를 그대로 노출하고
        재시도(서버 컴포넌트 재실행) 수단을 제공한다.
      */}
      {(menusError || programsError) && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border-2 border-destructive/30 bg-destructive/5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive-emphasis" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-black text-destructive-emphasis">데이터를 불러오지 못했습니다</p>
              <p className="text-xs font-semibold text-muted-foreground">
                {menusError ? `메뉴 트리: ${menusError}` : `프로그램 목록: ${programsError}`}
                {menusError ? ' — 아래 트리는 비어 있거나 최신 상태가 아닐 수 있습니다.' : ' — 프로그램 자동완성 후보가 비어 있습니다.'}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => router.refresh()} className="h-10 shrink-0 gap-2 rounded-lg font-bold">
            <RefreshCcw size={16} /> 다시 시도
          </Button>
        </div>
      )}

      <HubMetricGrid>
        <HubMetricCard title="전체 노드" value={flattenedMenus.length} icon={Database} color="primary" />
        <HubMetricCard title="계층 깊이" value={Math.max(...flattenedMenus.map(m => m.depth), 0) + 1} icon={Layers} color="indigo" />
        <HubMetricCard title="라우트 연결" value={flattenedMenus.filter(m => !!m.modernRoute).length} icon={Network} color="emerald" />
        <HubMetricCard title="라우트 미지정" value={flattenedMenus.filter(m => !m.modernRoute).length} icon={Unlink} color="amber" />
      </HubMetricGrid>

      <HubSectionCard
        title="네비게이션 트리"
        description="그립 핸들을 사용하여 순서와 계층을 조정할 수 있습니다."
        icon={SearchCode}
        action={
          <div className="flex gap-3 items-center">
            <div className="flex bg-white/40 backdrop-blur-md p-1 rounded-xl border border-white/60 shadow-sm ring-1 ring-black/5">
              <Button variant="ghost" className="h-8 px-4 text-[10px] font-black tracking-widest hover:bg-white/50" onClick={() => setExpandedIds(new Set(flattenedMenus.map(m => m.menuNo)))}><ChevronsUpDown size={14} className="mr-1.5" /> 전체 펼치기</Button>
              <Button variant="ghost" className="h-8 px-4 text-[10px] font-black tracking-widest hover:bg-white/50" onClick={() => setExpandedIds(new Set())}><ChevronsDownUp size={14} className="mr-1.5" /> 전체 접기</Button>
            </div>
            {hasChanges && (
                <Button onClick={handleSaveChanges} disabled={isSaving} className="bg-emerald-500 text-white hover:bg-emerald-600 h-9 px-5 rounded-lg font-black text-[10px] tracking-widest gap-2 shadow-lg scale-in-center active:scale-95">
                    {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={14} />} 구조 저장
                </Button>
            )}
          </div>
        }
      >
        <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl p-6 ring-1 ring-black/5 min-h-[600px]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={visibleFlattenedMenus.map(m => m.menuNo)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {visibleFlattenedMenus.map((item) => (
                  <SortableMenuNode
                    key={item.menuNo}
                    item={item}
                    depth={item.depth}
                    isSaving={isSaving}
                    onEdit={handleOpenEdit}
                    onCreate={handleOpenCreate}
                    onDelete={handleDelete}
                    onToggle={handleToggleExpand}
                    isExpanded={expandedIds.has(item.menuNo)}
                    hasChildren={flattenedMenus.some(m => m.parentId === item.menuNo)}
                  />
                ))}
              </div>
            </SortableContext>

            {typeof document !== 'undefined' && createPortal(
              <DragOverlay dropAnimation={dropAnimation}>
                {activeId && activeItem ? (
                  <SortableMenuNode
                    item={activeItem}
                    depth={activeItem.depth}
                    isSaving={isSaving}
                    onEdit={() => {}} onCreate={() => {}} onDelete={() => {}} onToggle={() => {}}
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

      <StandardModal
        isOpen={isModalOpen} onClose={() => setIsOpen(false)}
        title={mode === 'create' ? '신규 메뉴 정의' : '메뉴 구성 수정'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-11 rounded-lg font-bold">취소</Button>
            <Button onClick={form.handleSubmit(onFormSubmit)} disabled={form.formState.isSubmitting} className="flex-[2] h-11 rounded-lg bg-primary text-white font-bold shadow-2xl hover:brightness-110 transition-all hover:-translate-y-1 gap-2">
              <Save size={18} /> {mode === 'create' ? '등록 완료' : '수정 완료'}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form className="space-y-6 pt-4">
            <ShadcnFormField
              control={form.control} name="menuNm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground ml-1">메뉴 명칭 *</FormLabel>
                  <FormControl><Input {...field} className="h-11 rounded-lg font-bold px-5" placeholder="메뉴 이름 입력" /></FormControl>
                  <FormMessage className="text-xs font-bold text-rose-600 ml-1" />
                </FormItem>
              )}
            />
            {/*
              라우트·설명 입력이 아예 없어서, 신규 등록한 메뉴는 클릭해도 이동하지 않는 죽은 메뉴가 됐고
              설명(menu_expln)은 화면에서 채울 방법 자체가 없었다. 두 필드를 노출한다.
            */}
            <ShadcnFormField
              control={form.control} name="modernRoute"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground ml-1">연결 라우트</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      className="h-11 rounded-lg font-bold px-5"
                      placeholder="/admin/system/menus 형식으로 입력 (비우면 그룹 노드)"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-rose-600 ml-1" />
                </FormItem>
              )}
            />
            {/* 서버에서 받아온 프로그램 목록을 자동완성 후보로 소비한다(연결 프로그램 미입력 시 그룹 노드). */}
            <ShadcnFormField
              control={form.control} name="prgrmFileNm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground ml-1">연결 프로그램</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      list="menu-program-options"
                      className="h-11 rounded-lg font-bold px-5"
                      placeholder="프로그램 파일명을 선택하거나 입력 (선택)"
                    />
                  </FormControl>
                  <datalist id="menu-program-options">
                    {programs
                      .filter((p) => !!p.prgrmFileNm)
                      .map((p) => (
                        <option key={p.prgrmFileNm} value={p.prgrmFileNm}>
                          {p.prgrmKornNm ?? ''}
                        </option>
                      ))}
                  </datalist>
                  <FormMessage className="text-xs font-bold text-rose-600 ml-1" />
                </FormItem>
              )}
            />
            <ShadcnFormField
              control={form.control} name="menuExpln"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground ml-1">메뉴 설명</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={2}
                      className="rounded-lg font-semibold px-5 py-3"
                      placeholder="메뉴의 용도를 입력합니다 (선택)"
                    />
                  </FormControl>
                  <FormMessage className="text-xs font-bold text-rose-600 ml-1" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-6">
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground ml-1">상위 노드</FormLabel>
                  <div className="h-11 rounded-lg border-2 border-border flex items-center px-5 text-xs font-bold bg-muted/50 text-muted-foreground">
                    {form.getValues('upperMenuId') === 0 ? '최상위(루트)' : `상위 메뉴 ID ${form.getValues('upperMenuId')}`}
                  </div>
                </FormItem>
                <ShadcnFormField
                  control={form.control} name="menuOrdr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground ml-1">정렬 순서 *</FormLabel>
                      <FormControl><Input {...field} type="number" onChange={e => field.onChange(Number(e.target.value))} className="h-11 rounded-lg font-bold px-5" /></FormControl>
                      <FormMessage className="text-xs font-bold text-rose-600 ml-1" />
                    </FormItem>
                  )}
                />
            </div>
            <ShadcnFormField
              control={form.control} name="useYn"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2 p-4 bg-muted/50 rounded-xl border border-border">
                  <FormLabel className="text-xs font-bold text-foreground ml-1">상태 설정 (사용 여부)</FormLabel>
                  <FormControl>
                    <div className="flex gap-4 items-center">
                      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                        <input type="radio" aria-label="활성화 (Y)" className="w-4 h-4 text-primary focus:ring-primary accent-primary" 
                               checked={field.value === 'Y'} 
                               onChange={() => field.onChange('Y')} />
                        활성화 (Y)
                      </label>
                      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer text-muted-foreground">
                        <input type="radio" aria-label="비활성화 (N)" className="w-4 h-4 text-primary focus:ring-primary accent-primary" 
                               checked={field.value === 'N'} 
                               onChange={() => field.onChange('N')} />
                        비활성화 (N)
                      </label>
                    </div>
                  </FormControl>
                  <p className="text-[10px] text-muted-foreground font-medium ml-1">비활성화 시 일반 사용자 화면의 메뉴 트리에서 노출되지 않습니다.</p>
                  <FormMessage className="text-xs font-bold text-rose-600 ml-1" />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </StandardModal>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={cn("animate-spin", className)} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
