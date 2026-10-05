'use client';

/**
 * [2026-10-02 D1] 보드형 메뉴 구조 편집기의 마스터 — 영역(최상위 메뉴) 탭, 2단계 메뉴 카드, 3단계 줄.
 *
 * 선택·옮기기·저장은 MenuAdminClient 가 소유한다. 이 파일은 표시·끌기(dnd-kit 다중 컨테이너)·항목 키보드만 둔다.
 * A2 선택 단위는 영역 머리·카드 머리·줄이다(`data-a2-master-item`, `aria-current`) — 셸이 ↑/↓ 와 Tab→상세를 맡는다.
 *
 * [2026-10-05 시안 밀도 복원] 줄은 한 줄이다 — 손잡이 24px, 아이콘·이름(말줄임)·배지가 줄바꿈 없이 놓이고 높이는 업무 표 행
 * 토큰(`--work-cell-py`)이 정한다(comfortable 32px, compact 28px — 줄 상자 테두리는 높이를 더하지 않는 외곽선이다).
 * 'ID: n' 은 화면에서 빼되 줄의 접근 이름(sr-only)에
 * 남기고, 번호·연결 경로는 title 과 고른 줄의 상세(인스펙터)에서 보인다(헌법 제16조 2항 — 필수 정보를 hover 에만 두지 않는다).
 * 카드는 CSS 다단(columns 14.5rem)으로 빈틈없이 쌓는다 — DOM 은 하나이고(ADR-0006) ↑/↓ 순서(DOM 순)가 열 우선 읽기 순서와 같다.
 * 카드 머리에는 순번과 하위 수, '화면 추가'(+ 아이콘 단추)를 둔다. 놓을 곳은 끄는 동안에도 높이를 바꾸지 않는다(외곽선·배경만
 * 바뀐다) — 끌기를 시작할 때 보드가 밀리지 않는다.
 *
 * [2026-10-05 리뷰 반영]
 * - 줄이 좁아 이름과 배지가 한 줄에 다 들어가지 않으면 배지를 다음 줄로 내린다(flex-wrap). 이름 묶음은 최소 8rem 을 먼저 받고
 *   그 뒤에만 말줄임한다. 종전에는 배지가 줄 밖으로 잘려 숨는 이유·변경 표시가 눈에 보이지 않았다(헌법 제16조 2항). 평소에는
 *   한 줄이다.
 * - 끌기 손잡이는 탭 순서에 하나만 든다(지금 고른 항목 — 없으면 첫 항목 — 의 손잡이, 줄 단추와 같은 로빙). 종전에는 줄마다
 *   손잡이가 탭 순서에 들어 Tab 한 번에 보드를 지나갈 수 없었다. 고른 줄에서 Shift+Tab 으로 그 손잡이에 간다. 카드 머리의 '화면
 *   추가'(+)는 섹션 카드마다 탭 순서에 남긴다 — 섹션 수만큼이고, 키보드로 새 화면을 만드는 유일한 자리다.
 * - 줄의 설명(aria-describedby)은 연결 경로다. title 은 번호·경로를 함께 보이지만 설명으로 쓰이지 않게 한다 — 종전에는 title 이
 *   설명이 되어 접근 이름의 'ID: n' 을 한 번 더 읽었다.
 * - 빈 섹션은 '하위 메뉴가 없습니다' 줄 전체가 섹션 끝 놓을 곳이다 — 포인터로 빈 섹션에 넣을 자리가 6px 띠뿐이었다.
 *
 * [2026-10-05 2차 리뷰 반영 — 보드만 스크롤한다]
 * - 업무면 fill 조건(넓고 높은 화면)에서 보드는 세 칸의 세로 묶음이다: 영역 탭 줄(고정) → 보드(영역 머리·카드, 이 영역만
 *   스크롤) → 상태 줄(고정, 맨 아래). 탭 줄과 상태 줄은 보드와 같은 스크롤에 있지 않아 보드를 내려도 화면에 남고, 결과 안내가
 *   길어져 상태 줄이 커져도 보드의 위쪽(첫 줄 자리)은 움직이지 않는다 — 상태 줄은 보드 아래에서 위로 자란다.
 * - '섹션 추가'·'영역 추가'는 탭 줄이 아니라 영역 머리 줄에 둔다 — 탭 줄에 두면 좁은 창에서 탭 줄이 두세 줄로 접혀 보드를 밀었다.
 * - 영역 탭의 접근 이름은 보이는 글자로 시작한다(WCAG 2.5.3) — '관리 센터 53' 을 보이고 '…53개 하위 메뉴' 로 읽는다.
 * 조건 밖(좁은 화면·낮은 창)에서는 셋이 그대로 쌓이고 마스터 칸이 통째로 스크롤한다(그때 상태 줄은 보드 끝에 있다).
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
import { WORK_FILL_REGION_CLASS } from '@/app/components/patterns/work-fill';
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

/**
 * 보드 스크롤 상자 — fill 조건(work-fill)에서만 남은 높이를 받아 스스로 스크롤한다(MenuAdminClient 가 마스터 칸에 높이 사슬을
 * 잇는다 — masterFillChild). 좌우 4px 는 놓을 곳 표시(ring-2)가 상자 가장자리에서 잘리지 않게 하는 안쪽 여백이고, 같은 만큼
 * 바깥 여백을 당겨 배치는 그대로다. 조건 밖과 인쇄에서는 아무 일도 하지 않는다(마스터 칸이 통째로 스크롤한다).
 */
const BOARD_SCROLL_CLASS = 'work-fill:-mx-1 work-fill:min-h-0 work-fill:flex-1 work-fill:overflow-y-auto work-fill:px-1 work-fill:pt-0.5 print:overflow-visible';

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

/** 영역 탭의 개수 — 평소 하위 메뉴 수, 그룹 미리보기 중에는 보이는 수/하위 수, 찾는 중에는 일치 수. */
export interface MenuBoardAreaCount {
  total: number;
  /** 그룹 미리보기 중 그 그룹 사이드바에 보이는 하위 메뉴 수(미리보기가 아니면 null). */
  shown: number | null;
  /** 찾는 중 그 영역(영역 자신 포함)의 일치 수(찾는 중이 아니면 null). */
  matched: number | null;
}

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
  /** 영역 탭마다 하위 수·보임 수·일치 수. */
  areaCounts: ReadonlyMap<number, MenuBoardAreaCount>;
  /**
   * 보드 아래의 상태 줄(결과 안내·찾기 일치 수·미리보기 요약·잘라내기 띠·도움말). fill 조건에서는 보드 스크롤 밖 맨 아래에
   * 고정되어, 내용이 늘어도 보드의 위쪽을 밀지 않는다.
   */
  statusBar?: React.ReactNode;
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
  /** 끌기를 시작하고 끝낼 때 부른다 — 부르는 쪽이 끄는 동안 초안을 바꾸는 일(Ctrl+Z 되돌리기)을 막는다. */
  onDraggingChange?: (dragging: boolean) => void;
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

/**
 * 배지 하나 — 글자는 줄바꿈하지 않는다(배지 묶음이 통째로 다음 줄로 간다). 줄보다 넓은 배지 하나만 말줄임하고 title 로 온전한
 * 문장을 둔다(같은 문장이 접근 이름과 고른 줄의 상세 그룹별 결과에도 있다).
 */
const BADGE_BASE = 'max-w-full shrink-0 truncate whitespace-nowrap rounded px-1.5 text-xs';

function ItemBadges({ item, view }: { item: FlattenedItem; view: MenuBoardItemView }) {
  return (
    <>
      {/* 조각 사이의 공백은 접근 이름을 낱말로 가른다(눈에 보이는 간격은 gap 이 맡는다). */}
      {item.useYn === 'N' && (
        <>{' '}<span data-item-badge="" className={cn(BADGE_BASE, 'bg-muted font-semibold text-muted-foreground')}>사용 안 함</span></>
      )}
      {view.badges.map((badge) => (
        <React.Fragment key={badge}>
          {' '}
          <span data-item-badge="" className={cn(BADGE_BASE, 'font-semibold', BADGE_TONE[badge])}>
            <span className="sr-only">저장 전 </span>{BADGE_LABEL[badge]}
          </span>
        </React.Fragment>
      ))}
      {view.hiddenReason && (
        <>{' '}<span data-item-badge="" title={view.hiddenReason} className={cn(BADGE_BASE, 'border border-border text-muted-foreground')}>
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
  /** 카드 순번(1, 2, 3…). 보는 사람을 위한 보조 표시라 접근 이름에 넣지 않는다(순서는 DOM 순서가 말한다). */
  seq?: number;
  onSelect: (menuNo: number) => void;
  onKeyDown: (menuNo: number, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  keyShortcuts?: string;
  /** 찾기 불일치·미리보기 그룹에서 숨는 메뉴 — 이름을 보조 글자색으로 낮춘다(대비는 본문 보조 글자와 같게 지킨다). */
  dimmed?: boolean;
}

/**
 * 선택 단위(A2) — 영역 머리·카드 머리·줄이 같은 단추를 쓴다. 평소 한 줄이고, 이름 묶음(순번·아이콘·이름)이 8rem 을 먼저 받은 뒤
 * 남는 자리에 배지가 들어가지 않으면 배지를 다음 줄로 내린다(이름은 그때만 말줄임). 'ID: n' 은 접근 이름에만 두고(sr-only),
 * 번호·연결 경로는 title 로 보이며 고른 줄의 상세가 같은 값을 늘 보인다. 설명(aria-describedby)은 연결 경로다 — 설명을 따로
 * 주지 않으면 브라우저가 title 을 설명으로 써서 이름의 'ID: n' 을 한 번 더 읽는다.
 */
function ItemButton({ item, items, view, isSelected, isTabStop, icon, seq, onSelect, onKeyDown, keyShortcuts, dimmed = false }: ItemButtonProps) {
  const route = (item.modernRoute ?? '').trim();
  const idText = isNewMenu(item.menuNo) ? 'ID: 저장 전' : `ID: ${item.menuNo}`;
  const describedById = useId();
  return (
    <button
      type="button"
      data-a2-master-item=""
      data-menu-no={item.menuNo}
      aria-current={isSelected ? 'true' : undefined}
      aria-keyshortcuts={keyShortcuts}
      aria-describedby={describedById}
      tabIndex={isTabStop ? 0 : -1}
      title={route ? `${idText} · ${route}` : idText}
      onClick={() => onSelect(item.menuNo)}
      onKeyDown={(event) => onKeyDown(item.menuNo, event)}
      className="relative flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded px-1.5 py-[var(--work-cell-py)] text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <span data-item-name="" className="flex min-w-0 grow basis-32 items-center gap-1.5">
        {seq !== undefined && (
          <span aria-hidden="true" data-seq="" className="w-4 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{seq}</span>
        )}
        {icon}
        <span className={cn('min-w-0 truncate whitespace-nowrap text-sm', dimmed ? 'font-normal text-muted-foreground' : 'text-foreground')}>
          {menuLabel(items, item.menuNo)}
        </span>
      </span>
      {' '}
      <span className="sr-only">{idText}</span>
      <ItemBadges item={item} view={view} />
      <span id={describedById} hidden>{route ? `연결 경로 ${route}` : '연결 경로 없음'}</span>
    </button>
  );
}

/**
 * 끌기 손잡이 — 끄는 것은 이 손잡이다(줄을 누르면 선택이다). 크기는 밀도와 무관하게 24px 로 둔다(WCAG 2.5.8 최소 타깃 —
 * 줄 높이를 32px 아래로 두려고 손잡이를 줄였다). ⚠ 밀도 계약(work-screen-grammar-contract ④)의 고정 높이 동결은 `h-*` 만
 * 세고 `size-*` 는 세지 않는다 — 이 손잡이는 그 동결 밖의 의도적 소형이다(2026-10-05 2차 리뷰: 종전 주석은 동결에 올렸다고
 * 잘못 적었다). 크기는 아래 단위 테스트(MenuBoard.layout-contract)가 고정한다. 탭 순서에는 줄 단추와 같은 로빙으로 하나만
 * 든다(dnd-kit 이 주는 tabIndex 0 을 덮어쓴다 — 프로그램으로는 언제든 포커스할 수 있다).
 */
function DragHandle({ name, attributes, listeners, disabled, tabStop }: {
  name: string;
  attributes: ReturnType<typeof useDraggable>['attributes'];
  listeners: ReturnType<typeof useDraggable>['listeners'];
  disabled: boolean;
  tabStop: boolean;
}) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      tabIndex={tabStop ? 0 : -1}
      disabled={disabled}
      aria-label={`${name} 끌어서 옮기기`}
      className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-card hover:text-foreground active:cursor-grabbing"
    >
      <GripVertical size={14} aria-hidden="true" />
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
        // 테두리 대신 안쪽 1px 외곽선이다 — 외곽선은 상자 높이를 더하지 않아 줄 높이가 행 토큰 그대로다(테두리였을 때 위아래
        // 2px 가 더해져 comfortable 34px·compact 30px 였다 — 2026-10-05 2차 리뷰 Chromium 실측).
        'relative flex min-w-0 items-center gap-0.5 rounded-md outline-1 -outline-offset-1 outline-transparent',
        // 흐리게 = 점선 외곽선 + 보조 글자색. 줄 전체 불투명도를 낮추지 않는다 — 고를 수 있는 항목의 글자와 숨는 이유 배지가
        // 본문 대비(4.5:1) 아래로 떨어진다.
        dimmed && 'outline-dashed outline-border',
        button.isSelected && 'bg-primary/10 outline-primary/30',
        !button.isSelected && 'hover:bg-muted hover:outline-border',
        matched && 'ring-1 ring-primary',
        cut && 'outline-dashed outline-primary',
        deletedItem && 'line-through',
        draggable.isDragging && 'opacity-40',
        tone.ring,
        className,
      )}
    >
      <DropLine position={tone.line} />
      {board.movable && (
        <DragHandle name={name} attributes={draggable.attributes} listeners={draggable.listeners} disabled={dragDisabled} tabStop={button.isTabStop} />
      )}
      <ItemButton {...button} dimmed={dimmed} keyShortcuts={board.movable ? 'Alt+ArrowUp Alt+ArrowDown Control+X Control+V' : undefined} />
      {children}
    </div>
  );
}

/**
 * 놓을 곳(영역 끝·섹션 끝). 높이는 끄는 동안에도 같다 — 끄는 동안에는 외곽선과 배경으로만 보인다(종전에는 8px 에서 약 34px 로
 * 커져 끌기를 시작하는 순간 보드가 밀렸다). 섹션 끝은 카드 아래 여백 위에 겹쳐 놓아(absolute) 카드 높이를 늘리지 않는다.
 */
function DropZone({ id, label, className, showLabel = false, children }: {
  id: string;
  label: string;
  className?: string;
  showLabel?: boolean;
  /** 늘 보이는 글자(빈 섹션의 '하위 메뉴가 없습니다'). 있으면 끄는 동안의 라벨 대신 이것을 그린다. */
  children?: React.ReactNode;
}) {
  const board = useBoard();
  const { setNodeRef } = useDroppable({ id });
  const tone = dropTone(board.hover, id);
  const dragging = board.dragging !== null;
  return (
    <div
      ref={setNodeRef}
      data-drop-zone={id}
      title={dragging ? label : undefined}
      className={cn(
        'rounded-md border border-dashed text-center text-xs text-muted-foreground',
        dragging ? 'border-border bg-muted/40' : 'border-transparent',
        tone.ring,
        className,
      )}
    >
      {children ?? (showLabel && dragging && label)}
    </div>
  );
}

/**
 * 탭의 개수 표시 — 보이는 숫자와, 그 숫자 뒤에 붙여 읽는 숨긴 설명. 접근 이름이 보이는 글자('관리 센터 53')로 시작해야 음성으로
 * 보이는 이름을 말해 누를 수 있다(WCAG 2.5.3 — 종전에는 '관리 센터 하위 메뉴 53개' 라 보이는 글자가 이름 안에 이어져 있지
 * 않았다).
 */
function areaCountText(count: MenuBoardAreaCount): { shown: string; suffix: string } {
  if (count.matched !== null) return { shown: count.matched.toLocaleString(), suffix: '개 찾기 일치' };
  if (count.shown !== null) {
    return {
      shown: `${count.shown.toLocaleString()}/${count.total.toLocaleString()}`,
      // 괄호로 붙인다 — 숨긴 글자 앞의 공백은 접근 이름 계산에서 지워져 '2/4— …' 로 붙는다(jsdom 실측). Chrome 은 '2/4 (…)'.
      suffix: `(보이는 메뉴 ${count.shown.toLocaleString()}개, 하위 메뉴 ${count.total.toLocaleString()}개)`,
    };
  }
  return { shown: count.total.toLocaleString(), suffix: '개 하위 메뉴' };
}

function AreaTab({ area, items, selected, count, menuCount, panelId, tabId, onActivate, onKeyDown }: {
  area: FlattenedItem;
  items: readonly FlattenedItem[];
  selected: boolean;
  count: number;
  menuCount: MenuBoardAreaCount;
  panelId: string;
  tabId: string;
  onActivate: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const board = useBoard();
  const dropId = `area-tab:${area.menuNo}`;
  const { setNodeRef } = useDroppable({ id: dropId });
  const tone = dropTone(board.hover, dropId);
  const counted = areaCountText(menuCount);
  const searchHit = menuCount.matched !== null && menuCount.matched > 0;
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
        'relative -mb-px shrink-0 whitespace-nowrap rounded-t-md border border-b-0 px-2.5 py-1 text-sm font-medium',
        selected ? 'border-border bg-card text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
        tone.ring,
      )}
    >
      {menuLabel(items, area.menuNo)}
      {' '}
      <span
        data-area-count=""
        className={cn(
          'ml-0.5 inline-block rounded px-1 text-center text-xs tabular-nums',
          // 미리보기의 '보임/전체' 자리를 늘 잡아 둔다 — 미리보기를 켜고 끌 때 탭 폭이 바뀌어 탭 줄이 접히면 보드가 밀린다.
          'min-w-[5ch]',
          searchHit ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground',
        )}
      >
        {/* 보이는 숫자가 접근 이름에 그대로 이어지고, 설명은 숨긴 글자로 뒤에 붙는다(Chrome 은 화면 밖 요소 앞에 공백을 넣어
            '53 개 하위 메뉴' 로 읽는다 — 보이는 '관리 센터 53' 은 이름 안에 이어진다). */}
        {counted.shown}
        <span className="sr-only">{counted.suffix}</span>
      </span>
      {count > 0 && ' '}
      {count > 0 && (
        <span className="ml-0.5 rounded bg-warning/15 px-1 text-xs font-semibold text-warning-emphasis">
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
    items, deleted, activeArea, onActivateArea, areaChangeCounts, areaCounts, statusBar, selectedMenuNo, onSelect, viewOf,
    searchMatches, cutMenuNo, movable, creatable, locked, onAddArea, onAddSection, onAddScreen, previewDrop, onDrop, onItemKeyDown,
    onDraggingChange,
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
    onDraggingChange?.(false);
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
    onDraggingChange?.(true);
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
        <div data-menu-board="" className={cn('space-y-2', WORK_FILL_REGION_CLASS)}>
          <div className="flex items-end border-b border-border">
            <div role="tablist" aria-label="메뉴 영역" className="flex min-w-0 flex-wrap gap-1">
              {areas.map((candidate, index) => (
                <AreaTab
                  key={candidate.menuNo}
                  area={candidate}
                  items={items}
                  selected={candidate.menuNo === area?.menuNo}
                  count={areaChangeCounts.get(candidate.menuNo) ?? 0}
                  menuCount={areaCounts.get(candidate.menuNo) ?? { total: 0, shown: null, matched: null }}
                  panelId={panelId}
                  tabId={`${baseId}-tab-${candidate.menuNo}`}
                  onActivate={() => onActivateArea(candidate.menuNo)}
                  onKeyDown={(event) => activateBy(event, index)}
                />
              ))}
            </div>
          </div>

          {area ? (
            /*
              fill 조건에서 보드만 스크롤한다(탭 줄·상태 줄은 이 상자 밖에 고정). 스크롤 상자이므로 안쪽 sr-only 를 가두는
              relative 를 두고(scroll-region-containment), 놓을 곳 표시(ring-2)가 상자 가장자리에서 잘리지 않게 안쪽 여백을 둔다.
            */
            <div
              role="tabpanel"
              id={panelId}
              aria-labelledby={`${baseId}-tab-${area.menuNo}`}
              data-menu-board-scroll=""
              className={cn('relative space-y-2', BOARD_SCROLL_CLASS)}
            >
              <AreaHead
                entry={entryProps(area)}
                actions={creatable ? (
                  <span className="flex shrink-0 items-center gap-0.5 pr-0.5">
                    {!deleted.has(area.menuNo) && (
                      <Button type="button" size="xs" variant="ghost" disabled={locked} onClick={() => onAddSection(area.menuNo)}>
                        <Plus aria-hidden="true" />섹션 추가<span className="sr-only">({menuLabel(items, area.menuNo)})</span>
                      </Button>
                    )}
                    <Button type="button" size="xs" variant="ghost" disabled={locked} onClick={onAddArea}>
                      <Plus aria-hidden="true" />영역 추가
                    </Button>
                  </span>
                ) : undefined}
              />
              {cards.length === 0 && (
                <p className="text-sm text-muted-foreground">이 영역에는 아직 2단계 메뉴가 없습니다.</p>
              )}
              <div data-menu-columns="" className="columns-[14.5rem] gap-x-3">
                {cards.map((card, cardIndex) => {
                  const section = isSectionCard(items, card);
                  const rows = areaItems.slice(areaItems.indexOf(card) + 1);
                  const until = rows.findIndex((row) => row.depth <= 1);
                  const children = until < 0 ? rows : rows.slice(0, until);
                  const cardName = menuLabel(items, card.menuNo);
                  return (
                    <section
                      key={card.menuNo}
                      aria-label={`${cardName} ${section ? '섹션' : '화면'}`}
                      data-menu-card={section ? 'section' : 'screen'}
                      className={cn(
                        'relative mb-3 break-inside-avoid rounded-md border border-border bg-card',
                        section ? 'p-1 pb-2.5' : 'p-0.5',
                      )}
                    >
                      <BoardEntry
                        {...entryProps(card)}
                        dropKind="card"
                        seq={cardIndex + 1}
                        icon={section
                          ? <Layers size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                          : <FileCode size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />}
                        className="font-semibold"
                      >
                        {section && (
                          <span data-child-count="" className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">
                            <span aria-hidden="true">{children.length.toLocaleString()}</span>
                            <span className="sr-only">{`하위 ${children.length.toLocaleString()}개`}</span>
                          </span>
                        )}
                        {section && creatable && !deleted.has(card.menuNo) && (
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`${cardName} 아래 화면 추가`}
                            title={`${cardName} 아래 화면 추가`}
                            disabled={locked}
                            onClick={() => onAddScreen(card.menuNo)}
                          >
                            <Plus aria-hidden="true" />
                          </Button>
                        )}
                      </BoardEntry>
                      {section && (
                        <>
                          {children.length > 0 && (
                            <ul className="mt-0.5 space-y-0.5 border-t border-border pt-0.5">
                              {children.map((row) => (
                                <li key={row.menuNo} style={{ marginLeft: `${Math.max(0, row.depth - 2) * 16}px` }}>
                                  <BoardEntry
                                    {...entryProps(row)}
                                    dropKind="row"
                                    icon={<FileCode size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                          {children.length === 0 ? (
                            // 빈 섹션은 안내 줄 전체가 섹션 끝 놓을 곳이다(높이는 끄는 동안에도 같다).
                            <DropZone
                              id={`section-end:${card.menuNo}`}
                              label={`${cardName} 맨 끝에 놓기`}
                              className="mt-0.5 px-1.5 py-1 text-left"
                            >
                              하위 메뉴가 없습니다.
                            </DropZone>
                          ) : (
                            <DropZone
                              id={`section-end:${card.menuNo}`}
                              label={`${cardName} 맨 끝에 놓기`}
                              className="absolute inset-x-1 bottom-0.5 h-1.5"
                            />
                          )}
                        </>
                      )}
                    </section>
                  );
                })}
                <DropZone
                  id={`area-end:${area.menuNo}`}
                  label={`${menuLabel(items, area.menuNo)} 영역 맨 끝에 놓기`}
                  showLabel
                  className="flex h-6 break-inside-avoid items-center justify-center"
                />
              </div>
            </div>
          ) : (
            <div className={cn('space-y-3 py-10 text-center', BOARD_SCROLL_CLASS)}>
              <p className="text-sm text-muted-foreground">등록된 메뉴가 없습니다.</p>
              {creatable && (
                <Button type="button" size="sm" variant="outline" className="gap-1" disabled={locked} onClick={onAddArea}>
                  <Plus size={14} aria-hidden="true" />영역 추가
                </Button>
              )}
            </div>
          )}

          {statusBar}
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

/**
 * 영역 머리 — 영역(최상위 메뉴) 자신을 고르는 선택 단위이자, 놓으면 그 영역 맨 끝(2단계)으로 가는 놓을 곳이다. 오른쪽에 이
 * 영역의 '섹션 추가'와 '영역 추가'를 둔다(actions).
 */
function AreaHead({ entry, actions }: { entry: Omit<EntryProps, 'dropKind' | 'icon'>; actions?: React.ReactNode }) {
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
        'flex min-w-0 items-center gap-1 rounded-md bg-muted/40 px-0.5 outline-1 -outline-offset-1 outline-transparent',
        entry.dimmed && 'outline-dashed outline-border',
        entry.isSelected && 'bg-primary/10 outline-primary/30',
        entry.matched && 'ring-1 ring-primary',
        entry.cut && 'outline-dashed outline-primary',
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
        icon={<FolderTree size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />}
      />
      {actions}
    </div>
  );
}
