'use client';

/**
 * [2026-10-02 D1] 보드형 메뉴 구조 편집기의 마스터 — 영역(최상위 메뉴) 탭, 2단계 메뉴 카드, 3단계 줄.
 *
 * 선택·옮기기·저장은 MenuAdminClient 가 소유한다. 이 파일은 표시·끌기(dnd-kit 다중 컨테이너)·항목 키보드만 둔다.
 * A2 선택 단위는 영역 머리·카드 머리·줄이다(`data-a2-master-item`, `aria-current`) — 셸이 ↑/↓ 와 Tab→상세를 맡는다.
 * 'ID: n' 보조 글자는 메뉴를 번호로 찾는 사람과 행 접근 이름을 위해 남긴다(새 메뉴는 'ID: 저장 전').
 */
import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { FileCode, FolderTree, GripVertical, Layers, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FlattenedItem } from './treeUtils';
import { isNewMenu, menuLabel, type MenuBadgeKind } from './menuDraft';
import {
  boardTargetOf,
  dropPosition,
  dropsInto,
  isSectionCard,
  MENU_BOARD_DND_INSTRUCTIONS,
  menuBoardAnnouncements,
  parseBoardId,
  type BoardDropResult,
  type BoardDropTarget,
} from './menuBoardModel';

const BADGE_LABEL: Record<MenuBadgeKind, string> = {
  new: '새 메뉴',
  deleted: '삭제 예정',
  move: '이동',
  order: '순서',
  edited: '수정',
};

const BADGE_TONE: Record<MenuBadgeKind, string> = {
  new: 'bg-success/15 text-success-emphasis',
  deleted: 'bg-destructive/10 text-destructive-emphasis',
  move: 'bg-primary/10 text-primary',
  order: 'bg-warning/15 text-warning-emphasis',
  edited: 'bg-primary/10 text-primary',
};

/** 끌기 대상·놓을 곳 식별자. 같은 메뉴가 끄는 것(menu:)과 놓을 곳(row:·card:)을 함께 가진다. */
const dragId = (menuNo: number) => `menu:${menuNo}`;

/**
 * 포인터 아래의 놓을 곳 가운데 가장 안쪽(가장 작은) 것. 줄은 카드 안에, 카드는 영역 안에 있다 — 겹치면 안쪽이 이긴다.
 * 포인터가 없으면(키보드 센서) 가장 가까운 곳이다.
 */
const innermostCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  if (within.length === 0) return closestCenter(args);
  const area = (id: UniqueIdentifier) => {
    const rect = args.droppableRects.get(id);
    return rect ? rect.width * rect.height : Number.POSITIVE_INFINITY;
  };
  return [...within].sort((left, right) => area(left.id) - area(right.id));
};

export interface MenuBoardItemView {
  badges: readonly MenuBadgeKind[];
  /** 그룹 미리보기에서 숨는 이유(숨지 않으면 null). */
  hiddenReason: string | null;
}

export interface MenuBoardProps {
  items: readonly FlattenedItem[];
  deleted: ReadonlySet<number>;
  activeArea: number | null;
  onActivateArea: (areaNo: number) => void;
  /** 영역 탭마다 그 영역 안의 변경 수. */
  areaChangeCounts: ReadonlyMap<number, number>;
  selectedMenuNo: number | null;
  onSelect: (menuNo: number) => void;
  viewOf: (menuNo: number) => MenuBoardItemView;
  /** 찾는 중이면 일치 메뉴(아니면 null). 일치는 강조하고 나머지는 흐리게 한다 — 거르지 않는다. */
  searchMatches: ReadonlySet<number> | null;
  cutMenuNo: number | null;
  /** 순서·위치를 바꿀 수 있는가(MENU_UPDATE). 아니면 끌기 손잡이를 두지 않는다. */
  movable: boolean;
  /** 새 메뉴를 만들 수 있는가(MENU_CREATE·MENU_UPDATE). */
  creatable: boolean;
  /** 저장 중 등 잠시 막는다. */
  locked: boolean;
  onAddArea: () => void;
  onAddSection: (areaNo: number) => void;
  onAddScreen: (sectionNo: number) => void;
  /** 놓을 곳에 놓아도 되는가 — 끄는 동안 놓을 자리 표시에 쓴다. */
  previewDrop: (activeNo: number, target: BoardDropTarget) => BoardDropResult;
  onDrop: (activeNo: number, target: BoardDropTarget) => void;
  onItemKeyDown: (menuNo: number, event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

interface DropHover {
  overId: string;
  position: 'before' | 'after';
  result: BoardDropResult;
}

const BoardContext = React.createContext<{
  hover: DropHover | null;
  dragging: number | null;
  movable: boolean;
  locked: boolean;
} | null>(null);

function useBoard() {
  const board = React.useContext(BoardContext);
  if (!board) throw new Error('메뉴 보드 밖에서 보드 항목을 그렸습니다.');
  return board;
}

/**
 * 놓을 곳 표시 — 앞/뒤 선, 안으로 놓기 테두리, 거부 테두리. 안으로인지는 놓을 곳의 종류가 아니라 실제 결과(dropsInto)로
 * 정한다 — 줄을 카드 머리에 끌면 그 카드 안으로 가므로 카드 앞·뒤 선을 그리지 않는다.
 */
function dropTone(hover: DropHover | null, overId: string): { line: 'before' | 'after' | null; ring: string | null } {
  if (!hover || hover.overId !== overId || hover.result.kind === 'none') return { line: null, ring: null };
  if (hover.result.kind === 'reject') return { line: null, ring: 'ring-2 ring-destructive' };
  return dropsInto(hover.result, overId) ? { line: null, ring: 'ring-2 ring-primary' } : { line: hover.position, ring: null };
}

function DropLine({ position }: { position: 'before' | 'after' | null }) {
  if (!position) return null;
  return (
    <span
      aria-hidden="true"
      data-drop-line={position}
      className={cn('pointer-events-none absolute inset-x-1 h-0.5 rounded bg-primary', position === 'before' ? '-top-px' : '-bottom-px')}
    />
  );
}

function ItemBadges({ item, view }: { item: FlattenedItem; view: MenuBoardItemView }) {
  return (
    <>
      {/* 조각 사이의 공백은 접근 이름을 낱말로 가른다(눈에 보이는 간격은 gap 이 맡는다). */}
      {item.useYn === 'N' && (
        <>{' '}<span className="shrink-0 rounded bg-muted px-1.5 text-xs font-semibold text-muted-foreground">사용 안 함</span></>
      )}
      {view.badges.map((badge) => (
        <React.Fragment key={badge}>
          {' '}
          <span className={cn('shrink-0 rounded px-1.5 text-xs font-semibold', BADGE_TONE[badge])}>
            <span className="sr-only">저장 전 </span>{BADGE_LABEL[badge]}
          </span>
        </React.Fragment>
      ))}
      {view.hiddenReason && (
        <>{' '}<span className="shrink-0 rounded border border-border px-1.5 text-xs text-muted-foreground">
          <span className="sr-only">미리보기 그룹에서 숨김: </span>{view.hiddenReason}
        </span></>
      )}
    </>
  );
}

interface ItemButtonProps {
  item: FlattenedItem;
  items: readonly FlattenedItem[];
  view: MenuBoardItemView;
  isSelected: boolean;
  isTabStop: boolean;
  icon: React.ReactNode;
  showRoute?: boolean;
  onSelect: (menuNo: number) => void;
  onKeyDown: (menuNo: number, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  keyShortcuts?: string;
  /** 찾기 불일치·미리보기 그룹에서 숨는 메뉴 — 이름을 보조 글자색으로 낮춘다(대비는 본문 보조 글자와 같게 지킨다). */
  dimmed?: boolean;
}

/** 선택 단위(A2) — 영역 머리·카드 머리·줄이 같은 단추를 쓴다. */
function ItemButton({ item, items, view, isSelected, isTabStop, icon, showRoute = true, onSelect, onKeyDown, keyShortcuts, dimmed = false }: ItemButtonProps) {
  const route = (item.modernRoute ?? '').trim();
  return (
    <button
      type="button"
      data-a2-master-item=""
      data-menu-no={item.menuNo}
      aria-current={isSelected ? 'true' : undefined}
      aria-keyshortcuts={keyShortcuts}
      tabIndex={isTabStop ? 0 : -1}
      onClick={() => onSelect(item.menuNo)}
      onKeyDown={(event) => onKeyDown(item.menuNo, event)}
      className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5 rounded px-1.5 py-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {icon}
      <span className={cn('min-w-0 truncate text-sm', dimmed ? 'font-normal text-muted-foreground' : 'font-medium text-foreground')}>
        {menuLabel(items, item.menuNo)}
      </span>
      {' '}
      <span className="shrink-0 text-xs text-muted-foreground">{isNewMenu(item.menuNo) ? 'ID: 저장 전' : `ID: ${item.menuNo}`}</span>
      <ItemBadges item={item} view={view} />
      {showRoute && route && <>{' '}<span className="w-full min-w-0 truncate text-xs text-muted-foreground">{route}</span></>}
    </button>
  );
}

/** 끌기 손잡이 — 끄는 것은 이 손잡이다(줄을 누르면 선택이다). */
function DragHandle({ name, attributes, listeners, disabled }: {
  name: string;
  attributes: ReturnType<typeof useDraggable>['attributes'];
  listeners: ReturnType<typeof useDraggable>['listeners'];
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      aria-label={`${name} 끌어서 옮기기`}
      className="flex size-[var(--control-h-sm)] shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-card hover:text-foreground active:cursor-grabbing"
    >
      <GripVertical size={16} aria-hidden="true" />
    </button>
  );
}

interface EntryProps extends Omit<ItemButtonProps, 'icon' | 'keyShortcuts'> {
  dropKind: 'row' | 'card';
  icon: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  dimmed: boolean;
  matched: boolean;
  cut: boolean;
  deletedItem: boolean;
}

/** 끌 수 있고 놓을 곳이기도 한 줄·카드 머리. */
function BoardEntry({ dropKind, className, children, dimmed, matched, cut, deletedItem, ...button }: EntryProps) {
  const board = useBoard();
  const { item } = button;
  const dragDisabled = !board.movable || board.locked || deletedItem;
  const draggable = useDraggable({ id: dragId(item.menuNo), disabled: dragDisabled });
  const dropId = `${dropKind}:${item.menuNo}`;
  const droppable = useDroppable({ id: dropId, disabled: board.dragging === item.menuNo });
  const tone = dropTone(board.hover, dropId);
  const setRef = (node: HTMLDivElement | null) => {
    draggable.setNodeRef(node);
    droppable.setNodeRef(node);
  };
  const name = menuLabel(button.items, item.menuNo);
  return (
    <div
      ref={setRef}
      data-menu-entry={dropKind}
      data-search-match={matched ? 'true' : undefined}
      data-dimmed={dimmed ? 'true' : undefined}
      data-cut={cut ? 'true' : undefined}
      className={cn(
        'relative flex min-h-[var(--control-h-sm)] min-w-0 items-start gap-0.5 rounded-md border border-transparent',
        // 흐리게 = 점선 테두리 + 보조 글자색. 줄 전체 불투명도를 낮추지 않는다 — 고를 수 있는 항목의 글자와 숨는 이유 배지가
        // 본문 대비(4.5:1) 아래로 떨어진다.
        dimmed && 'border-dashed border-border',
        button.isSelected && 'border-primary/30 bg-primary/10',
        !button.isSelected && 'hover:border-border hover:bg-muted',
        matched && 'ring-1 ring-primary',
        cut && 'border-dashed border-primary',
        deletedItem && 'line-through',
        draggable.isDragging && 'opacity-40',
        tone.ring,
        className,
      )}
    >
      <DropLine position={tone.line} />
      {board.movable && (
        <DragHandle name={name} attributes={draggable.attributes} listeners={draggable.listeners} disabled={dragDisabled} />
      )}
      <ItemButton {...button} dimmed={dimmed} keyShortcuts={board.movable ? 'Alt+ArrowUp Alt+ArrowDown Control+X Control+V' : undefined} />
      {children}
    </div>
  );
}

/** 놓을 곳(영역 끝·섹션 끝). 끄는 동안에만 글자를 보인다. */
function DropZone({ id, label, className }: { id: string; label: string; className?: string }) {
  const board = useBoard();
  const { setNodeRef } = useDroppable({ id });
  const tone = dropTone(board.hover, id);
  return (
    <div
      ref={setNodeRef}
      data-drop-zone={id}
      className={cn(
        'rounded-md text-center text-xs text-muted-foreground',
        board.dragging !== null ? 'border border-dashed border-border px-2 py-2' : 'h-2',
        tone.ring,
        className,
      )}
    >
      {board.dragging !== null && label}
    </div>
  );
}

function AreaTab({ area, items, selected, count, panelId, tabId, onActivate, onKeyDown }: {
  area: FlattenedItem;
  items: readonly FlattenedItem[];
  selected: boolean;
  count: number;
  panelId: string;
  tabId: string;
  onActivate: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const board = useBoard();
  const dropId = `area-tab:${area.menuNo}`;
  const { setNodeRef } = useDroppable({ id: dropId });
  const tone = dropTone(board.hover, dropId);
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      id={tabId}
      data-area-tab={area.menuNo}
      aria-selected={selected}
      aria-controls={panelId}
      tabIndex={selected ? 0 : -1}
      onClick={onActivate}
      onKeyDown={onKeyDown}
      className={cn(
        '-mb-px rounded-t-md border border-b-0 px-3 py-1.5 text-sm font-medium',
        selected ? 'border-border bg-card text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
        tone.ring,
      )}
    >
      {menuLabel(items, area.menuNo)}
      {count > 0 && ' '}
      {count > 0 && (
        <span className="ml-1 rounded bg-warning/15 px-1.5 text-xs font-semibold text-warning-emphasis">
          {/* 접근 이름은 숨긴 문장 하나로 만든다 — 숫자와 '건 변경' 을 다른 요소로 나누면 Chrome 이 화면 밖(absolute) 요소
              앞뒤에 공백을 넣어 '1 건 변경' 으로 읽는다(jsdom 은 붙여 읽어 단위 테스트로는 보이지 않았다). */}
          <span aria-hidden="true">{count.toLocaleString()}</span>
          <span className="sr-only">{`${count.toLocaleString()}건 변경`}</span>
        </span>
      )}
    </button>
  );
}

export function MenuBoard(props: MenuBoardProps) {
  const {
    items, deleted, activeArea, onActivateArea, areaChangeCounts, selectedMenuNo, onSelect, viewOf, searchMatches,
    cutMenuNo, movable, creatable, locked, onAddArea, onAddSection, onAddScreen, previewDrop, onDrop, onItemKeyDown,
  } = props;
  const baseId = useId();
  const [dragging, setDragging] = useState<number | null>(null);
  const [hover, setHover] = useState<DropHover | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const areas = items.filter((item) => item.depth === 0);
  const area = areas.find((candidate) => candidate.menuNo === activeArea) ?? null;
  const start = area ? items.indexOf(area) : -1;
  let end = start + 1;
  while (start >= 0 && end < items.length && items[end].depth > 0) end += 1;
  const areaItems = start >= 0 ? items.slice(start + 1, end) : [];
  const cards = areaItems.filter((item) => item.depth === 1);
  const panelEntries = area ? [area, ...areaItems] : [];
  const tabStop = panelEntries.some((item) => item.menuNo === selectedMenuNo) ? selectedMenuNo : panelEntries[0]?.menuNo ?? null;

  const nameOf = (id: UniqueIdentifier): string | undefined => {
    const parsed = parseBoardId(id);
    if (!parsed) return undefined;
    const name = menuLabel(items, parsed.menuNo);
    if (parsed.kind === 'section-end') return `${name} 섹션 끝`;
    if (parsed.kind.startsWith('area-')) return `${name} 영역`;
    return name;
  };

  const reset = () => {
    setDragging(null);
    setHover(null);
  };
  const locate = (event: DragMoveEvent | DragEndEvent): { target: BoardDropTarget; overId: string; position: 'before' | 'after' } | null => {
    if (!event.over) return null;
    const position = dropPosition(event.active.rect?.current?.translated ?? null, event.over.rect ?? null);
    const target = boardTargetOf(event.over.id, position);
    return target ? { target, overId: String(event.over.id), position } : null;
  };
  const handleDragStart = (event: DragStartEvent) => {
    const parsed = parseBoardId(event.active.id);
    if (!parsed || locked) return;
    setDragging(parsed.menuNo);
    onSelect(parsed.menuNo);
  };
  const handleDragMove = (event: DragMoveEvent) => {
    if (dragging === null) return;
    const located = locate(event);
    if (!located) {
      setHover(null);
      return;
    }
    if (hover && hover.overId === located.overId && hover.position === located.position) return;
    setHover({ overId: located.overId, position: located.position, result: previewDrop(dragging, located.target) });
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const active = parseBoardId(event.active.id);
    const located = locate(event);
    reset();
    if (!active || !located || locked) return;
    onDrop(active.menuNo, located.target);
  };

  const activateBy = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % areas.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + areas.length) % areas.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = areas.length - 1;
    if (next < 0) return;
    event.preventDefault();
    onActivateArea(areas[next].menuNo);
    document.getElementById(`${baseId}-tab-${areas[next].menuNo}`)?.focus();
  };

  const entryProps = (item: FlattenedItem) => ({
    item,
    items,
    view: viewOf(item.menuNo),
    isSelected: selectedMenuNo === item.menuNo,
    isTabStop: tabStop === item.menuNo,
    onSelect,
    onKeyDown: onItemKeyDown,
    dimmed: (searchMatches !== null && !searchMatches.has(item.menuNo)) || viewOf(item.menuNo).hiddenReason !== null,
    matched: searchMatches?.has(item.menuNo) ?? false,
    cut: cutMenuNo === item.menuNo,
    deletedItem: deleted.has(item.menuNo),
  });

  const draggingItem = dragging === null ? null : items.find((item) => item.menuNo === dragging) ?? null;
  const panelId = `${baseId}-panel`;

  return (
    <BoardContext.Provider value={{ hover, dragging, movable, locked }}>
      <DndContext
        sensors={sensors}
        collisionDetection={innermostCollision}
        accessibility={{
          announcements: menuBoardAnnouncements(nameOf, previewDrop),
          screenReaderInstructions: MENU_BOARD_DND_INSTRUCTIONS,
        }}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragOver={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={reset}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-2 border-b border-border">
            <div role="tablist" aria-label="메뉴 영역" className="flex min-w-0 flex-wrap gap-1">
              {areas.map((candidate, index) => (
                <AreaTab
                  key={candidate.menuNo}
                  area={candidate}
                  items={items}
                  selected={candidate.menuNo === area?.menuNo}
                  count={areaChangeCounts.get(candidate.menuNo) ?? 0}
                  panelId={panelId}
                  tabId={`${baseId}-tab-${candidate.menuNo}`}
                  onActivate={() => onActivateArea(candidate.menuNo)}
                  onKeyDown={(event) => activateBy(event, index)}
                />
              ))}
            </div>
            {creatable && (
              <Button type="button" size="sm" variant="outline" className="mb-1 gap-1" disabled={locked} onClick={onAddArea}>
                <Plus size={14} aria-hidden="true" />영역 추가
              </Button>
            )}
          </div>

          {area ? (
            <div role="tabpanel" id={panelId} aria-labelledby={`${baseId}-tab-${area.menuNo}`} className="space-y-3">
              <AreaHead entry={entryProps(area)} />
              {cards.length === 0 && (
                <p className="text-sm text-muted-foreground">이 영역에는 아직 2단계 메뉴가 없습니다.</p>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
                {cards.map((card) => {
                  const section = isSectionCard(items, card);
                  const rows = areaItems.slice(areaItems.indexOf(card) + 1);
                  const until = rows.findIndex((row) => row.depth <= 1);
                  const children = until < 0 ? rows : rows.slice(0, until);
                  return (
                    <section
                      key={card.menuNo}
                      aria-label={`${menuLabel(items, card.menuNo)} ${section ? '섹션' : '화면'}`}
                      className="space-y-1 rounded-md border border-border bg-card p-2"
                    >
                      <BoardEntry
                        {...entryProps(card)}
                        dropKind="card"
                        icon={section
                          ? <Layers size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />
                          : <FileCode size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />}
                        className="font-semibold"
                      />
                      {section && (
                        <>
                          <ul className="space-y-0.5">
                            {children.map((row) => (
                              <li key={row.menuNo} style={{ marginLeft: `${Math.max(0, row.depth - 2) * 16}px` }}>
                                <BoardEntry
                                  {...entryProps(row)}
                                  dropKind="row"
                                  icon={<FileCode size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />}
                                />
                              </li>
                            ))}
                          </ul>
                          {children.length === 0 && <p className="px-1.5 text-xs text-muted-foreground">하위 메뉴가 없습니다.</p>}
                          <DropZone id={`section-end:${card.menuNo}`} label={`${menuLabel(items, card.menuNo)} 맨 끝에 놓기`} />
                          {creatable && !deleted.has(card.menuNo) && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="w-full justify-start gap-1"
                              disabled={locked}
                              onClick={() => onAddScreen(card.menuNo)}
                            >
                              <Plus size={14} aria-hidden="true" />화면 추가<span className="sr-only">({menuLabel(items, card.menuNo)})</span>
                            </Button>
                          )}
                        </>
                      )}
                    </section>
                  );
                })}
              </div>
              {creatable && !deleted.has(area.menuNo) && (
                <Button type="button" size="sm" variant="outline" className="gap-1" disabled={locked} onClick={() => onAddSection(area.menuNo)}>
                  <Plus size={14} aria-hidden="true" />섹션 추가<span className="sr-only">({menuLabel(items, area.menuNo)})</span>
                </Button>
              )}
              <DropZone id={`area-end:${area.menuNo}`} label={`${menuLabel(items, area.menuNo)} 영역 맨 끝에 놓기`} />
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">등록된 메뉴가 없습니다.</p>
          )}
        </div>

        {typeof document !== 'undefined' && createPortal(
          <DragOverlay>
            {draggingItem ? (
              <div className="pointer-events-none max-w-xs rounded-md border border-primary bg-card px-3 py-2 text-sm shadow-xl">
                <p className="font-medium text-foreground">{menuLabel(items, draggingItem.menuNo)}</p>
                {hover?.result.kind === 'reject' && (
                  <p className="mt-1 text-xs text-destructive-emphasis">{hover.result.reason}</p>
                )}
              </div>
            ) : null}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </BoardContext.Provider>
  );
}

/** 영역 머리 — 영역(최상위 메뉴) 자신을 고르는 선택 단위이자, 놓으면 그 영역 맨 끝(2단계)으로 가는 놓을 곳이다. */
function AreaHead({ entry }: { entry: Omit<EntryProps, 'dropKind' | 'icon'> }) {
  const board = useBoard();
  const dropId = `area-head:${entry.item.menuNo}`;
  const { setNodeRef } = useDroppable({ id: dropId });
  const tone = dropTone(board.hover, dropId);
  return (
    <div
      ref={setNodeRef}
      data-menu-entry="area"
      data-search-match={entry.matched ? 'true' : undefined}
      data-dimmed={entry.dimmed ? 'true' : undefined}
      data-cut={entry.cut ? 'true' : undefined}
      className={cn(
        'flex min-w-0 items-start gap-1 rounded-md border border-transparent bg-muted/40 p-1',
        entry.dimmed && 'border-dashed border-border',
        entry.isSelected && 'border-primary/30 bg-primary/10',
        entry.matched && 'ring-1 ring-primary',
        entry.cut && 'border-dashed border-primary',
        entry.deletedItem && 'line-through',
        tone.ring,
      )}
    >
      <ItemButton
        item={entry.item}
        items={entry.items}
        view={entry.view}
        isSelected={entry.isSelected}
        isTabStop={entry.isTabStop}
        onSelect={entry.onSelect}
        onKeyDown={entry.onKeyDown}
        dimmed={entry.dimmed}
        keyShortcuts={board.movable ? 'Alt+ArrowUp Alt+ArrowDown Control+X Control+V' : undefined}
        icon={<FolderTree size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground" />}
      />
    </div>
  );
}
