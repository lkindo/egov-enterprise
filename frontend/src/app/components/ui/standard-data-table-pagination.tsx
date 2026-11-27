import { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** StandardDataTable 의 `pagination` prop — 표 아래 페이저가 그리는 서버 페이지 상태다. */
export interface StandardDataTablePaginationOptions {
  /** 1-base 현재 페이지 번호 */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** 서버가 내려준 총 건수. 주면 '총 N건 · n/m 페이지' 요약이 노출된다. */
  totalCount?: number;
  /** 페이지당 건수(요약/페이저 계산 보조). 미지정 시 10 */
  pageSize?: number;
  /**
   * 지정한 경우에만 요약 옆에 페이지당 건수 셀렉트가 노출된다(opt-in).
   * 미지정 시 기존 소비자 DOM 은 한 글자도 달라지지 않는다.
   */
  onPageSizeChange?: (size: number) => void;
  /** onPageSizeChange 지정 시 선택지. 기본 [10, 20, 50, 100] */
  pageSizeOptions?: number[];
}

interface StandardDataTablePaginationProps {
  pagination: StandardDataTablePaginationOptions;
  /** 업무 그리드 밀도(표의 rowDensity 'work')면 페이저 여백을 줄인다. */
  compact: boolean;
  /** 정렬이 현재 페이지 안에서만 걸리는 표인지 — 그렇다면 요약이 그 범위를 말한다. */
  sortScopeIsPageOnly: boolean;
}

/**
 * 표 아래 페이저 — 총 건수·구간·현재/전체 페이지 요약, 페이지당 건수 선택(opt-in), 페이지 번호 창.
 * 번호 창은 PagePagination 과 같은 규칙이다(최대 5개 + 앞뒤 생략부호). 쪽이 하나뿐이고 총 건수·크기 선택도 없으면 그리지 않는다.
 */
export function StandardDataTablePagination({ pagination, compact, sortScopeIsPageOnly }: StandardDataTablePaginationProps) {
  const { currentPage } = pagination;
  const totalPages = Math.max(pagination.totalPages ?? 0, 0);

  const pageNumbers = useMemo(() => {
    if (!currentPage || totalPages < 1) return [] as number[];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    const pages: number[] = [];
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);
  // 번호 창의 처음·끝. 창이 비면(현재 쪽 없음) 1·totalPages 로 보아 앞뒤 생략부호를 그리지 않는다.
  const firstWindowPage = pageNumbers[0] ?? 1;
  const lastWindowPage = pageNumbers.at(-1) ?? totalPages;

  // 현재 페이지가 보여주는 레코드 구간 (totalCount + pageSize 를 모두 준 경우에만)
  const { totalCount, pageSize } = pagination;
  const rowRange = (currentPage && pageSize && pageSize > 0 && totalCount !== undefined && totalCount > 0)
    ? { from: (currentPage - 1) * pageSize + 1, to: Math.min(currentPage * pageSize, totalCount) }
    : null;

  if (!(pagination.totalPages > 1 || pagination.totalCount !== undefined || pagination.onPageSizeChange !== undefined)) return null;

  return (
    <div className={compact
      ? "flex flex-col sm:flex-row items-center justify-between gap-2 pt-1"
      : "flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4"}>
      {(() => {
        const summary = (
          <>
            {sortScopeIsPageOnly && (
              <>
                <span className="font-normal normal-case tracking-normal">정렬은 현재 페이지 안에서만 적용됩니다</span>
                <span className="mx-2 opacity-40">·</span>
              </>
            )}
            {pagination.totalCount !== undefined && (
              <>
                총 <span className="text-foreground font-black">{pagination.totalCount.toLocaleString()}</span>건
                <span className="mx-2 opacity-40">·</span>
              </>
            )}
            {rowRange && (
              <>
                {rowRange.from.toLocaleString()}–{rowRange.to.toLocaleString()}번째
                <span className="mx-2 opacity-40">·</span>
              </>
            )}
            <span className="text-foreground font-black">{pagination.currentPage}</span>
            {' / '}
            {Math.max(pagination.totalPages, 1)} 페이지
          </>
        );
        const { onPageSizeChange } = pagination;
        if (!onPageSizeChange) {
          // opt-in 미사용 시 기존 소비자 DOM 을 그대로 유지한다(래퍼도 추가하지 않는다).
          return (
            <p className="text-xs font-bold text-muted-foreground tracking-wider order-2 sm:order-1" aria-live="polite">
              {summary}
            </p>
          );
        }
        return (
          <div className="flex flex-wrap items-center justify-center gap-3 order-2 sm:order-1">
            <p className="text-xs font-bold text-muted-foreground tracking-wider" aria-live="polite">
              {summary}
            </p>
            <Select
              value={String(pagination.pageSize ?? 10)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger size="sm" aria-label="페이지당 항목 수" className="rounded-lg text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(pagination.pageSizeOptions ?? [10, 20, 50, 100]).map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}개씩</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })()}

      {pagination.totalPages > 1 && (
        <nav
          role="navigation"
          aria-label="페이지 탐색"
          className="order-1 sm:order-2"
        >
          {/* 페이지 컨트롤은 순서 목록(ol/li)이어야 스크린리더가 "몇 개 중 몇 번째"를
              셈할 수 있다 — breadcrumb(DynamicBreadcrumb)과 동일한 KRDS/WCAG 규격이다. */}
          <ol className="flex items-center gap-1.5">
            <li>
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg border-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                // disabled 는 누른 단추에서 포커스를 빼앗아 첫·끝 페이지에서 포커스가 사라진다 — aria-disabled 로 막는다.
                aria-disabled={pagination.currentPage <= 1 || undefined}
                onClick={() => { if (pagination.currentPage > 1) pagination.onPageChange(pagination.currentPage - 1); }}
                aria-label="이전 페이지"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </Button>
            </li>

            {firstWindowPage > 1 && (
              <>
                <li>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg font-bold"
                    onClick={() => pagination.onPageChange(1)}
                    aria-label="1 페이지"
                  >
                    1
                  </Button>
                </li>
                {firstWindowPage > 2 && (
                  <li className="px-1 text-muted-foreground" aria-hidden="true">…</li>
                )}
              </>
            )}

            {pageNumbers.map((pageNo) => (
              <li key={`page-${pageNo}`}>
                <Button
                  variant={pageNo === pagination.currentPage ? "outline" : "ghost"}
                  size="icon"
                  className={cn(
                    "rounded-lg font-bold",
                    pageNo === pagination.currentPage && "border-2 border-primary text-primary"
                  )}
                  onClick={() => pagination.onPageChange(pageNo)}
                  aria-label={`${pageNo} 페이지`}
                  aria-current={pageNo === pagination.currentPage ? "page" : undefined}
                >
                  {pageNo}
                </Button>
              </li>
            ))}

            {lastWindowPage < totalPages && (
              <>
                {lastWindowPage < totalPages - 1 && (
                  <li className="px-1 text-muted-foreground" aria-hidden="true">…</li>
                )}
                <li>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg font-bold"
                    onClick={() => pagination.onPageChange(totalPages)}
                    aria-label={`${totalPages} 페이지`}
                  >
                    {totalPages}
                  </Button>
                </li>
              </>
            )}

            <li>
              <Button
                variant="outline"
                size="icon"
                className="rounded-lg border-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                aria-disabled={pagination.currentPage >= pagination.totalPages || undefined}
                onClick={() => { if (pagination.currentPage < pagination.totalPages) pagination.onPageChange(pagination.currentPage + 1); }}
                aria-label="다음 페이지"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </Button>
            </li>
          </ol>
        </nav>
      )}
    </div>
  );
}
