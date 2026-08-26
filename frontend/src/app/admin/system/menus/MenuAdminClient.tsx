'use client';

import { useState, useEffect, useMemo, use, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MasterDetailPage } from '@/app/components/patterns/master-detail-page';
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
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  GripVertical,
  AlertTriangle,
  RefreshCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { saveMenuAction, updateMenuOrdersAction, deleteMenuAction } from '@/app/actions/menuActions';
import { menuSchema } from '@/lib/validation/schemas';
import { Textarea } from '@/components/ui/textarea';
import { useAppForm } from '@/hooks/useAppForm';
import {
  Form,
  FormControl,
  FormErrorSummary,
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

const menuValidationLabels: Record<string, string> = {
  menuNm: '메뉴 명칭',
  modernRoute: '연결 라우트',
  prgrmFileNm: '연결 프로그램',
  menuExpln: '메뉴 설명',
  menuOrdr: '정렬 순서',
  useYn: '사용 여부',
};

const MENU_EDITOR_FORM_ID = 'menu-editor-form';

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
    onToggle: (id: number) => void;
    onSelect: (item: FlattenedItem) => void;
    isSelected: boolean;
    isExpanded: boolean;
    hasChildren: boolean;
    isTabStop: boolean;
    dragDisabled?: boolean;
    isOverlay?: boolean;
}

const SortableMenuNode = ({ 
    item, 
    depth, 
    onToggle,
    onSelect,
    isSelected,
    isExpanded,
    hasChildren,
    isTabStop,
    dragDisabled = false,
    isOverlay = false
}: SortableMenuNodeProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.menuNo, disabled: dragDisabled });

    const style = {
        transform: isOverlay ? undefined : CSS.Translate.toString(transform),
        transition: isOverlay ? undefined : (transition || 'transform 200ms ease, margin-left 200ms ease'),
        marginLeft: isOverlay ? 0 : `${depth * INDENTATION_WIDTH}px`,
    };

    const content = (
        <div className={cn(
            "group relative select-none",
            isDragging && !isOverlay && "opacity-40",
            isOverlay && "pointer-events-none z-[9999] shadow-xl",
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
                "mb-1 flex min-w-0 items-center gap-1 rounded-md border border-transparent p-1",
                isSelected && !isOverlay && "border-primary/30 bg-primary/10",
                !isSelected && "hover:border-border hover:bg-muted",
                isOverlay && "border-primary bg-card",
                !isOverlay && depth > 0 && "ml-2",
            )}>
                    <button
                        type="button"
                        {...attributes}
                        {...listeners}
                        disabled={dragDisabled}
                        aria-label={`${item.menuNm} 순서 이동 핸들`}
                        title={dragDisabled ? '검색 중에는 순서와 계층을 변경할 수 없습니다.' : undefined}
                        className="shrink-0 cursor-grab rounded p-2 text-muted-foreground hover:bg-card hover:text-foreground active:cursor-grabbing"
                    >
                        <GripVertical size={16} aria-hidden="true" />
                    </button>

                            {hasChildren && (
                                <button
                                    type="button"
                                    aria-label={`${item.menuNm} 하위 메뉴 ${isExpanded ? '접기' : '펼치기'}`}
                                    aria-expanded={isExpanded}
                                    onClick={(e) => { e.stopPropagation(); onToggle(item.menuNo); }}
                                    className="shrink-0 rounded p-2 text-muted-foreground hover:bg-card hover:text-foreground"
                                >
                                    <ChevronRight size={16} aria-hidden="true" className={cn("transition-transform", isExpanded && "rotate-90")} />
                                </button>
                            )}

                    <button
                        type="button"
                        data-a2-master-item={isOverlay ? undefined : ''}
                        aria-current={isSelected ? 'true' : undefined}
                        tabIndex={isTabStop ? 0 : -1}
                        onClick={() => onSelect(item)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded px-2 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                            {depth === 0 ? <FolderTree size={16} aria-hidden="true" /> : depth === 1 ? <Layers size={15} aria-hidden="true" /> : <FileCode size={14} aria-hidden="true" />}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">{item.menuNm}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                                ID: {item.menuNo}{item.prgrmFileNm ? ` · ${item.prgrmFileNm}` : ''}
                            </span>
                        </span>
                        {item.useYn === 'N' && (
                            <span className="shrink-0 rounded bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">미사용</span>
                        )}
                    </button>
            </div>
        </div>
    );

    return (
        <div 
            ref={setNodeRef} 
            style={style}
            aria-hidden={isOverlay ? true : undefined}
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
  const hierarchySavePendingRef = useRef(false);
  const deletePendingRef = useRef(false);
  const [deletingMenuId, setDeletingMenuId] = useState<number | null>(null);
  const [flattenedMenus, setFlattenedMenus] = useState<FlattenedItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [menuKeyword, setMenuKeyword] = useState('');

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
    setSelectedMenuId((current) => current && flat.some((menu) => menu.menuNo === current) ? current : null);
  }, [initialMenus]);

  // 투영(Projection) 정보 계산
  const projected = useMemo(() => {
    if (!activeId || !overId) return null;
    return getProjection(flattenedMenus, activeId, overId, offsetLeft, INDENTATION_WIDTH);
  }, [flattenedMenus, activeId, overId, offsetLeft]);

  // 가시적 메뉴 필터링
  const visibleFlattenedMenus = useMemo(() => {
    const normalizedKeyword = menuKeyword.trim().toLocaleLowerCase('ko-KR');
    if (normalizedKeyword) {
      const includedIds = new Set<number>();
      const includeWithAncestors = (item: FlattenedItem) => {
        includedIds.add(item.menuNo);
        let parentId = item.parentId;
        const visitedIds = new Set<number>();
        while (parentId && parentId !== 0 && !visitedIds.has(parentId)) {
          visitedIds.add(parentId);
          includedIds.add(parentId);
          parentId = flattenedMenus.find((candidate) => candidate.menuNo === parentId)?.parentId ?? null;
        }
      };

      flattenedMenus.forEach((item) => {
        const searchable = [item.menuNm, item.menuNo, item.modernRoute, item.prgrmFileNm]
          .filter((value) => value !== undefined && value !== null)
          .join(' ')
          .toLocaleLowerCase('ko-KR');
        if (searchable.includes(normalizedKeyword)) includeWithAncestors(item);
      });

      return flattenedMenus.filter((item) => includedIds.has(item.menuNo));
    }

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
  }, [flattenedMenus, expandedIds, activeId, menuKeyword, projected]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [isModalOpen, setIsOpen] = useState(false);
  const [isModalSaving, setIsModalSaving] = useState(false);
  const modalSavePendingRef = useRef(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const form = useAppForm<typeof menuSchema, MenuFormValues>(menuSchema, {
    defaultValues: {
      menuNm: '', menuOrdr: 0, upperMenuId: 0, prgrmFileNm: '', modernRoute: '', menuExpln: '', useYn: 'Y' as 'Y' | 'N'
    }
  });

  /* -------------------------------------------------------------------------- */
  /*                                Handlers                                    */
  /* -------------------------------------------------------------------------- */

  const handleDragStart = (event: DragStartEvent) => {
    if (hierarchySavePendingRef.current || isSaving) return;
    setActiveId(event.active.id as number);
    setSelectedMenuId(event.active.id as number);
    setOverId(event.active.id as number);
    setOffsetLeft(0);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (hierarchySavePendingRef.current || isSaving) return;
    setOffsetLeft(event.delta.x);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (hierarchySavePendingRef.current || isSaving) return;
    setOverId(event.over?.id as number ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (hierarchySavePendingRef.current || isSaving) {
      setActiveId(null);
      setOverId(null);
      setOffsetLeft(0);
      return;
    }
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
    setSelectedMenuId(null);
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenCreate = (parentId: number = 0) => {
    if (hierarchySavePendingRef.current || deletePendingRef.current || modalSavePendingRef.current) return;
    setMode('create');
    form.reset({ menuNm: '', menuOrdr: 999, upperMenuId: parentId, prgrmFileNm: '', modernRoute: '', menuExpln: '', useYn: 'Y' as 'Y' | 'N' });
    setIsOpen(true);
  };

  const handleOpenEdit = (menu: MenuInfo) => {
    if (hierarchySavePendingRef.current || deletePendingRef.current || modalSavePendingRef.current) return;
    setSelectedMenuId(menu.menuNo);
    setMode('edit');
    form.reset({ menuNo: menu.menuNo, menuNm: menu.menuNm, menuOrdr: menu.menuOrdr || 0, upperMenuId: menu.upMenuSn ?? menu.upperMenuId ?? 0, prgrmFileNm: menu.prgrmFileNm || '', modernRoute: menu.modernRoute || '', menuExpln: menu.menuExpln ?? menu.menuDc ?? '', useYn: (menu.useYn || 'Y') as 'Y' | 'N' });
    setIsOpen(true);
  };

  const onFormSubmit = async (values: MenuFormValues) => {
    if (modalSavePendingRef.current || hierarchySavePendingRef.current || deletePendingRef.current) return;
    modalSavePendingRef.current = true;
    setIsModalSaving(true);
    try {
      const res = await saveMenuAction(null, { mode, data: { ...values, upMenuSn: values.upperMenuId } as any });
      if (res.success) {
        toast(res.message, 'success');
        setIsOpen(false);
        router.refresh();
      } else if (res.fieldErrors) {
        form.applyServerErrors({
          response: {
            data: {
              errors: Object.entries(res.fieldErrors).map(([field, message]) => ({ field, message })),
            },
          },
        });
      } else {
        toast(res.message, 'error');
      }
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast(error instanceof Error ? error.message : '메뉴 저장 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      modalSavePendingRef.current = false;
      setIsModalSaving(false);
    }
  };

  const handleCloseModal = () => {
    if (modalSavePendingRef.current || hierarchySavePendingRef.current || deletePendingRef.current) return;
    setIsOpen(false);
  };

  const handleSaveChanges = async () => {
    if (
      hierarchySavePendingRef.current
      || modalSavePendingRef.current
      || deletePendingRef.current
      || !hasChanges
      || isSaving
      || isModalOpen
    ) return;
    hierarchySavePendingRef.current = true;
    try {
      setIsSaving(true);
      const submitData = flattenedMenus.map((item, idx) => ({
        menuNo: item.menuNo, menuOrdr: idx + 1, upMenuSn: item.parentId === 0 ? null : item.parentId, menuNm: item.menuNm, prgrmFileNm: item.prgrmFileNm || '', modernRoute: item.modernRoute || '', menuExpln: item.menuExpln ?? item.menuDc ?? '', id: item.menuNo, useYn: item.useYn || 'Y'
      }));
      const res = await updateMenuOrdersAction(submitData as any);
      if (res.success) { toast(res.message, 'success'); setHasChanges(false); router.refresh(); }
      else { toast(res.message, 'error'); }
    } catch { toast('저장 중 오류 발생', 'error'); }
    finally {
      hierarchySavePendingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async (target: FlattenedItem) => {
    if (deletePendingRef.current || hierarchySavePendingRef.current || modalSavePendingRef.current) return;
    deletePendingRef.current = true;
    setDeletingMenuId(target.menuNo);
    const childCount = flattenedMenus.filter(m => m.parentId === target.menuNo).length;
    try {
      const isConfirmed = await confirm({
        title: '메뉴 삭제',
        message: `[${target.menuNm}] 메뉴를 삭제하시겠습니까?${childCount > 0 ? ` 하위 메뉴 ${childCount}건이 함께 삭제될 수 있습니다.` : ''} 이 작업은 되돌릴 수 없습니다.`,
        confirmText: '삭제 실행',
        variant: 'destructive'
      });
      if (!isConfirmed) return;

        const res = await deleteMenuAction(null, target.menuNo);
        if (res.success) {
          toast(res.message, 'success');
          if (selectedMenuId === target.menuNo) setSelectedMenuId(null);
          router.refresh();
        }
        else { toast(res.message, 'error'); }
    } catch {
      toast('메뉴 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
      deletePendingRef.current = false;
      setDeletingMenuId(null);
    }
  };

  const activeItem = activeId ? flattenedMenus.find(m => m.menuNo === activeId) : null;
  const selectedMenu = selectedMenuId
    && visibleFlattenedMenus.some((menu) => menu.menuNo === selectedMenuId)
    ? flattenedMenus.find((menu) => menu.menuNo === selectedMenuId) ?? null
    : null;

  return (
    <div className="pb-24">
      <MasterDetailPage
        title="시스템 메뉴 관리"
        description="메뉴 계층을 선택해 연결 경로와 사용 상태를 확인하고 편집합니다."
        breadcrumbItems={[{ label: '시스템 관리' }, { label: '메뉴 관리' }]}
        actions={
          <Button onClick={() => handleOpenCreate(0)} className="h-10 gap-2 font-semibold">
            <Plus size={16} aria-hidden="true" /> 신규 메뉴 등록
          </Button>
        }
        notice={(menusError || programsError) ? (
          <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive-emphasis" aria-hidden="true" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-destructive-emphasis">데이터를 불러오지 못했습니다</p>
                <p className="text-xs text-muted-foreground">
                  {menusError ? `메뉴 트리: ${menusError}` : `프로그램 목록: ${programsError}`}
                  {menusError ? ' — 아래 트리는 비어 있거나 최신 상태가 아닐 수 있습니다.' : ' — 프로그램 자동완성 후보가 비어 있습니다.'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.refresh()} className="h-10 shrink-0 gap-2 font-semibold">
              <RefreshCcw size={16} aria-hidden="true" /> 다시 시도
            </Button>
          </div>
        ) : undefined}
        masterTitle="네비게이션 트리"
        masterDescription={`전체 ${flattenedMenus.length.toLocaleString()}개 메뉴 · 그립 핸들로 순서와 상하 관계를 변경합니다.`}
        masterTools={
          <>
            <Button variant="outline" size="sm" aria-label="전체 메뉴 펼치기" onClick={() => {
              setSelectedMenuId(null);
              setExpandedIds(new Set(flattenedMenus.map(m => m.menuNo)));
            }}>
              <ChevronsUpDown size={14} aria-hidden="true" />
            </Button>
            <Button variant="outline" size="sm" aria-label="전체 메뉴 접기" onClick={() => {
              setSelectedMenuId(null);
              setExpandedIds(new Set());
            }}>
              <ChevronsDownUp size={14} aria-hidden="true" />
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={!hasChanges || !selectedMenu || isSaving || isModalOpen || deletingMenuId !== null}
              aria-busy={isSaving || undefined}
              size="sm"
              className="gap-2"
            >
              {isSaving ? <Loader2 className="size-4" /> : <Save size={14} aria-hidden="true" />}
              {isSaving ? '구조 저장 중…' : '구조 저장'}
            </Button>
          </>
        }
        master={(
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="메뉴 검색"
                value={menuKeyword}
                onChange={(event) => {
                  setMenuKeyword(event.target.value);
                  setSelectedMenuId(null);
                }}
                placeholder="메뉴 이름·ID·라우트 검색"
                className="h-10 pl-9"
              />
            </div>
            {menuKeyword.trim() && (
              <p aria-live="polite" className="text-xs text-muted-foreground">
                검색 결과 {visibleFlattenedMenus.length.toLocaleString()}개
              </p>
            )}
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
                {visibleFlattenedMenus.map((item, index) => (
                  <SortableMenuNode
                    key={item.menuNo}
                    item={item}
                    depth={item.depth}
                    onToggle={handleToggleExpand}
                    onSelect={(menu) => setSelectedMenuId(menu.menuNo)}
                    isSelected={selectedMenuId === item.menuNo}
                    isTabStop={selectedMenuId === item.menuNo || (selectedMenuId === null && index === 0)}
                    isExpanded={expandedIds.has(item.menuNo)}
                    hasChildren={flattenedMenus.some(m => m.parentId === item.menuNo)}
                    dragDisabled={Boolean(menuKeyword.trim()) || isSaving || deletingMenuId !== null || isModalSaving}
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
                    onToggle={() => {}}
                    onSelect={() => {}}
                    isSelected={false}
                    isTabStop={false}
                    isExpanded={false} hasChildren={false}
                    dragDisabled
                    isOverlay
                  />
                ) : null}
              </DragOverlay>,
              document.body
            )}
          </DndContext>
          {visibleFlattenedMenus.length === 0 && (
            <p role="status" className="py-10 text-center text-sm text-muted-foreground">
              {menuKeyword.trim() ? '검색 조건에 맞는 메뉴가 없습니다.' : '등록된 메뉴가 없습니다.'}
            </p>
          )}
          </div>
        )}
        selectedItemLabel={selectedMenu?.menuNm}
        detailTitle="메뉴 상세"
        detailDescription={selectedMenu ? `메뉴 ID ${selectedMenu.menuNo}` : undefined}
        detailActions={selectedMenu ? (
          <>
            {selectedMenu.depth < 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenCreate(selectedMenu.menuNo)}
                disabled={isSaving || deletingMenuId !== null || isModalSaving}
                className="gap-2"
              >
                <Plus size={14} aria-hidden="true" /> 하위 메뉴 추가
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEdit(selectedMenu)}
              disabled={isSaving || deletingMenuId !== null || isModalSaving}
              className="gap-2"
            >
              <Settings size={14} aria-hidden="true" /> 메뉴 수정
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(selectedMenu)}
              disabled={deletingMenuId !== null || isSaving || isModalSaving}
              aria-busy={deletingMenuId === selectedMenu.menuNo || undefined}
              className="gap-2"
            >
              {deletingMenuId === selectedMenu.menuNo
                ? <><Loader2 className="size-4" /> 메뉴 삭제 중…</>
                : <><Trash2 size={14} aria-hidden="true" /> 메뉴 삭제</>}
            </Button>
          </>
        ) : undefined}
        detail={selectedMenu ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <dt className="text-xs font-semibold text-muted-foreground">메뉴 ID</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">{selectedMenu.menuNo}</dd>
            </div>
            <div className="rounded-md border border-border p-4">
              <dt className="text-xs font-semibold text-muted-foreground">상위 메뉴</dt>
              <dd className="mt-1 text-sm text-foreground">
                {selectedMenu.parentId
                  ? flattenedMenus.find((menu) => menu.menuNo === selectedMenu.parentId)?.menuNm ?? `ID ${selectedMenu.parentId}`
                  : '최상위'}
              </dd>
            </div>
            <div className="rounded-md border border-border p-4">
              <dt className="text-xs font-semibold text-muted-foreground">연결 라우트</dt>
              <dd className="mt-1 break-all text-sm text-foreground">{selectedMenu.modernRoute || '연결 없음'}</dd>
            </div>
            <div className="rounded-md border border-border p-4">
              <dt className="text-xs font-semibold text-muted-foreground">연결 프로그램</dt>
              <dd className="mt-1 break-all text-sm text-foreground">{selectedMenu.prgrmFileNm || '연결 없음'}</dd>
            </div>
            <div className="rounded-md border border-border p-4">
              <dt className="text-xs font-semibold text-muted-foreground">사용 상태</dt>
              <dd className="mt-1 text-sm text-foreground">{selectedMenu.useYn === 'N' ? '미사용' : '사용'}</dd>
            </div>
            <div className="rounded-md border border-border p-4 sm:col-span-2">
              <dt className="text-xs font-semibold text-muted-foreground">설명</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {selectedMenu.menuExpln ?? selectedMenu.menuDc ?? '등록된 설명이 없습니다.'}
              </dd>
            </div>
          </dl>
        ) : undefined}
        emptyDetailTitle="메뉴를 선택하세요"
        emptyDetailDescription="왼쪽 네비게이션 트리에서 확인하거나 편집할 메뉴를 선택하세요."
        onSaveShortcut={hasChanges ? handleSaveChanges : undefined}
        saveShortcutDisabled={isSaving || isModalOpen}
      />

      <StandardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        closeDisabled={isModalSaving || form.formState.isSubmitting}
        title={mode === 'create' ? '신규 메뉴 정의' : '메뉴 구성 수정'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isModalSaving || form.formState.isSubmitting}
              onClick={handleCloseModal}
              className="flex-1 h-11 rounded-lg font-bold"
            >
              취소
            </Button>
            <Button
              type="submit"
              form={MENU_EDITOR_FORM_ID}
              disabled={isModalSaving || form.formState.isSubmitting}
              aria-busy={(isModalSaving || form.formState.isSubmitting) || undefined}
              className="flex-[2] h-11 rounded-lg bg-primary text-white font-bold shadow-2xl hover:brightness-110 transition-all hover:-translate-y-1 gap-2"
            >
              {isModalSaving || form.formState.isSubmitting ? <Loader2 className="h-4 w-4" /> : <Save size={18} />}
              {isModalSaving || form.formState.isSubmitting
                ? (mode === 'create' ? '등록 중...' : '수정 중...')
                : (mode === 'create' ? '등록 완료' : '수정 완료')}
            </Button>
          </div>
        }
      >
        <Form {...form}>
          <form
            id={MENU_EDITOR_FORM_ID}
            noValidate
            className="space-y-6 pt-4"
            onSubmit={(event) => {
              void form.handleSubmit(onFormSubmit)(event);
            }}
          >
            <FormErrorSummary labels={menuValidationLabels} onNavigate={form.focusError} />
            <ShadcnFormField
              control={form.control} name="menuNm"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold text-foreground ml-1">메뉴 명칭 *</FormLabel>
                  <FormControl><Input {...field} maxLength={100} className="h-11 rounded-lg font-bold px-5" placeholder="메뉴 이름 입력" /></FormControl>
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
                      maxLength={500}
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
                      maxLength={100}
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
                      maxLength={4000}
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
                  <Label className="text-xs font-bold text-foreground ml-1">상위 노드</Label>
                  <div className="h-11 rounded-lg border-2 border-border flex items-center px-5 text-xs font-bold bg-muted/50 text-muted-foreground">
                    {form.getValues('upperMenuId') === 0 ? '최상위(루트)' : `상위 메뉴 ID ${form.getValues('upperMenuId')}`}
                  </div>
                </FormItem>
                <ShadcnFormField
                  control={form.control} name="menuOrdr"
                  required
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground ml-1">정렬 순서 *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step={1}
                          min={-2147483648}
                          max={2147483647}
                          onChange={e => field.onChange(Number(e.target.value))}
                          className="h-11 rounded-lg font-bold px-5"
                        />
                      </FormControl>
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
