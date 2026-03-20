'use client';

import React, { useState } from 'react';
import { Search, RotateCcw, Calendar as CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export interface FilterField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface StandardSearchFilterProps {
  fields: FilterField[];
  onSearch: (values: Record<string, any>) => void;
  onReset?: () => void;
  className?: string;
}

export function SmartSearchPanel({ fields, onSearch, onReset, className }: StandardSearchFilterProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [isExpanded, setIsExpanded] = useState(true);

  const handleValueChange = (name: string, value: any) => {
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
    <div className={cn("p-5 border border-border rounded-xl bg-card shadow-sm mb-6 transition-all group", className)}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary transition-transform group-hover:scale-105 duration-300">
              <Search size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight leading-none">상세 검색</h3>
              <p className="text-[10px] font-semibold text-muted-foreground mt-1">원하는 조건으로 데이터를 검색합니다.</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-lg font-bold h-9 px-3 gap-2 hover:bg-muted"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span className="text-[10px] tracking-tight">{isExpanded ? '필터 접기' : '필터 펼치기'}</span>
          </Button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1.5 focus-within:ring-2 focus-within:ring-primary/5 rounded-lg transition-all p-0.5">
                <label className="text-[10px] font-bold text-muted-foreground/80 tracking-tight ml-1">
                  {field.label}
                </label>

                {field.type === 'select' ? (
                  <Select
                    value={values[field.name] === '' ? '__ALL__' : (values[field.name] || '')}
                    onValueChange={(v) => handleValueChange(field.name, v === '__ALL__' ? '' : v)}
                  >
                    <SelectTrigger className="h-10 rounded-lg border border-input bg-background focus:ring-primary/20 hover:border-border transition-all font-medium text-sm ring-offset-background">
                      <SelectValue placeholder={field.placeholder || "전체"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl border-border">
                      {field.options?.map(opt => (
                        <SelectItem
                          key={opt.value || '__ALL__'}
                          value={opt.value === '' ? '__ALL__' : opt.value}
                          className="text-sm font-medium rounded-lg m-1"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'daterange' ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-10 justify-start text-left font-medium text-sm rounded-lg border border-input bg-background transition-all hover:border-border",
                          !values[field.name] && "text-muted-foreground/50"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {values[field.name]?.from ? (
                          values[field.name].to ? (
                            <>
                              {format(values[field.name].from, "LLL dd", { locale: ko })} -{" "}
                              {format(values[field.name].to, "LLL dd", { locale: ko })}
                            </>
                          ) : (
                            format(values[field.name].from, "LLL dd", { locale: ko })
                          )
                        ) : (
                          <span>날짜 범위 선택</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border border-border shadow-2xl overflow-hidden" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={values[field.name]?.from}
                        selected={values[field.name]}
                        onSelect={(v) => handleValueChange(field.name, v)}
                        numberOfMonths={2}
                        locale={ko}
                        className="p-3"
                      />
                    </PopoverContent>
                  </Popover>
                ) : field.type === 'date' ? (
                  <Input
                    type="date"
                    value={values[field.name] || ''}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background font-medium text-sm ring-offset-background transition-all hover:border-border focus-visible:ring-primary/20"
                  />
                ) : (
                  <Input
                    placeholder={field.placeholder}
                    value={values[field.name] || ''}
                    onChange={(e) => handleValueChange(field.name, e.target.value)}
                    className="h-10 rounded-lg border border-input bg-background font-medium text-sm ring-offset-background transition-all hover:border-border focus-visible:ring-primary/20 shadow-sm"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end items-center gap-3 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="rounded-lg h-9 px-4 font-bold gap-2 text-xs text-muted-foreground hover:bg-muted"
          >
            <RotateCcw size={14} />
            초기화
          </Button>
          <Button
            type="submit"
            size="sm"
            className="rounded-lg h-9 px-6 font-bold gap-2 shadow-sm transition-all"
          >
            <Search size={14} />
            검색
          </Button>
        </div>
      </form>
    </div>
  );
}

export const StandardSearchFilter = SmartSearchPanel;
