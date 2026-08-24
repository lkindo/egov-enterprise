'use client';

import React, { Suspense, useId, useRef } from 'react';
import { cn } from '@/lib/utils';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

/**
 * A2 — 마스터-디테일(Master-Detail) archetype 셸.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A2.
 * 이 컴포넌트는 데이터 조회·선택 상태를 소유하지 않고 화면 문법만 고정한다.
 *
 * - 좌측 마스터는 데스크톱에서 고정 폭, 좁은 화면에서는 상세 위에 한 번만 렌더된다.
 * - 선택 항목은 소비자가 `data-a2-master-item`과 `aria-current="true"`를 선언한다.
 * - 마스터 항목에 포커스가 있을 때 ↑/↓로 이전·다음 항목을 선택한다.
 * - 저장 가능한 화면은 onSaveShortcut을 넘겨 Ctrl/Cmd+S를 같은 동작에 연결한다.
 *
 * 선택 식별자의 URL 복원은 화면별 typed allowlist가 소유한다. 셸이 임의 query 이름이나
 * 민감 식별자를 정하면 프론트엔드 헌법 제4조의 화면별 상태 경계를 침범하기 때문이다.
 */
export interface MasterDetailPageProps {
  /** 화면 제목. 이 셸이 페이지의 h1을 소유한다. */
  title: string;
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
  showBreadcrumb?: boolean;
  breadcrumbItems?: { label: string; href?: string }[];
  className?: string;
}

const MASTER_ITEM_SELECTOR = '[data-a2-master-item]:not([disabled])';

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
  ...props
}: MasterDetailLayoutProps) {
  const layoutRef = useRef<HTMLDivElement>(null);

  if (!active) {
    const inactiveProps = onKeyDown ? { ...props, onKeyDown } : props;
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
    items[nextIndex].click();
  };

  return (
    <div
      ref={layoutRef}
      role="group"
      aria-label="마스터 상세 작업 영역"
      data-testid="master-detail-incremental-layout"
      onKeyDown={handleKeyDown}
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
  showBreadcrumb = true,
  breadcrumbItems,
  className,
}: MasterDetailPageProps) {
  const masterHeadingId = useId();
  const detailHeadingId = useId();
  const masterContentRef = useRef<HTMLDivElement>(null);
  const detailSectionRef = useRef<HTMLElement>(null);
  const detailContentRef = useRef<HTMLDivElement>(null);

  const handlePageKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onSaveShortcut) {
      if (
        event.defaultPrevented
        || saveShortcutDisabled
        || !detail
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
    items[nextIndex].click();
  };

  return (
    <div
      data-testid="master-detail-page"
      onKeyDownCapture={handlePageKeyDown}
      className={cn('space-y-4', className)}
    >
      {showBreadcrumb && (
        <div className="[&>nav]:mb-0">
          <Suspense fallback={<div className="h-[46px]" aria-hidden="true" />}>
            <DynamicBreadcrumb
              customItems={breadcrumbItems?.map(({ label, href }) => ({ name: label, href }))}
            />
          </Suspense>
        </div>
      )}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      {navigation}

      {notice}

      <div
        data-testid="master-detail-layout"
        className="grid min-h-[32rem] min-w-0 gap-4 lg:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]"
      >
        <section
          aria-labelledby={masterHeadingId}
          className="flex min-h-0 min-w-0 flex-col rounded-md border border-border bg-card"
        >
          <header className="border-b border-border p-[var(--filter-pad)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id={masterHeadingId} className="text-sm font-semibold text-foreground">{masterTitle}</h2>
                {masterDescription && (
                  <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
                    {masterDescription}
                  </p>
                )}
              </div>
              {masterTools && <div className="flex flex-wrap items-center gap-2">{masterTools}</div>}
            </div>
          </header>
          <div
            ref={masterContentRef}
            role="group"
            aria-label={`${masterTitle} 항목`}
            onKeyDown={handleMasterKeyDown}
            data-testid="master-detail-master"
            className="min-h-0 flex-1 overflow-auto p-[var(--filter-pad)]"
          >
            {master}
          </div>
        </section>

        <section
          ref={detailSectionRef}
          aria-labelledby={detailHeadingId}
          className="flex min-h-0 min-w-0 flex-col rounded-md border border-border bg-card"
        >
          <header className="border-b border-border p-[var(--filter-pad)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id={detailHeadingId} className="text-sm font-semibold text-foreground">
                  {selectedItemLabel ?? detailTitle}
                </h2>
                {detailDescription && (
                  <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">
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
            className="min-h-0 flex-1 p-[var(--filter-pad)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
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
