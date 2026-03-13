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
    <div className={cn("p-6 border border-border rounded-2xl bg-card shadow-sm mb-6 transition-all group", className)}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary transition-transform group-hover:scale-110 duration-500">
              <Search size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-widest leading-none">상세 검색 필터</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-widest mt-1">다차원 데이터 검색</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-xl font-bold h-10 px-4 gap-2 hover:bg-primary/5"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span className="text-[10px] uppercase tracking-widest">{isExpanded ? '필터 접기' : '필터 펼치기'}</span>
          </Button>
        </div>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {fields.map((field) => (
              <div key={field.name} className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 opacity-70">
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
                    <SelectContent className="rounded-2xl shadow-2xl border-primary/10">
                      {field.options?.map(opt => (
                        <SelectItem
                          key={opt.value || '__ALL__'}
                          value={opt.value === '' ? '__ALL__' : opt.value}
                          className="text-xs font-bold rounded-xl m-1"
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
                        <CalendarIcon className="mr-3 h-4 w-4 opacity-50" />
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
                    <PopoverContent className="w-auto p-0 rounded-3xl border-2 border-primary/10 shadow-3xl overflow-hidden" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={values[field.name]?.from}
                        selected={values[field.name]}
                        onSelect={(v) => handleValueChange(field.name, v)}
                        numberOfMonths={2}
                        locale={ko}
                        className="p-4"
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

        <div className="flex justify-end items-center gap-4 pt-6 mt-4 border-t-2 border-primary/5">
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            className="rounded-lg h-10 px-6 font-semibold gap-2 text-xs text-muted-foreground hover:bg-muted transition-all"
          >
            <RotateCcw size={16} />
            필터 초기화
          </Button>
          <Button
            type="submit"
            className="rounded-lg h-10 px-8 font-semibold gap-2 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary text-primary-foreground text-xs"
          >
            <Search size={16} />
            검색 실행
          </Button>
        </div>
      </form>
    </div>
  );
}

export const StandardSearchFilter = SmartSearchPanel;
