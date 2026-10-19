import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from '@/lib/utils';

interface PagePaginationProps {
  /** 전체 건수 */
  total?: number;
  /** 현재 페이지 번호(1부터, ADR-0036) */
  page?: number;
  /** 페이지당 건수 */
  size?: number;
  onPageChange: (page: number) => void;
}

// [ADR-0036] eGov PaginationInfo(currentPageNo·recordCountPerPage·totalPageCount…)를 받던 `pagination` prop 은 걷었다 —
//   모든 호출부가 total·page·size 를 넘기고, 서버 응답(PageResponse)에도 그 모양이 없다.
export function PagePagination({ total, page, size, onPageChange }: PagePaginationProps) {
  const totalRecordCount = total ?? 0;
  const perPage = size ?? 10;
  const currentPageNo = page ?? 1;
  const totalPageCount = total !== undefined && size !== undefined
    ? Math.ceil(total / size)
    : 0;

  if (totalPageCount <= 1 && totalRecordCount <= perPage) return null;

  const isFirstPage = currentPageNo <= 1;
  const isLastPage = currentPageNo >= totalPageCount;

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPageNo - 2);
    const endPage = Math.min(totalPageCount, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      pages.push(
        <PaginationItem key="1">
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); onPageChange(1); }} isActive={currentPageNo === 1}>1</PaginationLink>
        </PaginationItem>
      );
      if (startPage > 2) pages.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis /></PaginationItem>);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={currentPageNo === i}
            onClick={(e) => { e.preventDefault(); onPageChange(i); }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    if (endPage < totalPageCount) {
      if (endPage < totalPageCount - 1) pages.push(<PaginationItem key="ellipsis-end"><PaginationEllipsis /></PaginationItem>);
      pages.push(
        <PaginationItem key={totalPageCount}>
          <PaginationLink href="#" onClick={(e) => { e.preventDefault(); onPageChange(totalPageCount); }} isActive={currentPageNo === totalPageCount}>{totalPageCount}</PaginationLink>
        </PaginationItem>
      );
    }

    return pages;
  };

  return (
    <div className="flex justify-center mt-4">
      <Pagination>
        <PaginationContent>
          <PaginationItem key="pagination-prev">
            <PaginationPrevious
              href="#"
              aria-disabled={isFirstPage || undefined}
              tabIndex={isFirstPage ? -1 : undefined}
              className={cn(isFirstPage && 'pointer-events-none opacity-50')}
              onClick={(e) => {
                e.preventDefault();
                if (!isFirstPage) onPageChange(currentPageNo - 1);
              }}
            />
          </PaginationItem>

          {renderPageNumbers()}

          <PaginationItem key="pagination-next">
            <PaginationNext
              href="#"
              aria-disabled={isLastPage || undefined}
              tabIndex={isLastPage ? -1 : undefined}
              className={cn(isLastPage && 'pointer-events-none opacity-50')}
              onClick={(e) => {
                e.preventDefault();
                if (!isLastPage) onPageChange(currentPageNo + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
