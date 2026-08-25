'use client';

import React, { Suspense, useId } from 'react';
import { cn } from '@/lib/utils';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

/**
 * A7 — 현황 + 원본 표(Report) archetype 셸.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §5 A7.
 *
 * 이 archetype 의 실패 방식은 정해져 있다 — **차트만 남고 원본이 사라지는 것**이다. 그러면
 * 사용자는 값을 확인할 수도, 내려받을 수도, 이상치를 짚을 수도 없다. 그래서 셸이 구조로 막는다.
 *
 *   · `children`(원본 표)은 **필수 prop** 이다. 차트만 렌더할 방법이 없다.
 *   · `basis`(집계 기준·기간·출처)도 필수다. 숫자만 있고 무엇을 언제 어떻게 센 값인지 없는
 *     화면은 "그럴듯한 수치"에 지나지 않는다(ADR-0003 측정 기반 데이터 소유권).
 *   · 조회 조건 슬롯은 하나뿐이다 — 차트와 표가 서로 다른 조건으로 갈라질 수 없다.
 *
 * 요약 지표는 선택이지만, 넣는다면 값의 출처가 `basis` 로 설명돼야 한다. 계측 원천이 없는
 * 고정 문구를 지표로 만들지 않는다(카탈로그 §5 A7 금지).
 */
export interface ReportPageProps {
  /** 화면 제목. 상위 허브가 h1 을 가진 활성 패널에서만 h2 를 쓴다. */
  title: string;
  headingLevel?: 1 | 2;
  /** 무엇을 집계한 화면인지 한 줄. 마케팅 문구를 넣지 않는다. */
  description?: string;
  actions?: React.ReactNode;
  /** 조회 실패·부분 실패처럼 지표·차트·표 전체에 영향을 주는 상태. */
  notice?: React.ReactNode;
  /** 지표·차트·표가 **함께** 따르는 조회 조건. 슬롯이 하나뿐인 것이 계약이다. */
  filter?: React.ReactNode;
  filterLabel?: string;
  /** 요약 지표 3~5개. 값의 출처는 basis 가 설명한다. */
  summary?: React.ReactNode;
  /**
   * 집계 기준·기간·데이터 출처. 필수다 —
   * "무엇을, 언제까지, 어디서 센 값인가"가 없으면 지표는 검증할 수 없는 주장이 된다.
   */
  basis: React.ReactNode;
  chartTitle?: string;
  /** 차트. 없으면 차트 영역 자체를 렌더하지 않는다(표만 있는 현황도 정상이다). */
  chart?: React.ReactNode;
  tableTitle?: string;
  /** 차트에 쓰인 값의 **원본 표**. 필수 prop 이라 차트만 남는 화면을 만들 수 없다. */
  children: React.ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: { label: string; href?: string }[];
  className?: string;
}

export function ReportPage({
  title,
  headingLevel = 1,
  description,
  actions,
  notice,
  filter,
  filterLabel = '조회 조건',
  summary,
  basis,
  chartTitle,
  chart,
  tableTitle = '원본 데이터',
  children,
  showBreadcrumb = true,
  breadcrumbItems,
  className,
}: ReportPageProps) {
  const filterHeadingId = useId();
  const chartHeadingId = useId();
  const tableHeadingId = useId();
  const PageHeading = headingLevel === 1 ? 'h1' : 'h2';
  const SectionHeading = headingLevel === 1 ? 'h2' : 'h3';

  return (
    <div data-testid="report-page" className={cn('space-y-4', className)}>
      {showBreadcrumb && (
        // DynamicBreadcrumb 는 useSearchParams 를 쓰므로 Suspense 경계가 필수다.
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
          <PageHeading className="truncate text-xl font-bold tracking-tight text-foreground">{title}</PageHeading>
          {description && (
            <p className="mt-1 text-[length:var(--font-size-body)] text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>

      {notice}

      {filter && (
        <section aria-labelledby={filterHeadingId} className="rounded-md border border-border bg-card">
          <SectionHeading
            id={filterHeadingId}
            className="border-b border-border px-[var(--filter-pad)] py-2 text-[length:var(--font-size-body)] font-semibold text-foreground"
          >
            {filterLabel}
          </SectionHeading>
          <div className="p-[var(--filter-pad)]">{filter}</div>
        </section>
      )}

      {summary && <div data-testid="report-summary">{summary}</div>}

      {/*
        집계 근거는 지표 바로 아래에 둔다 — 숫자를 본 직후에 읽혀야 의미가 있다.
        스크린리더에는 지표와 같은 흐름으로 전달되도록 별도 landmark 를 만들지 않는다.
      */}
      <p data-testid="report-basis" className="text-[length:var(--font-size-body)] text-muted-foreground">
        {basis}
      </p>

      {chart && (
        <section aria-labelledby={chartHeadingId} className="rounded-md border border-border bg-card p-4">
          <SectionHeading
            id={chartHeadingId}
            className="mb-3 text-[length:var(--font-size-body)] font-semibold text-foreground"
          >
            {chartTitle ?? '추이'}
          </SectionHeading>
          {chart}
        </section>
      )}

      <section aria-labelledby={tableHeadingId} data-testid="report-source-table">
        <SectionHeading
          id={tableHeadingId}
          className="mb-2 text-[length:var(--font-size-body)] font-semibold text-foreground"
        >
          {tableTitle}
        </SectionHeading>
        {children}
      </section>
    </div>
  );
}
