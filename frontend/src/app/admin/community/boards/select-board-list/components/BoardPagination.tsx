'use client';

import React from 'react';
import { Button } from "@/components/ui/button";

interface BoardPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const BoardPagination = ({ currentPage, totalPages, onPageChange }: BoardPaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-8 py-10">
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-12 px-8 font-bold rounded-lg border-2 hover:bg-muted"
        aria-label="이전 페이지"
      >
        이전
      </Button>
      <div className="flex items-center gap-4 bg-muted dark:bg-slate-900 px-8 py-3 rounded-lg shadow-xl border border-border dark:border-slate-800">
        <span className="text-lg font-bold text-foreground dark:text-white" aria-label={`현재 ${currentPage}페이지`}>{currentPage}</span>
        <div className="h-4 w-px bg-slate-300 dark:bg-white/20" />
        <span className="text-sm font-bold text-muted-foreground dark:text-white/50" aria-label={`총 ${totalPages}페이지`}>{totalPages}</span>
      </div>
      <Button
        variant="outline"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-12 px-8 font-bold rounded-lg border-2 hover:bg-muted"
        aria-label="다음 페이지"
      >
        다음
      </Button>
    </div>
  );
};
