'use client';

import React, { Suspense, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';
import {
  WORK_FILL_CONTENT_CLASS,
  WORK_FILL_PANE_CHAIN_CLASS,
  WORK_FILL_PANE_PRINT_CLASS,
  WORK_FILL_ROOT_CLASS,
} from './work-fill';

/**
 * A2 — 마스터-디테일(Master-Detail) archetype 셸.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A2.
 * 이 컴포넌트는 데이터 조회·선택 상태를 소유하지 않고 화면 문법만 고정한다.
 *
 * - 좌측 마스터는 데스크톱에서 고정 폭, 좁은 화면에서는 상세 위에 한 번만 렌더된다.
 * - 선택 항목은 소비자가 `data-a2-master-item`과 `aria-current="true"`를 선언한다.
 * - 마스터 항목에 포커스가 있을 때 ↑/↓로 이전·다음 항목을 선택한다.
 * - 저장 가능한 화면은 onSaveShortcut을 넘겨 Ctrl/Cmd+S를 같은 동작에 연결한다. 기본은 선택된 상세가 있을 때만
 *   실행하고, 선택과 무관한 저장(구조 저장 등)은 saveShortcutScope="page"로 연다.
 *
 * 선택 식별자의 URL 복원은 화면별 typed allowlist가 소유한다. 셸이 임의 query 이름이나
 * 민감 식별자를 정하면 프론트엔드 헌법 제4조의 화면별 상태 경계를 침범하기 때문이다.
 */
export interface MasterDetailPageProps {
  /** 화면 제목. 기본은 h1이며, 상위 허브가 h1을 소유한 활성 패널에서만 h2를 쓴다. */
  title: string;
  headingLevel?: 1 | 2;
  /** 과업 범위·편집 대상을 설명하는 한 줄. 마케팅 문구를 넣지 않는다. */
  description?: string;
  /** 권한·상태상 실제로 실행 가능한 주요 액션. */
  actions?: React.ReactNode;
  /** 같은 관리 영역 안의 route/tab 전환. */
  navigation?: React.ReactNode;
  /** 조회 실패·부분 실패처럼 마스터와 상세 모두에 영향을 주는 상태. */
  notice?: React.ReactNode;
  masterTitle: string;
  masterDescription?: string;
  /** 검색·펼치기·새로고침처럼 마스터 모집단에 적용되는 도구. */
  masterTools?: React.ReactNode;
  master: React.ReactNode;
  /** 선택된 항목의 이름. 없으면 detailTitle을 쓴다. */
  selectedItemLabel?: string;
  detailTitle?: string;
  detailDescription?: string;
  detailActions?: React.ReactNode;
  /** 선택된 항목이 있을 때의 상세 본문. */
  detail?: React.ReactNode;
  emptyDetailTitle?: string;
  emptyDetailDescription?: string;
  /** 화면이 가진 실제 저장 동작. 미지정이면 단축키를 등록하지 않는다. */
  onSaveShortcut?: () => void | Promise<void>;
  saveShortcutDisabled?: boolean;
  /**
   * 저장 단축키가 무엇을 저장하는가. 'detail'(기본)은 선택한 항목의 상세 편집이라 선택된 상세가 있을 때만 실행한다.
   * 'page' 는 선택과 무관한 저장(예: 메뉴 구조 저장 — 여러 항목의 순서·계층 초안)이라 상세가 없어도 실행한다.
   * 어느 쪽이든 실행 여부는 onSaveShortcut 지정과 saveShortcutDisabled 가 정한다.
   */
  saveShortcutScope?: 'detail' | 'page';
  /**
   * 마스터와 상세의 폭 배분. 'default'(기본)는 좁은 목록 + 넓은 상세다(목록에서 골라 상세를 편집한다).
   * 'wide' 는 넓은 마스터 + 좁은 상세다 — 마스터 자체가 작업 대상(예: 메뉴 구조 보드)이고 상세는 고른 항목의 속성 칸이다.
   */
  masterSize?: 'default' | 'wide';
  /**
   * [2026-10-05] 업무면 fill 셸(카탈로그 §4 'fill 셸'). true 이면 넓고 높은 화면(globals.css 의 `work-fill` 변형 —
   * 폭 lg 이상 · 높이 600px 이상 · screen)에서 셸 루트가 화면에 맞는 높이(`--work-fill-height`)의 세로 flex 가 되고,
   * 마스터·상세 작업 영역이 남은 높이를 채운다(70vh 대신). 페이지는 스크롤하지 않고 마스터·상세 칸이 각자 스크롤한다.
   * 그 조건 밖에서는 기본(false)과 같은 배치·높이이고, 인쇄에서는 높이 제한 없이 펼친다. 기본값은 false — 다른 화면과
   * 시각 회귀 기준선을 바꾸지 않는다. 쓰는 화면은 셸 아래에 다른 블록·하단 여백(pb-*)을 두지 않는다.
   * 창이 낮아 작업 영역이 바닥값(A2 는 22rem — 아래 WORK_FILL_LAYOUT_CLASS)보다 작아지면 셸이 늘어나 페이지가 스크롤한다
   * (푸터를 덮지 않는다 — work-fill.ts). 조건 안에서는 머리·칸 여백도 줄인다(WORK_FILL_PANE_* — 칸 도구는 줄바꿈하지 않는다).
   * 루트는 `data-work-fill` 표지를 달아, 같은 조건에서 화면 아래 푸터를 숨기고 그 몫(5rem)만큼 셸을 늘린다(globals.css).
   */
  fill?: boolean;
  /**
   * [2026-10-05] fill 셸에서 마스터 칸이 직계 자식에게 남은 높이를 넘긴다(칸이 세로 flex 가 된다). 칸 안에 표·권한 상자처럼
   * 자기 스크롤 영역을 가진 내용을 둘 때 쓴다 — 직계 자식은 `WORK_FILL_REGION_CLASS`(중간 고리)이거나 fill 스크롤 상자여야
   * 한다. 칸의 스크롤은 그대로 두어 사슬이 끊겨도 칸이 스크롤한다. `fill` 이 false 면 아무 일도 하지 않는다.
   */
  masterFillChild?: boolean;
  /** [2026-10-05] masterFillChild 와 같다 — 상세 칸. */
  detailFillChild?: boolean;
  showBreadcrumb?: boolean;
  breadcrumbItems?: { label: string; href?: string }[];
  className?: string;
}

const MASTER_ITEM_SELECTOR = '[data-a2-master-item]:not([disabled])';

/**
 * fill 셸에서 마스터·상세 작업 영역이 남은 높이를 받는다 — 기본의 `lg:h-[min(70vh,48rem)]`·`min-h-[32rem]` 을 work-fill 조건
 * 안에서만 덮는다(조건 밖은 기본과 같다). 남은 높이·안전판은 공용 작업 영역 클래스가 정하고(WORK_FILL_CONTENT_CLASS), 여기서는
 * 기본 높이를 풀고 바닥값을 A2 에 맞게 올린다. 인쇄에서는 높이를 풀어 두 칸을 펼친다.
 *
 * [2026-10-05 리뷰 반영] 바닥값은 공용 12rem 이 아니라 22rem 이다. A2 의 두 칸은 머리(제목·도구)와 칸 여백을 먼저 쓰므로
 * 12rem 이면 마스터가 머리만 남고 목록이 한 줄도 보이지 않았다(Chromium 실측: 1366×768 사이드바 펼침에서 메뉴 보드 0줄).
 * 이보다 낮은 창에서는 셸이 늘어나 페이지가 스크롤한다. fill 화면은 푸터를 숨기고 푸터 몫이 0 이므로(globals.css) 늘어난 몫이
 * 아래 패딩 자리를 넘으면 곧 페이지 스크롤이 된다 — 대신 같은 창에서 셸이 5rem 더 높아 이 바닥값에 닿는 창 높이가 그만큼 낮다.
 */
const WORK_FILL_LAYOUT_CLASS = 'work-fill:h-auto work-fill:min-h-[22rem] print:h-auto';

/**
 * [2026-10-05 리뷰 반영] fill 셸의 머리와 칸 여백 — 조건 안에서만 줄인다(조건 밖은 기본과 같다).
 * - 쌓는 간격 16px → 12px, 페이지 설명은 제목과 같은 줄(들어가지 않으면 다음 줄로 내린다).
 * - 칸 머리: 위아래 8px·좌우 12px(기본 `--filter-pad` 32px 가 칸마다 위아래 64px 를 썼다). 칸 제목 옆에 칸 설명을 둔다.
 * - 칸 도구 줄은 줄바꿈하지 않는다 — 제목 옆에 들어가면 제목 옆, 아니면 제목 아래 한 줄이다. 들어가는지는 도구의 최소 폭으로
 *   정해지므로(도구가 고정 폭을 쓰는 것은 소비 화면 몫이다) 상태에 따라 오르내리지 않는다.
 * - 칸 내용: 12px.
 * - 넓은 마스터('wide')의 상세 칸은 18~22rem 이다 — 칸 여백이 줄어 상세 내용 폭은 기본(26rem − 64px)과 거의 같고, 남는 폭은
 *   작업 대상인 마스터가 받는다.
 * 모두 `work-fill:` 변형이다(조건 밖·인쇄의 기본 배치를 바꾸지 않는다 — work-fill-shell-contract 와 같은 규칙).
 */
const WORK_FILL_STACK_CLASS = 'work-fill:space-y-3';
const WORK_FILL_TITLE_ROW_CLASS = 'work-fill:flex work-fill:flex-wrap work-fill:items-baseline work-fill:gap-x-3';
const WORK_FILL_INLINE_DESCRIPTION_CLASS = 'work-fill:mt-0';
const WORK_FILL_PANE_HEAD_CLASS = 'work-fill:px-3 work-fill:py-2';
const WORK_FILL_PANE_HEAD_ROW_CLASS = 'work-fill:items-center work-fill:gap-x-3 work-fill:gap-y-1.5';
const WORK_FILL_PANE_TOOLS_CLASS = 'work-fill:grow work-fill:flex-nowrap work-fill:justify-end';
const WORK_FILL_PANE_BODY_CLASS = 'work-fill:p-3';
const WORK_FILL_WIDE_TRACK_CLASS = 'work-fill:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]';

/**
 * [2026-09-26 DIP C8] 좁은 화면에서는 상세가 목록 아래에 쌓인다. 항목을 누르면 상세로 스크롤하고 포커스를 옮긴다 —
 * 종전에는 선택만 바뀌어 사용자가 상세가 바뀌었는지 모른 채 목록에 머물렀다. 방향키로 넘길 때는 옮기지 않는다
 * (목록을 훑는 중이다). 항목 안의 다른 조작(삭제·끌기 손잡이 등)은 선택이 아니다.
 *
 * 쌓였는지는 너비 질의가 아니라 **실제 배치**로 판정한다 — 상세의 위쪽이 누른 항목의 아래쪽보다 아래에 있으면
 * 쌓인 것이다. 렌더 결과를 너비로 가르지 않는다는 반응형 규칙(ADR-0006)과 같은 방향이다. 배치 정보가 없으면
 * (크기 0) 아무것도 하지 않는다.
 */
function revealDetailAfterSelect(event: React.MouseEvent<HTMLElement>, detail: () => HTMLElement | null | undefined) {
  const target = event.target as HTMLElement;
  const item = target.closest<HTMLElement>(MASTER_ITEM_SELECTOR);
  if (!item) return;
  const control = target.closest<HTMLElement>('button, a[href], input, select, textarea, [role="button"]');
  if (control && control !== item) return;
  const element = detail();
  if (!element) return;
  const itemRect = item.getBoundingClientRect();
  if (itemRect.height <= 0 || element.getBoundingClientRect().top < itemRect.bottom - 1) return;
  requestAnimationFrame(() => {
    element.scrollIntoView?.({ block: 'start' });
    element.focus({ preventScroll: true });
  });
}

export interface MasterDetailLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /** false이면 기존 화면의 className만 보존한다. 공유 클라이언트의 route별 점진 이행용이다. */
  active?: boolean;
  onSaveShortcut?: () => void | Promise<void>;
  saveShortcutDisabled?: boolean;
}

/**
 * 이미 페이지 헤더와 좌·우 콘텐츠를 가진 공유 화면을 위한 A2 점진 이행 레이아웃.
 * 활성 route에서만 고정폭/키보드 계약을 적용해 같은 파일의 다른 archetype을 거짓 채택하지 않는다.
 */
export function MasterDetailLayout({
  active = true,
  onSaveShortcut,
  saveShortcutDisabled = false,
  children,
  className,
  onKeyDown,
  onClick,
  ...props
}: MasterDetailLayoutProps) {
  const layoutRef = useRef<HTMLDivElement>(null);
  const arrowSelectingRef = useRef(false);

  if (!active) {
    const inactiveProps = { ...props, ...(onKeyDown ? { onKeyDown } : {}), ...(onClick ? { onClick } : {}) };
    return (
      <div className={className} {...inactiveProps}>
        {children}
      </div>
    );
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (
      onSaveShortcut
      && !saveShortcutDisabled
      && !event.altKey
      && !event.shiftKey
      && (event.ctrlKey || event.metaKey)
      && event.key.toLowerCase() === 's'
      && layoutRef.current?.querySelector(`${MASTER_ITEM_SELECTOR}[aria-current="true"]`)
    ) {
      event.preventDefault();
      void onSaveShortcut();
      return;
    }

    const target = event.target as HTMLElement;
    if (
      event.key === 'Tab'
      && !event.shiftKey
      && !event.altKey
      && !event.ctrlKey
      && !event.metaKey
      && target.closest(`${MASTER_ITEM_SELECTOR}[aria-current="true"]`)
    ) {
      const detail = layoutRef.current?.querySelector<HTMLElement>('[data-a2-detail]');
      if (!detail) return;
      const detailTarget = detail?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      event.preventDefault();
      (detailTarget ?? detail)?.focus();
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

    const focusedItem = target.closest<HTMLElement>(MASTER_ITEM_SELECTOR);
    if (!focusedItem) return;

    const items = Array.from(
      layoutRef.current?.querySelectorAll<HTMLElement>(MASTER_ITEM_SELECTOR) ?? [],
    );
    if (items.length === 0) return;

    const focusedIndex = items.indexOf(focusedItem);
    const selectedIndex = items.findIndex((item) => item.getAttribute('aria-current') === 'true');
    const currentIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = currentIndex < 0
      ? (delta > 0 ? 0 : items.length - 1)
      : Math.min(items.length - 1, Math.max(0, currentIndex + delta));

    event.preventDefault();
    items[nextIndex].focus();
    arrowSelectingRef.current = true;
    try {
      items[nextIndex].click();
    } finally {
      arrowSelectingRef.current = false;
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || arrowSelectingRef.current) return;
    revealDetailAfterSelect(event, () => layoutRef.current?.querySelector<HTMLElement>('[data-a2-detail]'));
  };

  return (
    <div
      ref={layoutRef}
      role="group"
      aria-label="마스터 상세 작업 영역"
      data-testid="master-detail-incremental-layout"
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={cn(
        'grid min-h-[32rem] min-w-0 gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function MasterDetailPage({
  title,
  headingLevel = 1,
  description,
  actions,
  navigation,
  notice,
  masterTitle,
  masterDescription,
  masterTools,
  master,
  selectedItemLabel,
  detailTitle = '상세 정보',
  detailDescription,
  detailActions,
  detail,
  emptyDetailTitle = '항목을 선택하세요',
  emptyDetailDescription = '왼쪽 목록에서 확인하거나 편집할 항목을 선택하세요.',
  onSaveShortcut,
  saveShortcutDisabled = false,
  saveShortcutScope = 'detail',
  masterSize = 'default',
  fill = false,
  masterFillChild = false,
  detailFillChild = false,
  showBreadcrumb = true,
  breadcrumbItems,
  className,
}: MasterDetailPageProps) {
  const masterHeadingId = useId();
  const detailHeadingId = useId();
  const PageHeading = headingLevel === 1 ? 'h1' : 'h2';
  const SectionHeading = headingLevel === 1 ? 'h2' : 'h3';
  const masterContentRef = useRef<HTMLDivElement>(null);
  const detailSectionRef = useRef<HTMLElement>(null);
  const detailContentRef = useRef<HTMLDivElement>(null);
  const arrowSelectingRef = useRef(false);

  const handlePageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onSaveShortcut) {
      if (
        event.defaultPrevented
        || saveShortcutDisabled
        || (saveShortcutScope === 'detail' && !detail)
        || event.altKey
        || event.shiftKey
        || (!event.ctrlKey && !event.metaKey)
        || event.key.toLowerCase() !== 's'
      ) return;

      event.preventDefault();
      void onSaveShortcut();
    }
  };

  const handleMasterKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (
      event.key === 'Tab'
      && !event.shiftKey
      && !event.altKey
      && !event.ctrlKey
      && !event.metaKey
      && target.closest(`${MASTER_ITEM_SELECTOR}[aria-current="true"]`)
    ) {
      const detailTarget = detailSectionRef.current?.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      event.preventDefault();
      (detailTarget ?? detailContentRef.current)?.focus();
      return;
    }

    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

    const focusedItem = target.closest<HTMLElement>(MASTER_ITEM_SELECTOR);
    if (!focusedItem) return;

    const items = Array.from(
      masterContentRef.current?.querySelectorAll<HTMLElement>(MASTER_ITEM_SELECTOR) ?? [],
    );
    if (items.length === 0) return;

    const focusedIndex = items.indexOf(focusedItem);
    const selectedIndex = items.findIndex((item) => item.getAttribute('aria-current') === 'true');
    const currentIndex = focusedIndex >= 0 ? focusedIndex : selectedIndex;
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const fallbackIndex = delta > 0 ? 0 : items.length - 1;
    const nextIndex = currentIndex < 0
      ? fallbackIndex
      : Math.min(items.length - 1, Math.max(0, currentIndex + delta));

    event.preventDefault();
    items[nextIndex].focus();
    arrowSelectingRef.current = true;
    try {
      items[nextIndex].click();
    } finally {
      arrowSelectingRef.current = false;
    }
  };

  const handleMasterClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || arrowSelectingRef.current) return;
    revealDetailAfterSelect(event, () => detailContentRef.current);
  };

  return (
    <div
      data-testid="master-detail-page"
      data-work-fill={fill ? '' : undefined}
      onKeyDownCapture={handlePageKeyDown}
      className={cn('space-y-4', fill && WORK_FILL_ROOT_CLASS, fill && WORK_FILL_STACK_CLASS, className)}
    >
      {showBreadcrumb && (
        <div className="[&>nav]:mb-0">
          <Suspense fallback={<div className="h-[46px]" aria-hidden="true" />}>
            <DynamicBreadcrumb
              customItems={breadcrumbItems?.map(({ label, href }) => ({ name: label, href }))}
              currentLabel={title}
            />
          </Suspense>
        </div>
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className={cn('min-w-0', fill && WORK_FILL_TITLE_ROW_CLASS)}>
          <PageHeading className="text-xl font-bold tracking-tight text-foreground">{title}</PageHeading>
          {description && (
            <p className={cn('mt-1 text-[length:var(--font-size-body)] text-muted-foreground', fill && WORK_FILL_INLINE_DESCRIPTION_CLASS)}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      {navigation}

      {notice}

      <div
        data-testid="master-detail-layout"
        className={cn(
          'grid min-h-[32rem] min-w-0 gap-4 lg:h-[min(70vh,48rem)]',
          masterSize === 'wide'
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]'
            : 'lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]',
          fill && WORK_FILL_CONTENT_CLASS,
          fill && WORK_FILL_LAYOUT_CLASS,
          fill && masterSize === 'wide' && WORK_FILL_WIDE_TRACK_CLASS,
        )}
      >
        <section
          aria-labelledby={masterHeadingId}
          className="flex min-h-0 min-w-0 flex-col rounded-md border border-border bg-card"
        >
          <header className={cn('border-b border-border p-[var(--filter-pad)]', fill && WORK_FILL_PANE_HEAD_CLASS)}>
            <div className={cn('flex flex-wrap items-start justify-between gap-2', fill && WORK_FILL_PANE_HEAD_ROW_CLASS)}>
              <div className={cn('min-w-0', fill && WORK_FILL_TITLE_ROW_CLASS)}>
                <SectionHeading id={masterHeadingId} className="text-sm font-semibold text-foreground">{masterTitle}</SectionHeading>
                {masterDescription && (
                  <p className={cn('mt-1 text-[length:var(--font-size-body)] text-muted-foreground', fill && WORK_FILL_INLINE_DESCRIPTION_CLASS)}>
                    {masterDescription}
                  </p>
                )}
              </div>
              {masterTools && (
                <div data-master-tools="" className={cn('flex flex-wrap items-center gap-2', fill && WORK_FILL_PANE_TOOLS_CLASS)}>
                  {masterTools}
                </div>
              )}
            </div>
          </header>
          <div
            ref={masterContentRef}
            role="group"
            aria-label={`${masterTitle} 항목`}
            onKeyDown={handleMasterKeyDown}
            onClick={handleMasterClick}
            data-testid="master-detail-master"
            className={cn(
              'relative max-h-[60vh] min-h-0 flex-1 overflow-auto p-[var(--filter-pad)] lg:max-h-none',
              fill && WORK_FILL_PANE_BODY_CLASS,
              fill && WORK_FILL_PANE_PRINT_CLASS,
              fill && masterFillChild && WORK_FILL_PANE_CHAIN_CLASS,
            )}
          >
            {master}
          </div>
        </section>

        <section
          ref={detailSectionRef}
          aria-labelledby={detailHeadingId}
          className="flex min-h-0 min-w-0 flex-col rounded-md border border-border bg-card"
        >
          <header className={cn('border-b border-border p-[var(--filter-pad)]', fill && WORK_FILL_PANE_HEAD_CLASS)}>
            <div className={cn('flex flex-wrap items-start justify-between gap-2', fill && WORK_FILL_PANE_HEAD_ROW_CLASS)}>
              <div className={cn('min-w-0', fill && WORK_FILL_TITLE_ROW_CLASS)}>
                <SectionHeading id={detailHeadingId} className="text-sm font-semibold text-foreground">
                  {selectedItemLabel ?? detailTitle}
                </SectionHeading>
                {detailDescription && (
                  <p className={cn('mt-1 text-[length:var(--font-size-body)] text-muted-foreground', fill && WORK_FILL_INLINE_DESCRIPTION_CLASS)}>
                    {detailDescription}
                  </p>
                )}
              </div>
              {detail && detailActions && (
                <div className="flex flex-wrap items-center gap-2">{detailActions}</div>
              )}
            </div>
          </header>

          <div
            ref={detailContentRef}
            tabIndex={-1}
            data-a2-detail
            data-testid="master-detail-detail"
            className={cn(
              'relative min-h-0 flex-1 overflow-auto p-[var(--filter-pad)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring',
              fill && WORK_FILL_PANE_BODY_CLASS,
              fill && WORK_FILL_PANE_PRINT_CLASS,
              fill && detailFillChild && WORK_FILL_PANE_CHAIN_CLASS,
            )}
          >
            {detail ?? (
              <div role="status" className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
                <p className="text-sm font-semibold text-foreground">{emptyDetailTitle}</p>
                <p className="mt-2 max-w-md text-[length:var(--font-size-body)] text-muted-foreground">
                  {emptyDetailDescription}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
