'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Search, ArrowUpDown, X } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface BoardListFiltersProps {
  searchWrd: string;
  setSearchWrd: (val: string) => void;
  searchCnd: string;
  setSearchCnd: (val: string) => void;
  orderBy: string;
  setOrderBy: (val: string) => void;
  startDate?: Date;
  setStartDate: (date?: Date) => void;
  endDate?: Date;
  setEndDate: (date?: Date) => void;
  onSearch: (e: React.FormEvent) => void;
  onReset: () => void;
}

export const BoardListFilters = ({
  searchWrd,
  setSearchWrd,
  searchCnd,
  setSearchCnd,
  orderBy,
  setOrderBy,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSearch,
  onReset
}: BoardListFiltersProps) => {
  return (
    <div className="flex flex-row items-center gap-3 mb-4 bg-muted/50 p-6 rounded-lg border border-border shadow-inner">
      <form onSubmit={onSearch} className="flex flex-col gap-3 w-full">
        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
          <Select value={searchCnd} onValueChange={setSearchCnd}>
              <SelectTrigger className="w-full md:w-[220px] !h-12 rounded-lg border border-border bg-card font-bold shadow-sm flex items-center leading-none" aria-label="검색 조건 선택">
                <SelectValue placeholder="검색 조건" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">제목</SelectItem>
                <SelectItem value="1">내용</SelectItem>
                <SelectItem value="2">작성자</SelectItem>
              </SelectContent>
          </Select>
          <div className="relative flex-1 group !h-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 group-focus-within:text-primary transition-colors" />
            <Input
              id="board-search-input"
              data-testid="board-search-input"
              type="text"
              className="pl-12 pr-10 !h-12 text-sm border border-border bg-card shadow-sm rounded-lg focus-visible:ring-primary/20 transition-all font-bold leading-none flex items-center"
              placeholder="어떤 정보를 찾으시나요?"
              value={searchWrd}
              onChange={(e) => setSearchWrd(e.target.value)}
              aria-label="검색어 입력"
            />
            {!searchWrd && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-bold text-muted-foreground pointer-events-none select-none">
                <span className="text-xs opacity-100">⌘</span>K
              </div>
            )}
            {searchWrd && (
              <button
                type="button"
                onClick={() => setSearchWrd("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-muted-foreground transition-colors"
                aria-label="검색어 초기화"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
          <div className="flex items-center gap-2 flex-1 w-full overflow-x-auto">
            <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "!h-12 px-5 justify-start text-left font-bold rounded-lg border border-border bg-card shadow-sm w-full md:w-[220px] flex items-center leading-none",
                      !startDate && "text-muted-foreground"
                    )}
                    aria-label="기간 선택"
                  >
                    <CalendarIcon className="mr-3 h-4 w-4 text-primary opacity-50 shrink-0" />
                    <span className="text-sm truncate">
                      {startDate ? (
                        endDate ? (
                          `${format(startDate, "yyyy.MM.dd")} - ${format(endDate, "yyyy.MM.dd")}`
                        ) : (
                          format(startDate, "yyyy.MM.dd")
                        )
                      ) : (
                        "기간 선택"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-lg overflow-hidden border-none shadow-2xl" align="start">
                  <div className="p-3 bg-card border-b flex items-center justify-between">
                    <span className="font-bold text-foreground text-sm">기간 설정</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                      className="!h-7 px-2 text-xs font-bold text-muted-foreground hover:text-red-500"
                      aria-label="기간 초기화"
                    >
                      <X size={12} className="mr-1" /> 초기화
                    </Button>
                  </div>
                  <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      locale={ko}
                      className="p-3"
                    />
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      locale={ko}
                      className="p-3"
                    />
                  </div>
                </PopoverContent>
            </Popover>

            <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger data-testid="board-sort-select" className="w-full md:w-[140px] !h-12 rounded-lg border border-border bg-card font-bold shadow-sm text-sm flex items-center leading-none" aria-label="정렬 방식 선택">
                  <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-primary opacity-50 shrink-0" />
                  <SelectValue placeholder="정렬 방식" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">최신순</SelectItem>
                  <SelectItem value="views">조회수순</SelectItem>
                  <SelectItem value="comments">댓글순</SelectItem>
                </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <Button type="button" variant="outline" size="lg" onClick={onReset} className="!h-12 px-6 gap-2 border-border font-bold rounded-lg" aria-label="필터 초기화">
               초기화
             </Button>
             <Button type="submit" size="lg" className="flex-1 md:flex-none !h-12 px-10 gap-2 bg-surface-inverse border border-surface-inverse-border shadow-xl hover:scale-105 transition-all active:scale-95 font-bold text-surface-inverse-foreground rounded-lg flex items-center leading-none" aria-label="검색 수행">
               <Search className="w-4 h-4 shrink-0" /> 조회
             </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
