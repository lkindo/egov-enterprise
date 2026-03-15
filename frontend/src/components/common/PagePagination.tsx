import React from "react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    PaginationEllipsis,
} from "@/components/ui/pagination";
import { PaginationInfo } from "@/types/system";

interface PagePaginationProps {
    pagination?: PaginationInfo;
    total?: number;
    page?: number;
    size?: number;
    onPageChange: (page: number) => void;
}

export function PagePagination({ pagination, total, page, size, onPageChange }: PagePaginationProps) {
    const totalRecordCount = total ?? pagination?.totalRecordCount ?? 0;
    const recordCountPerPage = size ?? pagination?.recordCountPerPage ?? 10;
    const currentPageNo = page ?? pagination?.currentPageNo ?? 1;
    const totalPageCount = total !== undefined && size !== undefined 
        ? Math.ceil(total / size) 
        : (pagination?.totalPageCount || 0);

    if (totalPageCount <= 1 && totalRecordCount <= recordCountPerPage) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPageNo - 2);
        let endPage = Math.min(totalPageCount, startPage + maxVisiblePages - 1);

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
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPageNo > 1) onPageChange(currentPageNo - 1);
                            }}
                        />
                    </PaginationItem>

                    {renderPageNumbers()}

                    <PaginationItem key="pagination-next">
                        <PaginationNext
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (currentPageNo < totalPageCount) onPageChange(currentPageNo + 1);
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
}
