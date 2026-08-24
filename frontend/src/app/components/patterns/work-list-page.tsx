'use client';

import React, { Suspense, useCallback, useEffect, useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

/**
 * A1 — 조회형 목록(Work List) archetype 셸.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A1 (공통 규칙 G1~G3).
 * 이 컴포넌트가 코드로 고정하는 것은 **화면 문법**이지 데이터 로직이 아니다.
 *
 *   G1 골격  페이지 헤더 → 조회조건 → 결과 툴바 → 콘텐츠 순서를 소비자가 재배열할 수 없다.
 *   G2 조회조건  목록 상단 고정 영역이며 접힘 상태를 세션 너머로 유지한다(filterStateKey).
 *   G3 결과 툴바  총 건수를 표 **위**에 두고, 뷰 설정(내보내기·컬럼 등)을 같은 줄에 모은다.
 *
 * ⚠ 총 건수의 단일 출처 — StandardDataTable 은 `pagination.totalCount` 를 주면 표 **아래**에도
 *   "총 N건"을 찍는다. 이 셸을 쓰는 화면은 총계를 여기 `totalCount` 로 올리고 표에는 넘기지
 *   않는다. 둘 다 주면 같은 수치가 위아래로 두 번 나오고, 서버 총계와 페이지 총계가 어긋나는
 *   순간 어느 쪽이 맞는지 화면만 봐서는 판정할 수 없다.
 *
 * ⚠ 접힘은 네이티브 `<details>` 가 소유한다 — React state 로 들고 있으면 저장된 상태를 복원하는
 *   순간 (a) 서버 HTML 과 첫 클라이언트 렌더가 갈라지거나 (b) effect 안 setState 로 연쇄 렌더가
 *   생긴다. DOM 이 상태를 갖고 있으면 복원은 속성 1개 쓰기로 끝나고, 키보드·스크린리더 계약도
 *   브라우저가 이미 구현해 둔 것을 그대로 쓴다.
 *
 * 이 셸은 장식을 소유하지 않는다 — 진입 애니메이션·장식 도트·히어로는 카탈로그 §3 금지 목록이다.
 * 밀도는 전부 토큰(--filter-pad·--font-size-body)에서 오므로 data-density 축이 그대로 관통한다.
 */
export interface WorkListPageProps {
  /** 화면 제목. 이 셸이 페이지의 h1 을 소유한다. */
  title: string;
  /** 제목 아래 한 줄 보조 설명. 마케팅 문구가 아니라 조회 범위·기준을 적는다. */
  description?: string;
  /** 제목 우측 주요 액션(신규 등). 상태·권한으로 걸러진 것만 넘긴다(G10). */
  actions?: React.ReactNode;
  /** 조회조건 영역. 없으면 조회조건 섹션 자체를 렌더하지 않는다. */
  filter?: React.ReactNode;
  /** 조회조건 섹션 제목. 기본값은 화면 간 문구 드리프트를 막는 고정 라벨이다. */
  filterLabel?: string;
  /** 첫 방문의 조회조건 펼침 여부(G2 기본 펼침). */
  defaultFilterOpen?: boolean;
  /**
   * 접힘 상태를 유지할 저장 키(G2). 미지정이면 유지하지 않고 매번 기본값으로 연다 —
   * 키는 화면마다 달라야 하므로 자동 생성하지 않고 소비자가 명시하게 한다.
   */
  filterStateKey?: string;
  /** 서버가 내려준 총 건수. 페이지 길이가 아니라 조회 조건 전체의 결과 수다. */
  totalCount?: number;
  /** 결과 툴바 우측 슬롯 — 내보내기·컬럼 제어 등 뷰 설정. */
  toolbarActions?: React.ReactNode;
  /** 결과 표. StandardDataTable 또는 그 조합. */
  children: React.ReactNode;
  /**
   * 현재 위치(브레드크럼) 노출 여부. 기본은 노출이다 —
   * 메뉴 SSOT 기반 경로 표시는 findability 계약이라 밀도 이유로 끄지 않는다(IA §7.3).
   * 메뉴 밖 참조 화면처럼 해석할 경로가 없는 곳에서만 끈다.
   */
  showBreadcrumb?: boolean;
  /**
   * 메뉴 자동 해석 대신 쓸 명시 브레드크럼(PageHeader 의 `breadcrumbs` 와 같은 계약).
   * 메뉴 SSOT 로 해석되지 않는 경로에서만 쓴다 — 지정하면 자동 해석 결과를 덮어쓴다.
   */
  breadcrumbItems?: { label: string; href?: string }[];
  className?: string;
}

const FILTER_STATE_PREFIX = 'work-list-filter-open:';

/** 저장된 접힘 상태를 읽는다. 저장소 접근이 막힌 환경(프라이빗 모드 등)은 기본값으로 떨어진다. */
function readStoredOpen(key: string | undefined): boolean | null {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(`${FILTER_STATE_PREFIX}${key}`);
    return raw === null ? null : raw === 'true';
  } catch {
    return null;
  }
}

export function WorkListPage({
  title,
  description,
  actions,
  filter,
  filterLabel = '조회 조건',
  defaultFilterOpen = true,
  filterStateKey,
  totalCount,
  toolbarActions,
  children,
  showBreadcrumb = true,
  breadcrumbItems,
  className,
}: WorkListPageProps) {
  const filterHeadingId = useId();
  const filterRef = useRef<HTMLDetailsElement>(null);

  // 저장된 상태는 마운트 후 DOM 속성으로만 복원한다(렌더 상태를 만들지 않는다).
  useEffect(() => {
    const stored = readStoredOpen(filterStateKey);
    if (stored !== null && filterRef.current) filterRef.current.open = stored;
  }, [filterStateKey]);

  const persistFilterOpen = useCallback(
    (event: React.SyntheticEvent<HTMLDetailsElement>) => {
      if (!filterStateKey) return;
      try {
        window.localStorage.setItem(
          `${FILTER_STATE_PREFIX}${filterStateKey}`,
          String(event.currentTarget.open),
        );
      } catch {
        // 저장 실패는 화면 동작을 막지 않는다 — 이번 세션에만 적용된다.
      }
    },
    [filterStateKey],
  );

  return (
    <div data-testid="work-list-page" className={cn('space-y-4', className)}>
      {showBreadcrumb && (
        // DynamicBreadcrumb 는 useSearchParams 를 쓰므로 Suspense 경계가 필수다(PageHeader 와 동일 이유).
        // 자체 mb-4 는 이 셸의 space-y-4 와 겹쳐 이중 여백이 되므로 상쇄한다.
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
          <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      {filter && (
        <details
          ref={filterRef}
          open={defaultFilterOpen}
          onToggle={persistFilterOpen}
          aria-labelledby={filterHeadingId}
          data-testid="work-list-filter"
          className="group rounded-md border border-border bg-card"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-[var(--filter-pad)] py-2 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <h2
              id={filterHeadingId}
              className="text-[length:var(--font-size-body)] font-semibold text-foreground"
            >
              {filterLabel}
            </h2>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-border p-[var(--filter-pad)]">{filter}</div>
        </details>
      )}

      {/*
        결과 툴바(G3). role="group" 은 스크린리더가 "결과 도구" 묶음으로 인식하게 하되
        toolbar role 이 요구하는 방향키 로빙 포커스 계약은 지지 않는다.
        총 건수는 조회 때마다 갱신되므로 live region 을 조건부로 마운트하지 않고 항상 둔다.
      */}
      <div
        role="group"
        aria-label="결과 도구"
        data-testid="work-list-toolbar"
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <p aria-live="polite" className="text-[length:var(--font-size-body)] text-muted-foreground">
          {typeof totalCount === 'number' && (
            <>
              총 <span className="font-bold text-foreground">{totalCount.toLocaleString()}</span>건
            </>
          )}
        </p>
        {toolbarActions && <div className="flex flex-wrap items-center gap-2">{toolbarActions}</div>}
      </div>

      {children}
    </div>
  );
}
