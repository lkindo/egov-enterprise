
import React, { useState } from 'react';
import { Search, RotateCcw, Calendar as CalendarIcon, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export type FilterValue = string | number | DateRange | undefined;
export type FilterValues = Record<string, FilterValue>;

interface StandardSearchFilterProps {
  fields: FilterField[];
  onSearch: (values: FilterValues) => void;
  onReset?: () => void;
  className?: string;
  isPremium?: boolean;
}

function asString(val: FilterValue): string {
  return typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '';
}

function asDateRange(val: FilterValue): DateRange | undefined {
  if (typeof val === 'object' && val !== null && ('from' in val || 'to' in val)) {
    return val as DateRange;
  }
  return undefined;
}

function SmartSearchPanel({ fields, onSearch, onReset, className, isPremium = true }: StandardSearchFilterProps) {
  const [values, setValues] = useState<FilterValues>({});
  const [isExpanded, setIsExpanded] = useState(true);

  const handleValueChange = (name: string, value: FilterValue) => {
    setValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(values);
  };

  const handleReset = () => {
    setValues({});
    onReset?.();
  };

  return (
    <div className={cn(
      "border-2 border-border/60 bg-card shadow-sm mb-8 transition-all group overflow-hidden", 
      isPremium ? "p-[var(--filter-pad)] rounded-lg" : "p-5 rounded-lg",
      className
    )}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-lg text-primary flex items-center justify-center transition-transform group-hover:rotate-6 duration-500 shadow-sm border border-primary/5">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tighter leading-none uppercase">검색 조건 설정</h3>
              <p className="text-xs font-bold text-foreground mt-1.5 uppercase tracking-widest">고급 필터링 시스템</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg font-bold h-10 px-4 gap-2 hover:bg-muted transition-all text-muted-foreground"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span className="text-xs tracking-widest font-bold uppercase">필터 {isExpanded ? '접기' : '펼치기'}</span>
          </Button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2 group/field">
                <label className="text-xs font-bold text-foreground uppercase tracking-[0.2em] ml-1 group-focus-within/field:text-primary transition-colors">
                  {field.label.toUpperCase()}
                </label>

                {field.type === 'select' ? (
                  <Select
                    value={asString(values[field.name]) === '' ? '__ALL__' : asString(values[field.name])}
                    onValueChange={(v) => handleValueChange(field.name, v === '__ALL__' ? '' : v)}
                  >
                    <SelectTrigger className="h-[var(--filter-control-h)] rounded-lg border border-input bg-background focus:ring-4 focus:ring-primary/10 hover:border-primary/50 transition-all font-bold text-sm ring-offset-background shadow-sm">
                      <SelectValue placeholder={field.placeholder || "전체"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg shadow-2xl border-border bg-background p-1">
                      {field.options?.map(opt => (
                        <SelectItem
                          key={opt.value || '__ALL__'}
                          value={opt.value === '' ? '__ALL__' : opt.value}
                          className="text-sm font-bold rounded-lg m-1 cursor-pointer transition-colors"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'daterange' ? (() => {
                  const range = asDateRange(values[field.name]);
                  return (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-[var(--filter-control-h)] justify-start text-left font-bold text-sm rounded-lg border border-input bg-background transition-all hover:border-primary/50 shadow-sm",
                            !range && "text-muted-foreground/50"
                          )}
                        >
                          <CalendarIcon className="mr-3 h-4 w-4 opacity-50 text-primary" />
                          {range?.from ? (
                            range.to ? (
                              <span className="tracking-tight">
                                {format(range.from, "LLL dd", { locale: ko })} -{" "}
                                {format(range.to, "LLL dd", { locale: ko })}
                              </span>
                            ) : (
                              <span className="tracking-tight">{format(range.from, "LLL dd", { locale: ko })}</span>
                            )
                          ) : (
                            <span className="tracking-tight uppercase text-xs font-bold tracking-widest">날짜 범위 선택</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2 rounded-lg border-2 border-border shadow-2xl overflow-hidden bg-background" align="start">
                        <Calendar
                          autoFocus
                          mode="range"
                          defaultMonth={range?.from}
                          selected={range}
                          onSelect={(v) => handleValueChange(field.name, v)}
                          numberOfMonths={2}
                          locale={ko}
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  );
                })() : field.type === 'date' ? (
                  <Input
                    type="date"
                    value={asString(values[field.name])}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    className="h-[var(--filter-control-h)] rounded-lg border border-input bg-background font-bold text-sm ring-offset-background transition-all hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 shadow-sm"
                  />
                ) : (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      placeholder={field.placeholder?.toUpperCase()}
                      value={asString(values[field.name])}
                      onChange={(e) => handleValueChange(field.name, e.target.value)}
                      className="h-[var(--filter-control-h)] pl-11 rounded-lg border border-input bg-background font-bold text-sm ring-offset-background transition-all hover:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/10 shadow-sm placeholder:font-bold placeholder:text-xs placeholder:tracking-widest"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end items-center gap-4 pt-6 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="rounded-lg px-5 font-bold gap-2 text-xs tracking-widest text-muted-foreground/60 hover:bg-muted hover:text-foreground transition-all uppercase h-[var(--filter-control-h)]"
          >
            <RotateCcw size={16} />
            초기화
          </Button>
          <Button
            type="submit"
            size="sm"
            className="rounded-lg px-8 font-bold gap-2 shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 text-xs tracking-widest uppercase h-[var(--filter-control-h)]"
          >
            <Search size={16} />
            조회
          </Button>
        </div>
      </form>
    </div>
  );
}

export const StandardSearchFilter = SmartSearchPanel;
